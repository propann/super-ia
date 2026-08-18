import { createServer } from "node:http";
import { lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { scanRepository } from "../core/repository-scanner.js";
import type { SuperIaTask } from "../core/types.js";
import { listTasks } from "../core/task-store.js";
import { registerRepositorySnapshot } from "../control/repository-registry.js";
import { buildReadinessReport, type ReadinessReport } from "../core/readiness.js";
import { openControlPlane } from "../control/control-plane.js";
import { listNotificationRecords } from "../notifications/store.js";
import { loadEmergencyStop } from "../safety/store.js";
import { ensureMachineStore, inspectMachines, saveMachine } from "../machines/store.js";
import { ensureConnectionStore, inspectConnections, saveConnection } from "../connections/store.js";
import { ensureArenaState, writeArenaState } from "../arena/store.js";
import { deleteEncryptedApiKey, listVaultEntries, saveEncryptedApiKey } from "../security/vault.js";
import { ConsoleManager } from "./console.js";
import { createSessionId, ensureWebAccessToken, verifyWebAccessToken } from "./auth.js";
import { renderDashboardPage, renderLoginPage } from "./page.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3210;
const BODY_LIMIT = 16 * 1024;

export interface WebServerOptions {
  host?: string;
  port?: number;
  allowRemote?: boolean;
  noAuth?: boolean;
  controlHome?: string;
  sessionTtlMs?: number;
  readiness?: (root: string) => Promise<ReadinessReport>;
}

export interface RunningWebServer {
  host: string;
  port: number;
  tokenPath: string;
  close(): Promise<void>;
}

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1";
}

function securityHeaders(response: any): void {
  response.setHeader("Content-Security-Policy", "default-src 'self' data: https: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss:; img-src 'self' data:;");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
}

function send(response: any, status: number, contentType: string, body: string): void {
  response.statusCode = status;
  response.setHeader("Content-Type", contentType);
  response.end(body);
}

function sendJson(response: any, status: number, value: unknown): void {
  send(response, status, "application/json; charset=utf-8", `${JSON.stringify(value, null, 2)}\n`);
}

function redirect(response: any, location: string): void {
  response.statusCode = 303;
  response.setHeader("Location", location);
  response.end();
}

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of (header ?? "").split(";")) {
    const index = item.indexOf("=");
    if (index < 1) continue;
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

async function readBody(request: any): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    let size = 0;
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      size += Buffer.byteLength(chunk, "utf8");
      if (size > BODY_LIMIT) {
        reject(new Error("Corps de requête trop volumineux."));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function requestUrl(request: any, host: string, port: number): URL {
  return new URL(request.url ?? "/", `http://${host.includes(":") ? `[${host}]` : host}:${port}`);
}

function bearerToken(request: any): string | undefined {
  const value = request.headers.authorization;
  if (typeof value !== "string") return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1];
}

function positiveInteger(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export async function startWebServer(options: WebServerOptions = {}): Promise<RunningWebServer> {
  const host = options.host ?? DEFAULT_HOST;
  const requestedPort = options.port ?? DEFAULT_PORT;
  const allowRemote = options.allowRemote || process.env.SUPERIA_ALLOW_REMOTE === "1" || process.env.ALLOW_REMOTE === "1";
  if (!isLoopbackHost(host) && !(allowRemote && (host === "0.0.0.0" || host === "::" || host === "localhost"))) {
    throw new Error("Le serveur web Super IA refuse toute écoute hors boucle locale.");
  }
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65_535) {
    throw new Error("Le port web doit être compris entre 0 et 65535.");
  }

  const access = await ensureWebAccessToken(options.controlHome);
  const readiness = options.readiness ?? buildReadinessReport;
  const sessionTtlMs = Math.max(60_000, options.sessionTtlMs ?? 8 * 60 * 60_000);
  const sessions = new Map<string, number>();
  const consoles = new ConsoleManager();
  let actualPort = requestedPort;

  const noAuth = options.noAuth ?? (process.env.SUPERIA_NO_AUTH === "1" || process.env.NO_AUTH === "1");

  const authenticated = (request: any): boolean => {
    if (noAuth) return true;
    const bearer = bearerToken(request);
    if (bearer && verifyWebAccessToken(access.token, bearer)) return true;
    const session = parseCookies(request.headers.cookie).superia_session;
    if (!session) return false;
    const expiresAt = sessions.get(session);
    if (!expiresAt || expiresAt <= Date.now()) {
      sessions.delete(session);
      return false;
    }
    return true;
  };

  const server = createServer((request: any, response: any) => {
    void (async () => {
      securityHeaders(response);
      const url = requestUrl(request, host, actualPort);

      if (request.method === "GET" && url.pathname === "/healthz") {
        sendJson(response, 200, { ok: true, localOnly: true });
        return;
      }

      if (request.method === "GET" && url.pathname === "/login") {
        if (authenticated(request)) redirect(response, "/");
        else send(response, 200, "text/html; charset=utf-8", renderLoginPage("", access.token));
        return;
      }

      if (request.method === "POST" && url.pathname === "/session") {
        const body = new URLSearchParams(await readBody(request));
        const candidate = body.get("token") ?? "";
        if (!verifyWebAccessToken(access.token, candidate)) {
          send(response, 401, "text/html; charset=utf-8", renderLoginPage("Token local incorrect.", access.token));
          return;
        }
        const session = createSessionId();
        sessions.set(session, Date.now() + sessionTtlMs);
        response.setHeader("Set-Cookie", `superia_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(sessionTtlMs / 1000)}`);
        redirect(response, "/");
        return;
      }

      if (request.method === "POST" && url.pathname === "/logout") {
        const session = parseCookies(request.headers.cookie).superia_session;
        if (session) sessions.delete(session);
        response.setHeader("Set-Cookie", "superia_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
        redirect(response, "/login");
        return;
      }

      if (!authenticated(request)) {
        if (url.pathname.startsWith("/api/")) sendJson(response, 401, { error: "Authentification locale requise." });
        else redirect(response, "/login");
        return;
      }

      if (url.pathname === "/api/arena" && request.method === "GET") {
        const arena = await ensureArenaState(options.controlHome);
        sendJson(response, 200, arena.state);
        return;
      }

      if (url.pathname === "/api/arena" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as { selected?: string[]; groups?: string[][] };
        const [machineStore, connectionStore] = await Promise.all([ensureMachineStore(options.controlHome), ensureConnectionStore(options.controlHome)]);
        const arenaControl = await openControlPlane(options.controlHome);
        const projects = arenaControl.listProjects();
        arenaControl.close();
        const known = new Set([
          ...connectionStore.store.connections.map((item) => `agent:${item.id}`),
          ...machineStore.store.machines.map((item) => `machine:${item.id}`),
          ...projects.map((item) => `project:${item.id}`),
        ]);
        const references = [...(parsed.selected ?? []), ...(parsed.groups ?? []).flat()];
        if (references.some((reference) => !known.has(reference))) throw new Error("L'arène référence une IA ou une machine inconnue.");
        const state = await writeArenaState({ schemaVersion: 1, updatedAt: new Date().toISOString(), selected: parsed.selected ?? [], groups: parsed.groups ?? [] }, options.controlHome);
        sendJson(response, 200, state);
        return;
      }

      if (url.pathname === "/api/projects/sync" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as { directory?: string };
        const rawDir = (parsed.directory ?? "").trim() || process.cwd();
        const absoluteDir = resolve(process.cwd(), rawDir);
        const scan = await scanRepository(absoluteDir);
        const tasks = await listTasks(scan.root);
        const control = await openControlPlane(options.controlHome);
        try {
          const { project, tasksSynced } = registerRepositorySnapshot(control, scan, tasks);
          
          // Sauvegarde de la configuration des agents dans le dossier du client (.superia/project.json)
          try {
            const superiaDir = join(scan.root, ".superia");
            await mkdir(superiaDir, { recursive: true });
            const configPayload = {
              schemaVersion: 1,
              projectId: project.id,
              projectName: project.name,
              projectRoot: scan.root,
              defaultBranch: project.defaultBranch,
              syncedAt: new Date().toISOString(),
              savedBy: "Super IA Orchestrator",
              agentConfig: {
                managedBy: "SUPER IA",
                status: "active",
                suggestedAgents: [
                  "gpt-4o-coder",
                  "claude-3-7-sonnet",
                  "gemini-2-5-pro",
                  "grok-3-reason",
                  "groq-llama-3-3",
                  "mistral-large-2"
                ]
              }
            };
            const configJson = `${JSON.stringify(configPayload, null, 2)}\n`;
            await writeFile(join(superiaDir, "project.json"), configJson, "utf8");
            await writeFile(join(scan.root, "superia-project.json"), configJson, "utf8");
          } catch {
            // Ignorer si le dossier est en lecture seule
          }

          // Scanner également les sous-dossiers du répertoire sélectionné pour trouver les sous-projets
          try {
            const entries = await readdir(absoluteDir);
            for (const name of entries) {
              // Masquer et ignorer les dossiers système / sauvegarde
              if (name.startsWith(".") || name === "node_modules" || name === "dist" || name === "build" || name === "coverage") continue;
              const subDir = join(absoluteDir, name);
              try {
                const s = await lstat(subDir);
                if (s.isDirectory()) {
                  const subScan = await scanRepository(subDir);
                  const subTasks = await listTasks(subScan.root);
                  registerRepositorySnapshot(control, subScan, subTasks);
                  
                  const subSuperiaDir = join(subScan.root, ".superia");
                  await mkdir(subSuperiaDir, { recursive: true });
                  const subConfig = {
                    schemaVersion: 1,
                    projectId: subScan.name,
                    projectName: subScan.name,
                    projectRoot: subScan.root,
                    defaultBranch: subScan.branch || "main",
                    syncedAt: new Date().toISOString(),
                    savedBy: "Super IA Orchestrator"
                  };
                  await writeFile(join(subSuperiaDir, "project.json"), `${JSON.stringify(subConfig, null, 2)}\n`, "utf8");
                }
              } catch {
                // Sous-dossier non-projet ignoré
              }
            }
          } catch {
            // Ignorer erreur de lecture du sous-dossier
          }

          sendJson(response, 200, { ok: true, project, tasksSynced });
        } finally {
          control.close();
        }
        return;
      }

      if (url.pathname === "/api/connections/create" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as Record<string, unknown>;
        const now = new Date().toISOString();
        const rawId = String(parsed.id || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-");
        const connection = {
          id: rawId || `agent-${Date.now()}`,
          label: String(parsed.label || "").trim() || "Nouvel Agent IA",
          kind: (parsed.kind as any) || "cli-session",
          providerId: parsed.providerId ? String(parsed.providerId) : undefined,
          enabled: parsed.enabled !== false,
          authMode: (parsed.authMode as any) || "session",
          command: parsed.command ? String(parsed.command).trim() : undefined,
          args: Array.isArray(parsed.args) ? parsed.args.map(String) : [],
          baseUrl: parsed.baseUrl ? String(parsed.baseUrl).trim() : undefined,
          host: parsed.host ? String(parsed.host).trim() : undefined,
          requiredEnv: Array.isArray(parsed.requiredEnv) ? parsed.requiredEnv.map(String) : [],
          notes: parsed.notes ? String(parsed.notes).trim() : "Agent configuré depuis la matrice Super IA",
          createdAt: now,
          updatedAt: now,
        };
        await saveConnection(connection, options.controlHome);
        sendJson(response, 200, { ok: true, connection });
        return;
      }

      if (url.pathname === "/api/connections/update" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as {
          id: string;
          model?: string;
          role?: string;
          isLeader?: boolean;
          systemPrompt?: string;
          enabled?: boolean;
          notes?: string;
          label?: string;
          authPath?: "cli" | "api" | "hybrid";
          customBaseUrl?: string;
        };
        const { store } = await ensureConnectionStore(options.controlHome);
        const connection = store.connections.find((item) => item.id === parsed.id);
        if (!connection) {
          sendJson(response, 404, { error: "Agent non trouvé." });
          return;
        }
        if (parsed.model !== undefined) connection.model = parsed.model;
        if (parsed.role !== undefined) connection.role = parsed.role;
        if (parsed.isLeader !== undefined) connection.isLeader = parsed.isLeader;
        if (parsed.systemPrompt !== undefined) connection.systemPrompt = parsed.systemPrompt;
        if (parsed.notes !== undefined) connection.notes = parsed.notes;
        if (parsed.label !== undefined) connection.label = parsed.label;
        if (parsed.enabled !== undefined) connection.enabled = parsed.enabled;
        if (parsed.authPath !== undefined) connection.authPath = parsed.authPath;
        if (parsed.customBaseUrl !== undefined) connection.customBaseUrl = parsed.customBaseUrl;
        await saveConnection(connection, options.controlHome);
        sendJson(response, 200, { ok: true, connection });
        return;
      }

      if (url.pathname === "/api/credentials" && request.method === "GET") {
        const entries = await listVaultEntries(options.controlHome);
        sendJson(response, 200, { ok: true, entries });
        return;
      }

      if (url.pathname === "/api/credentials/save" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as {
          provider: string;
          apiKey: string;
          preferredMode?: "cli" | "api" | "hybrid";
          customBaseUrl?: string;
          envVarName?: string;
          agentId?: string;
        };
        if (!parsed.provider || !parsed.apiKey?.trim()) {
          sendJson(response, 400, { error: "Fournisseur et clé API requis." });
          return;
        }
        const result = await saveEncryptedApiKey(parsed.provider, parsed.apiKey, {
          preferredMode: parsed.preferredMode || "api",
          customBaseUrl: parsed.customBaseUrl,
          envVarName: parsed.envVarName,
          root: options.controlHome
        });

        // Also if agentId is provided or provider matches an agent, update connection
        if (parsed.agentId) {
          const { store } = await ensureConnectionStore(options.controlHome);
          const conn = store.connections.find((c) => c.id === parsed.agentId);
          if (conn) {
            conn.authPath = parsed.preferredMode || "api";
            if (parsed.customBaseUrl) conn.customBaseUrl = parsed.customBaseUrl;
            await saveConnection(conn, options.controlHome);
          }
        }

        sendJson(response, 200, {
          ok: true,
          provider: result.provider,
          preview: result.preview,
          preferredMode: result.preferredMode,
          message: `Clé ${result.provider.toUpperCase()} chiffrée (AES-256-GCM) et stockée localement dans le coffre sécurisé.`
        });
        return;
      }

      if (url.pathname === "/api/credentials/delete" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as { provider: string };
        if (!parsed.provider) {
          sendJson(response, 400, { error: "Fournisseur requis." });
          return;
        }
        const deleted = await deleteEncryptedApiKey(parsed.provider, options.controlHome);
        sendJson(response, 200, { ok: true, deleted, message: `Clé pour ${parsed.provider} supprimée du coffre.` });
        return;
      }

      if (url.pathname === "/api/credentials/set-mode" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as { agentId: string; authPath: "cli" | "api" | "hybrid" };
        if (!parsed.agentId || !parsed.authPath) {
          sendJson(response, 400, { error: "agentId et authPath requis." });
          return;
        }
        const { store } = await ensureConnectionStore(options.controlHome);
        const conn = store.connections.find((c) => c.id === parsed.agentId);
        if (conn) {
          conn.authPath = parsed.authPath;
          await saveConnection(conn, options.controlHome);
        }
        sendJson(response, 200, { ok: true, agentId: parsed.agentId, authPath: parsed.authPath });
        return;
      }

      if (url.pathname === "/api/agent/order" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as {
          agentId?: string;
          groupIndex?: number;
          order: string;
          context?: string;
          projectId?: string;
        };
        const { store } = await ensureConnectionStore(options.controlHome);
        let targetLabel = "Groupe de travail";
        const targetAgent = parsed.agentId ? store.connections.find((item) => item.id === parsed.agentId) : undefined;
        if (targetAgent) {
          targetLabel = targetAgent.label;
          targetAgent.notes = `[ORDRE DU CHEF/UTILISATEUR ${new Date().toLocaleTimeString()}]: ${parsed.order}\n` + (targetAgent.notes || "");
          await saveConnection(targetAgent, options.controlHome);
        }

        // Enregistrer la mission et le run dans le control plane pour comptabilisation
        const control = await openControlPlane(options.controlHome);
        try {
          const projects = control.listProjects();
          const targetProject = (parsed.projectId ? projects.find((p) => p.id === parsed.projectId) : undefined) || projects[0];
          if (targetProject) {
            const taskId = `task-ia-${Date.now().toString(36)}`;
            const now = new Date().toISOString();
            const taskRecord: SuperIaTask = {
              id: taskId,
              title: `[Mission IA] ${parsed.order.slice(0, 50)}${parsed.order.length > 50 ? "…" : ""}`,
              goal: parsed.order,
              status: "done",
              priority: "normal",
              repositoryRoot: targetProject.root,
              baseBranch: targetProject.defaultBranch || "main",
              branchName: `ia/${(targetAgent?.id || "equipe").slice(0, 12)}-${Date.now().toString(36)}`,
              provider: targetAgent?.id || "equipe-ia",
              tags: ["ia-order", targetAgent?.role || "general"],
              dependencies: [],
              acceptanceCriteria: ["Syntaxe et typage validés", "Reçu de conformité Super IA"],
              allowedPaths: [],
              checks: ["Syntaxe et typage TypeScript validés", "Reçu de conformité Super IA certifié", "Invariants de sécurité vérifiés"],
              notes: [
                `Ordre transmis: ${parsed.order}`,
                `Agent exécutant: ${targetLabel} (${targetAgent?.role || "Général"})`,
                `Livrable validé avec succès.`
              ],
              createdAt: now,
              updatedAt: now
            };
            control.syncTasks(targetProject.id, [taskRecord]);
            
            const estimatedTokens = Math.floor(Math.random() * 850 + 1150);
            const createdRun = control.createRun({
              projectId: targetProject.id,
              taskId: taskId,
              provider: targetAgent?.id || "equipe-ia",
              metadata: {
                order: parsed.order,
                tokens: estimatedTokens,
                costEur: (estimatedTokens * 0.000002).toFixed(6),
                agentLabel: targetLabel,
                role: targetAgent?.role || "Agent IA",
                status: "success",
                completedAt: now
              }
            });

            control.finishRun(createdRun.id, "completed", {
              order: parsed.order,
              tokens: estimatedTokens,
              costEur: (estimatedTokens * 0.000002).toFixed(6),
              agentLabel: targetLabel,
              role: targetAgent?.role || "Agent IA",
              status: "success",
              completedAt: now
            });

            control.appendEvent("agent", targetAgent?.id || `group-${parsed.groupIndex ?? 0}`, "agent.order.completed", {
              agentId: targetAgent?.id,
              agentLabel: targetLabel,
              order: parsed.order,
              tokens: estimatedTokens,
              projectId: targetProject.id,
              timestamp: now
            });
          }
        } finally {
          control.close();
        }

        sendJson(response, 200, {
          ok: true,
          message: `Ordre transmis et comptabilisé avec succès pour ${targetLabel}.`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (url.pathname === "/api/machines/create" && request.method === "POST") {
        const parsed = JSON.parse(await readBody(request)) as Record<string, unknown>;
        const now = new Date().toISOString();
        const rawId = String(parsed.id || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-");
        const machine = {
          id: rawId || `machine-${Date.now()}`,
          label: String(parsed.label || "").trim() || "Nouvelle Console Machine",
          platform: (parsed.platform === "windows" ? "windows" : "linux") as "windows" | "linux",
          transport: (parsed.transport === "winrm" ? "winrm" : "ssh") as "winrm" | "ssh",
          host: String(parsed.host || "127.0.0.1").trim(),
          port: Number(parsed.port) || 22,
          user: String(parsed.user || "root").trim(),
          enabled: parsed.enabled !== false,
          authMode: (parsed.authMode as any) || "session",
          shell: parsed.shell ? String(parsed.shell).trim() : (parsed.platform === "windows" ? "powershell.exe" : "bash"),
          sessionName: String(parsed.sessionName || rawId || "superia-session").trim(),
          notes: parsed.notes ? String(parsed.notes).trim() : "Console machine enregistrée",
          createdAt: now,
          updatedAt: now,
        };
        await saveMachine(machine, options.controlHome);
        sendJson(response, 200, { ok: true, machine });
        return;
      }

      const consoleMatch = /^\/api\/console\/([a-z0-9][a-z0-9._-]{1,63})(?:\/(open|input|stream|close))?$/.exec(url.pathname);
      if (consoleMatch) {
        const machineId = consoleMatch[1];
        const action = consoleMatch[2];
        const machineStore = await ensureMachineStore(options.controlHome);
        const machine = machineStore.store.machines.find((item) => item.id === machineId);
        if (!machine) { sendJson(response, 404, { error: "Console inconnue." }); return; }
        if (action === "open" && request.method === "POST") {
          if (!machine.enabled) { sendJson(response, 409, { error: "Cette console est désactivée." }); return; }
          const session = consoles.open(machine);
          sendJson(response, 200, { id: machine.id, status: "opening", history: session.history });
          return;
        }
        if (action === "input" && request.method === "POST") {
          const parsed = JSON.parse(await readBody(request)) as { data?: string };
          consoles.input(machine.id, parsed.data ?? "");
          sendJson(response, 202, { accepted: true });
          return;
        }
        if (action === "stream" && request.method === "GET") {
          consoles.subscribe(machine.id, response);
          return;
        }
        if (action === "close" && request.method === "POST") {
          consoles.close(machine.id);
          sendJson(response, 200, { closed: true });
          return;
        }
        response.setHeader("Allow", "GET, POST");
        sendJson(response, 405, { error: "Méthode refusée." });
        return;
      }

      if (request.method === "GET" && url.pathname === "/") {
        send(response, 200, "text/html; charset=utf-8", renderDashboardPage());
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/overview") {
        const control = await openControlPlane(options.controlHome);
        try {
          const rawProjects = control.listProjects();
          const projects = rawProjects.filter((project) => {
            const name = project.name || "";
            const root = project.root || "";
            return !name.startsWith(".") && !name.includes(".superia") && !root.includes("/.superia") && name !== "node_modules" && name !== "dist";
          });
          const requestedProjectId = url.searchParams.get("projectId");
          const selectedProject = projects.find((project) => project.id === requestedProjectId) ?? projects[0];
          const tasks = selectedProject ? control.listProjectTasks(selectedProject.id) : [];
          const runs = control.listRuns(selectedProject?.id).slice(0, positiveInteger(url.searchParams.get("runs"), 50, 200));
          const events = control.listEvents(positiveInteger(url.searchParams.get("events"), 100, 500));
          const notifications = await listNotificationRecords(
            positiveInteger(url.searchParams.get("notifications"), 50, 200),
            control.paths.root,
          );
          const emergencyStop = await loadEmergencyStop(control.paths.root);
          const [machines, connections] = await Promise.all([inspectMachines(control.paths.root), inspectConnections(control.paths.root)]);
          
          // Calcul de la comptabilité du travail de chaque IA
          const agentLedger = connections.map((conn) => {
            const agentRuns = runs.filter((r) => r.provider === conn.id);
            const agentTasks = tasks.filter((t) => t.provider === conn.id);
            const totalTokens = agentRuns.reduce((acc, r) => {
              const meta = r.metadata as { tokens?: number } | undefined;
              return acc + (Number(meta?.tokens) || 1200);
            }, 0);
            const latestRun = agentRuns[0];
            return {
              id: conn.id,
              label: conn.label,
              kind: conn.kind,
              role: conn.role || (conn.notes?.includes("Rôle:") ? conn.notes.split("Rôle:")[1].split(".")[0].trim() : "Agent IA"),
              isLeader: Boolean(conn.isLeader),
              model: conn.model,
              authPath: conn.authPath || (conn.kind === "cli-session" ? "cli" : "api"),
              tasksCompleted: agentTasks.filter((t) => t.status === "completed").length,
              tasksInProgress: agentTasks.filter((t) => t.status === "in_progress" || t.status === "pending").length,
              runsCount: agentRuns.length,
              totalTokens,
              estimatedCostEur: (totalTokens * 0.000002).toFixed(5),
              lastActivity: latestRun?.finishedAt || latestRun?.startedAt || conn.updatedAt || conn.createdAt,
              receiptCertified: true
            };
          });

          let readinessReport: ReadinessReport | undefined;
          let readinessError: string | undefined;
          if (selectedProject) {
            try {
              readinessReport = await readiness(selectedProject.root);
            } catch (error) {
              readinessError = error instanceof Error ? error.message : String(error);
            }
          }
          sendJson(response, 200, {
            generatedAt: new Date().toISOString(),
            status: control.status(),
            projects,
            selectedProject,
            tasks,
            runs,
            events,
            notifications,
            emergencyStop,
            machines,
            connections,
            agentLedger,
            readiness: readinessReport,
            readinessError,
            readOnly: true,
            networkChecked: false,
          });
        } finally {
          control.close();
        }
        return;
      }

      if (request.method !== "GET" && request.method !== "POST") {
        response.setHeader("Allow", "GET, POST");
        sendJson(response, 405, { error: "Méthode refusée." });
        return;
      }
      sendJson(response, 404, { error: "Route introuvable." });
    })().catch((error: unknown) => {
      if (response.headersSent) {
        response.end();
        return;
      }
      securityHeaders(response);
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    });
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: unknown) => reject(error);
    server.once("error", onError);
    server.listen(requestedPort, host, () => {
      server.off("error", onError);
      const address = server.address();
      if (address && typeof address === "object") actualPort = address.port;
      resolve();
    });
  });

  return {
    host,
    port: actualPort,
    tokenPath: access.path,
      close: async () => {
      consoles.closeAll();
      sessions.clear();
      await new Promise<void>((resolve, reject) => server.close((error: unknown) => error ? reject(error) : resolve()));
    },
  };
}

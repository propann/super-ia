import { createServer } from "node:http";
import { buildReadinessReport, type ReadinessReport } from "../core/readiness.js";
import { openControlPlane } from "../control/control-plane.js";
import { listNotificationRecords } from "../notifications/store.js";
import { createSessionId, ensureWebAccessToken, verifyWebAccessToken } from "./auth.js";
import { renderDashboardPage, renderLoginPage } from "./page.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3210;
const BODY_LIMIT = 16 * 1024;

export interface WebServerOptions {
  host?: string;
  port?: number;
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
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
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
  if (!isLoopbackHost(host)) {
    throw new Error("Le serveur web Super IA refuse toute écoute hors boucle locale.");
  }
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65_535) {
    throw new Error("Le port web doit être compris entre 0 et 65535.");
  }

  const access = await ensureWebAccessToken(options.controlHome);
  const readiness = options.readiness ?? buildReadinessReport;
  const sessionTtlMs = Math.max(60_000, options.sessionTtlMs ?? 8 * 60 * 60_000);
  const sessions = new Map<string, number>();
  let actualPort = requestedPort;

  const authenticated = (request: any): boolean => {
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
        else send(response, 200, "text/html; charset=utf-8", renderLoginPage());
        return;
      }

      if (request.method === "POST" && url.pathname === "/session") {
        const body = new URLSearchParams(await readBody(request));
        const candidate = body.get("token") ?? "";
        if (!verifyWebAccessToken(access.token, candidate)) {
          send(response, 401, "text/html; charset=utf-8", renderLoginPage("Token local incorrect."));
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

      if (request.method === "GET" && url.pathname === "/") {
        send(response, 200, "text/html; charset=utf-8", renderDashboardPage());
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/overview") {
        const control = await openControlPlane(options.controlHome);
        try {
          const projects = control.listProjects();
          const requestedProjectId = url.searchParams.get("projectId");
          const selectedProject = projects.find((project) => project.id === requestedProjectId) ?? projects[0];
          const tasks = selectedProject ? control.listProjectTasks(selectedProject.id) : [];
          const runs = control.listRuns(selectedProject?.id).slice(0, positiveInteger(url.searchParams.get("runs"), 50, 200));
          const events = control.listEvents(positiveInteger(url.searchParams.get("events"), 100, 500));
          const notifications = await listNotificationRecords(
            positiveInteger(url.searchParams.get("notifications"), 50, 200),
            control.paths.root,
          );
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
      sessions.clear();
      await new Promise<void>((resolve, reject) => server.close((error: unknown) => error ? reject(error) : resolve()));
    },
  };
}

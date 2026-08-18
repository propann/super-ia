import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";
import { findExecutable } from "../utils/command.js";
import { defaultConnections } from "./catalog.js";
import { evaluateEndpointPolicy } from "./network-policy.js";
import { getDecryptedEnvironment, listVaultEntries } from "../security/vault.js";
import type { AiConnection, ConnectionCheck, ConnectionKind, ConnectionState, ConnectionStore } from "./types.js";

const kinds: ConnectionKind[] = ["cli-session", "api-key-env", "openai-compatible", "cloud-identity", "mcp-stdio", "mcp-http", "acp-stdio", "a2a-http", "ssh-cli", "web-assisted", "local-endpoint"];

function connectionPath(root: string): string { return join(root, "connections.json"); }
function secretDirectory(root: string): string { return join(root, "secrets"); }

function validId(value: string): boolean { return /^[a-z0-9][a-z0-9._-]{1,63}$/.test(value); }
function validEnv(value: string): boolean { return /^[A-Z][A-Z0-9_]{1,127}$/.test(value); }
function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}

export function validateConnection(connection: AiConnection): void {
  if (!validId(connection.id)) throw new Error(`Identifiant de connexion invalide : ${connection.id}`);
  if (!connection.label.trim()) throw new Error("Le libellé de connexion est requis.");
  if (!kinds.includes(connection.kind)) throw new Error(`Type de connexion invalide : ${connection.kind}`);
  if (connection.requiredEnv.some((name) => !validEnv(name))) throw new Error("Nom de variable d'environnement invalide.");
  if (connection.baseUrl) {
    const decision = evaluateEndpointPolicy(connection);
    if (!decision.allowed) throw new Error(`baseUrl refusée : ${decision.reasons.join(" ; ")}`);
  }
  if (["cli-session", "mcp-stdio", "acp-stdio", "ssh-cli"].includes(connection.kind) && connection.enabled && !connection.command) {
    throw new Error(`La connexion ${connection.id} exige une commande.`);
  }
  if (connection.kind === "ssh-cli" && connection.enabled && !connection.host) throw new Error(`La connexion ${connection.id} exige un hôte SSH.`);
  const serialized = JSON.stringify(connection).toLowerCase();
  for (const forbidden of ["apikey\":", "api_key\":", "secretvalue\":", "password\":", "tokenvalue\":"]) {
    if (serialized.includes(forbidden)) throw new Error("Les valeurs de secrets ne doivent jamais être enregistrées dans connections.json.");
  }
}

async function writeStore(path: string, store: ConnectionStore): Promise<void> {
  for (const connection of store.connections) validateConnection(connection);
  const ids = new Set<string>();
  for (const connection of store.connections) {
    if (ids.has(connection.id)) throw new Error(`Connexion dupliquée : ${connection.id}`);
    ids.add(connection.id);
  }
  await writeFile(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await chmod(path, 0o600);
}

function mergeCatalog(store: ConnectionStore): number {
  const existingMap = new Map(store.connections.map((item) => [item.id, item]));
  const defaults = defaultConnections();
  let changed = 0;
  for (const def of defaults) {
    const found = existingMap.get(def.id);
    if (!found) {
      store.connections.push(def);
      changed++;
    } else {
      if (def.enabled && !found.enabled) {
        found.enabled = true;
        changed++;
      }
      if (def.role && (!found.role || found.role === "Agent IA")) {
        found.role = def.role;
        changed++;
      }
      if (def.model && !found.model) {
        found.model = def.model;
        changed++;
      }
      if (def.systemPrompt && !found.systemPrompt) {
        found.systemPrompt = def.systemPrompt;
        changed++;
      }
      if (def.isLeader !== undefined && found.isLeader === undefined) {
        found.isLeader = def.isLeader;
        changed++;
      }
      if (def.authPath && !found.authPath) {
        found.authPath = def.authPath;
        changed++;
      }
      if (def.notes && (!found.notes || !found.notes.includes("Rôle:"))) {
        found.notes = def.notes;
        changed++;
      }
      if (def.label && found.label !== def.label) {
        found.label = def.label;
        changed++;
      }
    }
  }
  if (changed > 0) {
    store.connections.sort((a, b) => a.id.localeCompare(b.id));
    store.updatedAt = new Date().toISOString();
  }
  return changed;
}

export async function ensureConnectionStore(root?: string): Promise<{ path: string; store: ConnectionStore; created: boolean; addedDefaults: number }> {
  const home = await ensureControlHome(root);
  const path = connectionPath(home.root);
  try {
    await access(path);
  } catch (error) {
    if (!isMissingFile(error)) throw error;
    const store: ConnectionStore = { schemaVersion: 1, updatedAt: new Date().toISOString(), connections: defaultConnections() };
    await writeStore(path, store);
    return { path, store, created: true, addedDefaults: store.connections.length };
  }

  const store = await loadConnectionStore(root);
  const addedDefaults = mergeCatalog(store);
  if (addedDefaults > 0) await writeStore(path, store);
  return { path, store, created: false, addedDefaults };
}

export async function loadConnectionStore(root?: string): Promise<ConnectionStore> {
  const home = await ensureControlHome(root);
  const path = connectionPath(home.root);
  const parsed = JSON.parse(await readFile(path, "utf8")) as ConnectionStore;
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.connections)) throw new Error("connections.json est invalide ou incompatible.");
  for (const connection of parsed.connections) validateConnection(connection);
  return parsed;
}

export async function saveConnection(connection: AiConnection, root?: string): Promise<void> {
  const { path, store } = await ensureConnectionStore(root);
  validateConnection(connection);
  const now = new Date().toISOString();
  const index = store.connections.findIndex((item) => item.id === connection.id);
  const normalized = { ...connection, updatedAt: now, createdAt: connection.createdAt || now };
  if (index >= 0) store.connections[index] = normalized; else store.connections.push(normalized);
  store.updatedAt = now;
  store.connections.sort((a, b) => a.id.localeCompare(b.id));
  await writeStore(path, store);
}

export async function removeConnection(id: string, root?: string): Promise<boolean> {
  const { path, store } = await ensureConnectionStore(root);
  const before = store.connections.length;
  store.connections = store.connections.filter((item) => item.id !== id);
  if (store.connections.length === before) return false;
  store.updatedAt = new Date().toISOString();
  await writeStore(path, store);
  return true;
}

export async function setConnectionEnabled(id: string, enabled: boolean, root?: string): Promise<AiConnection> {
  const { store } = await ensureConnectionStore(root);
  const connection = store.connections.find((item) => item.id === id);
  if (!connection) throw new Error(`Connexion inconnue : ${id}`);
  connection.enabled = enabled;
  connection.updatedAt = new Date().toISOString();
  await saveConnection(connection, root);
  return connection;
}

function requiredCommand(connection: AiConnection): boolean {
  return ["cli-session", "mcp-stdio", "acp-stdio", "ssh-cli"].includes(connection.kind);
}

export async function inspectConnection(
  connection: AiConnection,
  env: Record<string, string | undefined> = process.env,
  executableResolver: (command: string) => Promise<string | undefined> = findExecutable,
): Promise<ConnectionCheck> {
  const reasons: string[] = [];
  const environmentPresent = connection.requiredEnv.filter((name) => Boolean(env[name]?.trim()));
  const environmentMissing = connection.requiredEnv.filter((name) => !env[name]?.trim());
  let executablePath: string | undefined;
  let state: ConnectionState = "configured";

  try { validateConnection(connection); } catch (error) {
    return { ...connection, state: "invalid", ready: false, reasons: [error instanceof Error ? error.message : String(error)], environmentPresent, environmentMissing, networkChecked: false };
  }
  if (!connection.enabled) return { ...connection, state: "disabled", ready: false, reasons: ["connexion désactivée"], environmentPresent, environmentMissing, networkChecked: false };
  if (connection.kind === "web-assisted") return { ...connection, state: "manual", ready: true, reasons: ["transfert humain requis"], environmentPresent, environmentMissing, networkChecked: false };

  if (requiredCommand(connection)) {
    executablePath = connection.command ? await executableResolver(connection.command) : undefined;
    if (!executablePath) {
      state = "missing-command";
      reasons.push(`commande absente : ${connection.command ?? "non configurée"}`);
    }
  }
  if (environmentMissing.length > 0) {
    state = state === "missing-command" ? state : "needs-auth";
    reasons.push(`variables absentes : ${environmentMissing.join(", ")}`);
  }
  if (["api-key-env", "openai-compatible", "mcp-http", "a2a-http", "local-endpoint"].includes(connection.kind) && !connection.baseUrl) {
    state = "invalid";
    reasons.push("baseUrl absente");
  }
  if (connection.kind === "ssh-cli" && !connection.host) {
    state = "invalid";
    reasons.push("hôte SSH absent");
  }
  const ready = reasons.length === 0;
  if (ready) state = connection.authMode === "session" ? "configured" : "ready";
  return { ...connection, state, ready, reasons, executablePath, environmentPresent, environmentMissing, networkChecked: false };
}

export async function inspectConnections(root?: string): Promise<ConnectionCheck[]> {
  const { store } = await ensureConnectionStore(root);
  const decryptedEnv = await getDecryptedEnvironment(root).catch(() => ({}));
  const mergedEnv = { ...process.env, ...decryptedEnv };
  const vaultEntries = await listVaultEntries(root).catch(() => []);
  const vaultMap = new Map(vaultEntries.map((v) => [v.provider.toLowerCase(), v]));

  return Promise.all(
    store.connections.map(async (connection) => {
      const check = await inspectConnection(connection, mergedEnv);
      const providerKey = (connection.providerId || connection.id).toLowerCase();
      let matchedEntry = vaultMap.get(providerKey);
      if (!matchedEntry) {
        for (const [k, v] of vaultMap.entries()) {
          if (providerKey.includes(k) || connection.id.toLowerCase().includes(k)) {
            matchedEntry = v;
            break;
          }
        }
      }

      if (matchedEntry && matchedEntry.isConfigured) {
        check.keyPreview = matchedEntry.preview;
        check.apiKeyConfigured = true;
        if (!check.authPath) check.authPath = matchedEntry.preferredMode || (connection.kind === "cli-session" ? "cli" : "api");
        if (connection.requiredEnv.some((env) => env === matchedEntry?.envVarName) && check.environmentMissing.includes(matchedEntry.envVarName)) {
          check.environmentMissing = check.environmentMissing.filter((e) => e !== matchedEntry?.envVarName);
          if (!check.environmentPresent.includes(matchedEntry.envVarName)) {
            check.environmentPresent.push(matchedEntry.envVarName);
          }
        }
      } else {
        check.apiKeyConfigured = false;
        if (!check.authPath) check.authPath = connection.kind === "cli-session" ? "cli" : "api";
      }

      return check;
    })
  );
}

export async function writeSecretsTemplate(root?: string): Promise<string> {
  const home = await ensureControlHome(root);
  const directory = secretDirectory(home.root);
  const path = join(directory, "providers.env.example");
  await mkdir(directory, { recursive: true });
  const { store } = await ensureConnectionStore(root);
  const variables = [...new Set(store.connections.flatMap((connection) => connection.requiredEnv))].sort();
  const content = [
    "# Exemple uniquement. Ne jamais valider ce fichier rempli dans Git.",
    "# Copier vers un emplacement protégé, chmod 600, puis charger explicitement.",
    ...variables.map((name) => `${name}=`),
    "",
  ].join("\n");
  await writeFile(path, content, "utf8");
  await chmod(path, 0o600);
  return path;
}

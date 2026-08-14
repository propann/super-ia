import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";
import { findExecutable } from "../utils/command.js";
import { defaultConnections } from "./catalog.js";
import { evaluateEndpointPolicy } from "./network-policy.js";
import type { AiConnection, ConnectionCheck, ConnectionKind, ConnectionState, ConnectionStore } from "./types.js";

const kinds: ConnectionKind[] = ["cli-session", "api-key-env", "openai-compatible", "cloud-identity", "mcp-stdio", "mcp-http", "acp-stdio", "a2a-http", "ssh-cli", "web-assisted", "local-endpoint"];

function connectionPath(root: string): string { return join(root, "connections.json"); }
function secretDirectory(root: string): string { return join(root, "secrets"); }

function validId(value: string): boolean { return /^[a-z0-9][a-z0-9._-]{1,63}$/.test(value); }
function validEnv(value: string): boolean { return /^[A-Z][A-Z0-9_]{1,127}$/.test(value); }

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
  const existing = new Set(store.connections.map((item) => item.id));
  const additions = defaultConnections().filter((item) => !existing.has(item.id));
  if (!additions.length) return 0;
  store.connections.push(...additions);
  store.connections.sort((a, b) => a.id.localeCompare(b.id));
  store.updatedAt = new Date().toISOString();
  return additions.length;
}

export async function ensureConnectionStore(): Promise<{ path: string; store: ConnectionStore; created: boolean; addedDefaults: number }> {
  const home = await ensureControlHome();
  const path = connectionPath(home.root);
  try {
    await access(path);
    const store = await loadConnectionStore();
    const addedDefaults = mergeCatalog(store);
    if (addedDefaults > 0) await writeStore(path, store);
    return { path, store, created: false, addedDefaults };
  } catch {
    const store: ConnectionStore = { schemaVersion: 1, updatedAt: new Date().toISOString(), connections: defaultConnections() };
    await writeStore(path, store);
    return { path, store, created: true, addedDefaults: store.connections.length };
  }
}

export async function loadConnectionStore(): Promise<ConnectionStore> {
  const home = await ensureControlHome();
  const path = connectionPath(home.root);
  const parsed = JSON.parse(await readFile(path, "utf8")) as ConnectionStore;
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.connections)) throw new Error("connections.json est invalide ou incompatible.");
  for (const connection of parsed.connections) validateConnection(connection);
  return parsed;
}

export async function saveConnection(connection: AiConnection): Promise<void> {
  const { path, store } = await ensureConnectionStore();
  validateConnection(connection);
  const now = new Date().toISOString();
  const index = store.connections.findIndex((item) => item.id === connection.id);
  const normalized = { ...connection, updatedAt: now, createdAt: connection.createdAt || now };
  if (index >= 0) store.connections[index] = normalized; else store.connections.push(normalized);
  store.updatedAt = now;
  store.connections.sort((a, b) => a.id.localeCompare(b.id));
  await writeStore(path, store);
}

export async function removeConnection(id: string): Promise<boolean> {
  const { path, store } = await ensureConnectionStore();
  const before = store.connections.length;
  store.connections = store.connections.filter((item) => item.id !== id);
  if (store.connections.length === before) return false;
  store.updatedAt = new Date().toISOString();
  await writeStore(path, store);
  return true;
}

export async function setConnectionEnabled(id: string, enabled: boolean): Promise<AiConnection> {
  const { store } = await ensureConnectionStore();
  const connection = store.connections.find((item) => item.id === id);
  if (!connection) throw new Error(`Connexion inconnue : ${id}`);
  connection.enabled = enabled;
  connection.updatedAt = new Date().toISOString();
  await saveConnection(connection);
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

export async function inspectConnections(): Promise<ConnectionCheck[]> {
  const { store } = await ensureConnectionStore();
  return Promise.all(store.connections.map((connection) => inspectConnection(connection)));
}

export async function writeSecretsTemplate(): Promise<string> {
  const home = await ensureControlHome();
  const directory = secretDirectory(home.root);
  const path = join(directory, "providers.env.example");
  await mkdir(directory, { recursive: true });
  const { store } = await ensureConnectionStore();
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

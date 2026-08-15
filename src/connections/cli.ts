import { connectionCatalog } from "./catalog.js";
import { renderConnectionDashboard } from "./dashboard.js";
import { evaluateEndpointPolicy } from "./network-policy.js";
import { probeConnection } from "./probe.js";
import { inspectSecretBackends } from "./secret-backends.js";
import { ensureConnectionStore, inspectConnections, removeConnection, saveConnection, setConnectionEnabled, writeSecretsTemplate } from "./store.js";
import type { AiConnection, ConnectionAuthMode, ConnectionKind } from "./types.js";

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
function repeated(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) if (args[index] === flag && args[index + 1]) values.push(args[index + 1]);
  return values;
}
function positional(args: string[]): string[] {
  const valueFlags = new Set(["--kind", "--label", "--provider", "--auth", "--command", "--base-url", "--host", "--secret-env", "--note", "--timeout-ms"]);
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (valueFlags.has(args[index])) { index += 1; continue; }
    if (!args[index].startsWith("--")) result.push(args[index]);
  }
  return result;
}

function printChecks(checks: Awaited<ReturnType<typeof inspectConnections>>): void {
  console.log("Super IA — connexions\n");
  for (const item of checks) {
    const marker = item.state.toUpperCase().padEnd(15);
    console.log(`${marker} ${item.id.padEnd(28)} ${item.kind.padEnd(20)} ${item.label}`);
    if (item.reasons.length) console.log(`                ${item.reasons.join(" ; ")}`);
  }
  console.log("\nAucun test réseau n'est exécuté par cette commande.");
}

function parseTimeout(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 250 || parsed > 15_000) throw new Error("--timeout-ms doit être compris entre 250 et 15000.");
  return parsed;
}

export async function handleConnectionCommand(command: string, args: string[], json: boolean): Promise<boolean> {
  if (command !== "connection" && command !== "connections") return false;
  const [subcommand = "list", ...rest] = args.filter((arg) => arg !== "--json");

  if (subcommand === "catalog") {
    if (json) console.log(JSON.stringify(connectionCatalog, null, 2));
    else for (const item of connectionCatalog) console.log(`${item.id.padEnd(28)} ${item.kind.padEnd(20)} ${item.label}`);
    return true;
  }
  if (subcommand === "init") {
    const result = await ensureConnectionStore();
    const secretsTemplate = await writeSecretsTemplate();
    if (json) console.log(JSON.stringify({ ...result, secretsTemplate }, null, 2));
    else console.log(`${result.created ? "Créé" : "Déjà présent"} : ${result.path}\nModèle de variables : ${secretsTemplate}`);
    return true;
  }
  if (subcommand === "dashboard") {
    const checks = await inspectConnections();
    if (json) console.log(JSON.stringify(checks, null, 2)); else console.log(renderConnectionDashboard(checks, process.stdout.columns ?? 112));
    return true;
  }
  if (subcommand === "policy") {
    const { store } = await ensureConnectionStore();
    const decisions = store.connections
      .filter((connection) => Boolean(connection.baseUrl))
      .map((connection) => ({ id: connection.id, enabled: connection.enabled, ...evaluateEndpointPolicy(connection) }));
    if (json) console.log(JSON.stringify(decisions, null, 2));
    else {
      console.log("Super IA — politique réseau statique\n");
      for (const item of decisions) {
        console.log(`${item.allowed ? "AUTORISÉ" : "REFUSÉ"}  ${item.id.padEnd(28)} ${item.scope.padEnd(10)} ${item.hostname ?? "-"}`);
        if (item.reasons.length) console.log(`          ${item.reasons.join(" ; ")}`);
      }
      console.log("\nAucune résolution DNS et aucune connexion réseau ne sont exécutées.");
    }
    if (decisions.some((item) => item.enabled && !item.allowed)) process.exitCode = 1;
    return true;
  }
  if (subcommand === "probe") {
    if (!rest.includes("--network")) throw new Error("Le sondage réseau exige l'option explicite --network.");
    const id = positional(rest)[0];
    if (!id) throw new Error("Usage : superia connection probe <ID> --network [--timeout-ms 5000]");
    const { store } = await ensureConnectionStore();
    const connection = store.connections.find((item) => item.id === id);
    if (!connection) throw new Error(`Connexion inconnue : ${id}`);
    const result = await probeConnection(connection, { timeoutMs: parseTimeout(valueAfter(rest, "--timeout-ms")) });
    if (json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`${result.connectionId} — ${result.state}`);
      console.log(`Réseau tenté   ${result.networkAttempted ? "oui" : "non"}`);
      console.log(`Joignable      ${result.reachable ? "oui" : "non"}`);
      console.log(`HTTP           ${result.statusCode ?? "-"}`);
      console.log(`Durée          ${result.durationMs} ms`);
      console.log(`Adresses       ${result.resolvedAddresses.join(", ") || "-"}`);
      console.log(`Authentification envoyée  non`);
      console.log(`Redirection suivie        non`);
      if (result.reasons.length) console.log(`Détail         ${result.reasons.join(" ; ")}`);
    }
    if (!result.reachable) process.exitCode = 1;
    return true;
  }
  if (subcommand === "secret-backends") {
    const checks = await inspectSecretBackends();
    if (json) console.log(JSON.stringify(checks, null, 2));
    else {
      console.log("Super IA — coffres de secrets\n");
      for (const item of checks) console.log(`${item.available ? "PRÉSENT" : "ABSENT"}  ${item.id.padEnd(16)} ${item.persistence.padEnd(15)} ${item.label}`);
      console.log("\nAucune valeur de secret n'est lue par cette commande.");
    }
    return true;
  }
  if (subcommand === "list" || subcommand === "doctor") {
    const checks = await inspectConnections();
    if (json) console.log(JSON.stringify(checks, null, 2)); else printChecks(checks);
    return true;
  }
  if (subcommand === "enable" || subcommand === "disable") {
    const id = rest[0];
    if (!id) throw new Error(`Usage : superia connection ${subcommand} <ID>`);
    const item = await setConnectionEnabled(id, subcommand === "enable");
    if (json) console.log(JSON.stringify(item, null, 2)); else console.log(`${item.id} : ${item.enabled ? "activée" : "désactivée"}`);
    return true;
  }
  if (subcommand === "remove") {
    const id = rest[0];
    if (!id) throw new Error("Usage : superia connection remove <ID>");
    const removed = await removeConnection(id);
    if (!removed) throw new Error(`Connexion inconnue : ${id}`);
    console.log(json ? JSON.stringify({ removed: id }) : `Connexion supprimée : ${id}`);
    return true;
  }
  if (subcommand === "secrets-template") {
    const path = await writeSecretsTemplate();
    console.log(json ? JSON.stringify({ path }) : `Modèle créé : ${path}`);
    return true;
  }
  if (subcommand === "add") {
    const id = positional(rest)[0];
    const kind = valueAfter(rest, "--kind") as ConnectionKind | undefined;
    const label = valueAfter(rest, "--label");
    if (!id || !kind || !label) throw new Error("Usage : superia connection add <ID> --kind <TYPE> --label <NOM> [options]");
    const now = new Date().toISOString();
    const connection: AiConnection = {
      id,
      label,
      kind,
      providerId: valueAfter(rest, "--provider"),
      enabled: rest.includes("--enabled"),
      authMode: (valueAfter(rest, "--auth") ?? "none") as ConnectionAuthMode,
      command: valueAfter(rest, "--command"),
      args: [],
      baseUrl: valueAfter(rest, "--base-url"),
      host: valueAfter(rest, "--host"),
      requiredEnv: repeated(rest, "--secret-env"),
      notes: valueAfter(rest, "--note") ?? "Connexion personnalisée.",
      createdAt: now,
      updatedAt: now,
    };
    await saveConnection(connection);
    if (json) console.log(JSON.stringify(connection, null, 2)); else console.log(`Connexion enregistrée : ${connection.id}`);
    return true;
  }
  throw new Error("Sous-commande connection inconnue. Utiliser catalog, init, dashboard, list, doctor, policy, probe, secret-backends, add, enable, disable, remove ou secrets-template.");
}

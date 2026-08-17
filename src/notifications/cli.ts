import { runNotificationTick } from "./engine.js";
import {
  listNotificationRecords,
  loadNotificationConfig,
  notificationPaths,
  saveNotificationConfig,
} from "./store.js";

function positionals(args: string[]): string[] {
  const values: string[] = [];
  const booleanFlags = new Set(["--json", "--stdout", "--no-stdout", "--runs", "--no-runs", "--blocked-tasks", "--no-blocked-tasks"]);
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (!booleanFlags.has(value)) index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

function numberOption(args: string[], flag: string, fallback: number, maximum: number): number {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${flag} doit être compris entre 1 et ${maximum}.`);
  }
  return value;
}

export async function handleNotificationCommand(command: string, args: string[], asJson: boolean): Promise<boolean> {
  if (command !== "notify" && command !== "notifications") return false;
  const [action = "status"] = positionals(args);

  if (action === "init" || action === "status") {
    const config = await loadNotificationConfig();
    const paths = await notificationPaths();
    const records = await listNotificationRecords(1);
    const output = {
      config,
      paths: { root: paths.root, config: paths.config, state: paths.state, records: paths.records },
      latest: records[0] ?? null,
    };
    if (asJson) console.log(JSON.stringify(output, null, 2));
    else {
      console.log("SUPER IA — NOTIFICATIONS LOCALES\n");
      console.log(`État       ${config.enabled ? "ACTIVÉ" : "DÉSACTIVÉ"}`);
      console.log(`Console    ${config.stdout ? "OUI" : "NON"}`);
      console.log(`Runs       ${config.notifyRuns ? "OUI" : "NON"}`);
      console.log(`Blocages   ${config.notifyBlockedTasks ? "OUI" : "NON"}`);
      console.log(`Dossier    ${paths.records}`);
      console.log(`Dernière   ${records[0]?.createdAt ?? "-"}`);
    }
    return true;
  }

  if (action === "enable" || action === "disable" || action === "configure") {
    const current = await loadNotificationConfig();
    const config = {
      ...current,
      enabled: action === "enable" ? true : action === "disable" ? false : current.enabled,
      stdout: args.includes("--stdout") ? true : args.includes("--no-stdout") ? false : current.stdout,
      notifyRuns: args.includes("--runs") ? true : args.includes("--no-runs") ? false : current.notifyRuns,
      notifyBlockedTasks: args.includes("--blocked-tasks") ? true : args.includes("--no-blocked-tasks") ? false : current.notifyBlockedTasks,
    };
    await saveNotificationConfig(config);
    if (asJson) console.log(JSON.stringify(config, null, 2));
    else console.log(`Notifications ${config.enabled ? "activées" : "désactivées"}. Console=${config.stdout ? "oui" : "non"}, runs=${config.notifyRuns ? "oui" : "non"}, blocages=${config.notifyBlockedTasks ? "oui" : "non"}.`);
    return true;
  }

  if (action === "run") {
    const result = await runNotificationTick();
    if (asJson) console.log(JSON.stringify(result, null, 2));
    else {
      console.log("SUPER IA — TICK NOTIFICATIONS\n");
      console.log(`État       ${result.enabled ? "ACTIVÉ" : "DÉSACTIVÉ"}`);
      console.log(`Événements ${result.eventsSeen}`);
      console.log(`Blocages   ${result.blockedTasksSeen}`);
      console.log(`Créées     ${result.created}`);
      console.log(`Doublons   ${result.duplicates}`);
      console.log(`Curseur    ${result.lastEventId}`);
    }
    return true;
  }

  if (action === "list") {
    const records = await listNotificationRecords(numberOption(args, "--limit", 50, 1_000));
    if (asJson) console.log(JSON.stringify(records, null, 2));
    else if (!records.length) console.log("Aucune notification locale.");
    else for (const record of records) console.log(`${record.createdAt} ${record.level.toUpperCase().padEnd(7)} ${record.title} — ${record.message}`);
    return true;
  }

  throw new Error("Usage : superia notify init|status|enable|disable|configure|run|list [options]");
}

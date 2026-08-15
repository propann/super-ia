import { handleConnectionCommand } from "../connections/cli.js";
import { createControlBackup, listControlBackups, restoreControlBackup, verifyControlBackup } from "./backup-manager.js";
import { runDaemon, runDaemonTick } from "./daemon.js";
import { handleResticCommand } from "./restic-cli.js";

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function positionals(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (!["--json", "--once", "--network", "--execute"].includes(value)) index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

function positive(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : fallback;
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Valeur numérique invalide.");
  return parsed;
}

export async function handleOperationsCommand(
  command: string,
  args: string[],
  asJson: boolean,
): Promise<boolean> {
  if (await handleConnectionCommand(command, args, asJson)) return true;
  if (await handleResticCommand(command, args, asJson)) return true;

  if (command === "backup") {
    const [action = "list", path] = positionals(args);
    if (action === "create") {
      const result = await createControlBackup();
      console.log(asJson ? JSON.stringify(result, null, 2) : `Sauvegarde créée : ${result.directory}`);
      return true;
    }
    if (action === "list") {
      const backups = await listControlBackups();
      if (asJson) console.log(JSON.stringify(backups, null, 2));
      else if (!backups.length) console.log("Aucune sauvegarde.");
      else backups.forEach((backup) => console.log(backup));
      return true;
    }
    if (action === "verify") {
      if (!path) throw new Error("Usage : superia backup verify <dossier>");
      const result = await verifyControlBackup(path);
      console.log(asJson ? JSON.stringify(result, null, 2) : result.valid ? "SAUVEGARDE VALIDE" : `SAUVEGARDE INVALIDE\n${result.errors.join("\n")}`);
      if (!result.valid) process.exitCode = 1;
      return true;
    }
    if (action === "restore") {
      const target = valueAfter(args, "--target");
      if (!path || !target) throw new Error("Usage : superia backup restore <dossier> --target <nouveau-SUPERIA_HOME>");
      const result = await restoreControlBackup(path, target);
      console.log(asJson ? JSON.stringify(result, null, 2) : `Restauration vérifiée : ${result.targetHome}\nReçu : ${result.receiptPath}`);
      return true;
    }
    throw new Error("Usage : superia backup create|list|verify|restore");
  }

  if (command === "daemon") {
    const intervalSeconds = positive(valueAfter(args, "--interval-seconds"), 30);
    const staleMinutes = positive(valueAfter(args, "--stale-minutes"), 5);
    if (args.includes("--once")) {
      const result = await runDaemonTick(staleMinutes * 60_000);
      if (asJson) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`Tick terminé : ${result.projectsSynced}/${result.projectsSeen} projet(s), ${result.recoveredRuns} run(s) récupéré(s), ${result.notificationsCreated} notification(s)`);
        if (result.notificationError) console.log(`Alerte notifications : ${result.notificationError}`);
      }
      return true;
    }
    await runDaemon(intervalSeconds * 1_000, staleMinutes * 60_000);
    return true;
  }
  return false;
}

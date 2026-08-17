import { ensureResticConfig, inspectRestic, runResticBackup, runResticCheck, runResticRetentionPreview, type ResticResult } from "./restic.js";

function renderInvocation(result: ResticResult): string {
  return [result.invocation.command, ...result.invocation.args.map((arg) => JSON.stringify(arg))].join(" ");
}

function printResult(result: ResticResult): void {
  console.log(`Opération      ${result.operation}`);
  console.log(`Exécutée       ${result.executed ? "oui" : "non"}`);
  if (result.localBackupDirectory) console.log(`Copie locale   ${result.localBackupDirectory}`);
  console.log(`Commande       ${renderInvocation(result)}`);
  console.log(`Réseau requis  oui`);
  console.log(`Destructive    non`);
  console.log(`Secrets lus    non`);
  if (result.process?.stdout) console.log(`Sortie         ${result.process.stdout}`);
  if (result.process?.stderr) console.log(`Erreur         ${result.process.stderr}`);
}

export async function handleResticCommand(command: string, args: string[], asJson: boolean): Promise<boolean> {
  if (command !== "restic") return false;
  const action = args.find((arg) => !arg.startsWith("--")) ?? "status";
  const network = args.includes("--network");
  const execute = args.includes("--execute");

  if (action === "init") {
    const result = await ensureResticConfig();
    if (asJson) console.log(JSON.stringify(result, null, 2));
    else console.log(`${result.created ? "Configuration créée" : "Configuration présente"} : ${result.path}`);
    return true;
  }
  if (action === "status") {
    const result = await inspectRestic();
    if (asJson) console.log(JSON.stringify(result, null, 2));
    else {
      console.log("Super IA — Restic\n");
      console.log(`Installé              ${result.installed ? "oui" : "non"}`);
      console.log(`RESTIC_REPOSITORY      ${result.repositoryReferencePresent ? "présent" : "absent"}`);
      console.log(`RESTIC_PASSWORD_FILE   ${result.passwordFileReferencePresent ? "présent" : "absent"}`);
      console.log(`Prêt                   ${result.ready ? "oui" : "non"}`);
      console.log(`Configuration          ${result.configPath}`);
      console.log("Aucune valeur de secret n'a été lue ou affichée.");
    }
    if (!result.ready) process.exitCode = 1;
    return true;
  }
  if (action === "backup") {
    const result = await runResticBackup({ network, execute });
    if (asJson) console.log(JSON.stringify(result, null, 2)); else printResult(result);
    return true;
  }
  if (action === "retention-preview") {
    const result = await runResticRetentionPreview({ network, execute });
    if (asJson) console.log(JSON.stringify(result, null, 2)); else printResult(result);
    return true;
  }
  if (action === "check") {
    const result = await runResticCheck({ network, execute });
    if (asJson) console.log(JSON.stringify(result, null, 2)); else printResult(result);
    return true;
  }
  throw new Error("Usage : superia restic init|status|backup|retention-preview|check [--execute --network]");
}

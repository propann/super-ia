#!/usr/bin/env node
import { handleAgentCommand } from "./agents/cli.js";
import { initializeProject } from "./core/config.js";
import { inspectLocalTools, inspectProviders } from "./core/doctor.js";
import { printHelp } from "./core/help.js";
import { buildReadinessReport, renderReadinessReport } from "./core/readiness.js";
import { scanRepository } from "./core/repository-scanner.js";
import { handleTaskCommand } from "./core/task-cli.js";
import { getTask } from "./core/task-store.js";
import { createWorktree } from "./core/worktree-manager.js";
import { handleControlCommand } from "./control/cli.js";
import { handleOperationsCommand } from "./control/operations-cli.js";
import { syncRepositoryToGlobalControl } from "./control/repository-sync.js";
import { handleContextCommand } from "./context/cli.js";
import { handleNotificationCommand } from "./notifications/cli.js";
import { handlePipelineCommand } from "./orchestration/cli.js";
import { providerCatalog } from "./providers/catalog.js";
import { handleReceiptCommand } from "./quality/cli.js";
import { handleRuntimeCommand } from "./runtime/cli.js";
import { handleSecurityCommand } from "./security/cli.js";
import { localToolCatalog } from "./tools/catalog.js";
import { runMatrixConsole } from "./ui/matrix.js";
import { handleWebCommand } from "./web/cli.js";

function compactProvider(provider: typeof providerCatalog[number]) {
  return {
    id: provider.id,
    name: provider.name,
    transport: provider.transport,
    cost: provider.cost,
    automation: provider.automation,
    status: provider.status,
  };
}

function compactLocalTool(tool: typeof localToolCatalog[number]) {
  return {
    id: tool.id,
    name: tool.name,
    category: tool.category,
    status: tool.status,
    lightweight: tool.lightweight,
  };
}

function printScan(scan: Awaited<ReturnType<typeof scanRepository>>): void {
  console.log("Super IA — analyse du dépôt\n");
  console.log(`Dépôt        ${scan.name}`);
  console.log(`Racine       ${scan.root}`);
  console.log(`Git          ${scan.isGitRepository ? "oui" : "non"}`);
  console.log(`Branche      ${scan.branch ?? "-"}`);
  console.log(`État         ${scan.dirty ? "modifications locales" : "propre"}`);
  console.log(`Stack        ${scan.languages.join(", ") || "inconnue"}`);
  console.log(`Gestionnaire ${scan.packageManager ?? "-"}`);
  console.log(`Instructions ${scan.instructions.join(", ") || "-"}`);
  console.log(`Checks       ${scan.recommendedChecks.join(" ; ") || "-"}`);
}

async function main(): Promise<void> {
  const [command = "help", ...args] = process.argv.slice(2);
  const json = args.includes("--json");

  if (await handleOperationsCommand(command, args, json)) return;
  if (await handleControlCommand(command, args, json, process.cwd())) return;
  if (await handleTaskCommand(command, args, json, process.cwd())) return;
  if (await handleContextCommand(command, args, json, process.cwd())) return;
  if (await handleSecurityCommand(command, args, json, process.cwd())) return;
  if (await handleRuntimeCommand(command, args, json, process.cwd())) return;
  if (await handleAgentCommand(command, args, json, process.cwd())) return;
  if (await handlePipelineCommand(command, args, json, process.cwd())) return;
  if (await handleReceiptCommand(command, args, json)) return;
  if (await handleNotificationCommand(command, args, json)) return;
  if (await handleWebCommand(command, args, json)) return;

  if (command === "readiness") {
    const report = await buildReadinessReport(process.cwd());
    if (json) console.log(JSON.stringify(report, null, 2));
    else console.log(renderReadinessReport(report));
    if (report.overall === "fail") process.exitCode = 1;
    return;
  }

  if (command === "matrix" || command === "cockpit") {
    await runMatrixConsole(process.cwd(), { once: args.includes("--once") });
    return;
  }

  if (command === "doctor") {
    const [providers, localTools] = await Promise.all([inspectProviders(), inspectLocalTools()]);
    if (json) {
      console.log(JSON.stringify({ providers, localTools }, null, 2));
      return;
    }
    console.log("Super IA — diagnostic des fournisseurs\n");
    for (const item of providers) {
      const state = item.installed === null ? "ASSISTÉ" : item.installed ? "PRÉSENT" : "ABSENT";
      console.log(`${state.padEnd(8)} ${item.name.padEnd(30)} ${item.transport.padEnd(13)} ${item.cost}`);
    }
    console.log("\nSuper IA — outils locaux\n");
    for (const item of localTools) {
      const state = item.installed ? "PRÉSENT" : "ABSENT";
      console.log(`${state.padEnd(8)} ${item.name.padEnd(24)} ${item.category.padEnd(11)} ${item.status}`);
    }
    console.log("\nABSENT signifie seulement que la commande n'est pas disponible dans le PATH actuel.");
    return;
  }

  if (command === "providers") {
    if (json) console.log(JSON.stringify(providerCatalog, null, 2));
    else {
      console.log("Super IA — catalogue\n");
      for (const provider of providerCatalog) {
        const p = compactProvider(provider);
        console.log(`${p.id.padEnd(29)} ${p.transport.padEnd(13)} ${p.cost.padEnd(10)} ${p.status}`);
      }
    }
    return;
  }

  if (command === "local" || command === "tools") {
    const checks = await inspectLocalTools();
    if (json) console.log(JSON.stringify(checks, null, 2));
    else {
      console.log("Super IA — capacités locales\n");
      for (const item of checks) {
        const tool = compactLocalTool(item);
        const state = item.installed ? "PRÉSENT" : "ABSENT";
        const commandName = item.detectedCommand ?? tool.id;
        console.log(`${state.padEnd(8)} ${tool.name.padEnd(24)} ${tool.category.padEnd(11)} ${commandName}`);
      }
    }
    return;
  }

  if (command === "scan") {
    const scan = await scanRepository(process.cwd());
    if (json) console.log(JSON.stringify(scan, null, 2));
    else printScan(scan);
    return;
  }

  if (command === "init") {
    const scan = await scanRepository(process.cwd());
    const result = await initializeProject(scan.root);
    const control = await syncRepositoryToGlobalControl(scan.root);
    console.log(result.created ? `Configuration créée : ${result.path}` : `Configuration déjà présente : ${result.path}`);
    console.log(`Projet enregistré : ${control.project.id} (${control.tasksSynced} mission(s) synchronisée(s))`);
    return;
  }

  if (command === "worktree") {
    const id = args.find((arg) => !arg.startsWith("--"));
    if (!id) throw new Error("Usage : superia worktree <TASK-ID> [--dry-run]");
    const scan = await scanRepository(process.cwd());
    const task = await getTask(scan.root, id);
    const dryRun = args.includes("--dry-run");
    const result = await createWorktree(task, dryRun);
    if (!dryRun) await syncRepositoryToGlobalControl(scan.root);
    console.log(dryRun ? result.command.join(" ") : `Worktree créé : ${result.path}`);
    return;
  }

  printHelp();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Erreur Super IA : ${message}`);
  process.exitCode = 1;
});

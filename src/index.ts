#!/usr/bin/env node
import { initializeProject } from "./core/config.js";
import { inspectLocalTools, inspectProviders } from "./core/doctor.js";
import { scanRepository } from "./core/repository-scanner.js";
import { createTask, getTask, listTasks } from "./core/task-store.js";
import { createWorktree } from "./core/worktree-manager.js";
import { providerCatalog } from "./providers/catalog.js";
import { localToolCatalog } from "./tools/catalog.js";
import { runMatrixConsole } from "./ui/matrix.js";

function printHelp(): void {
  console.log(`Super IA v0.3.0

Usage:
  superia matrix [--once]                Ouvre la console de contrôle Matrix
  superia doctor [--json]                Détecte les IA et outils locaux
  superia providers [--json]             Affiche le catalogue des fournisseurs
  superia local [--json]                 Affiche les outils locaux détectés
  superia scan [--json]                  Analyse le dépôt courant
  superia init                           Initialise .superia/config.json
  superia task create <objectif>         Crée une mission persistante
  superia task list [--json]             Liste les missions
  superia task show <TASK-ID> [--json]   Affiche une mission
  superia worktree <TASK-ID> [--dry-run] Crée son worktree isolé
  superia help                           Affiche cette aide

Principes:
  - aucune fusion automatique sans validation humaine
  - API désactivées par défaut
  - agents d'écriture confinés dans des worktrees Git
  - secrets expurgés avant tout envoi distant
`);
}

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
    console.log(result.created ? `Configuration créée : ${result.path}` : `Configuration déjà présente : ${result.path}`);
    return;
  }

  if (command === "task") {
    const [action, ...taskArgs] = args.filter((arg) => arg !== "--json");
    const scan = await scanRepository(process.cwd());
    if (action === "create") {
      const task = await createTask(scan, taskArgs.join(" "));
      console.log(json ? JSON.stringify(task, null, 2) : `${task.id} créée sur ${task.branchName}`);
      return;
    }
    if (action === "list") {
      const tasks = await listTasks(scan.root);
      if (json) console.log(JSON.stringify(tasks, null, 2));
      else if (!tasks.length) console.log("Aucune mission.");
      else for (const task of tasks) console.log(`${task.id.padEnd(10)} ${task.status.padEnd(10)} ${task.title}`);
      return;
    }
    if (action === "show") {
      const task = await getTask(scan.root, taskArgs[0] ?? "");
      console.log(
        json
          ? JSON.stringify(task, null, 2)
          : `${task.id} — ${task.title}\nStatut : ${task.status}\nBranche : ${task.branchName}\nWorktree : ${task.worktreePath ?? "non créé"}\nChecks : ${task.checks.join(" ; ") || "aucun"}`,
      );
      return;
    }
    throw new Error("Usage : superia task create|list|show");
  }

  if (command === "worktree") {
    const id = args.find((arg) => !arg.startsWith("--"));
    if (!id) throw new Error("Usage : superia worktree <TASK-ID> [--dry-run]");
    const scan = await scanRepository(process.cwd());
    const task = await getTask(scan.root, id);
    const result = await createWorktree(task, args.includes("--dry-run"));
    console.log(args.includes("--dry-run") ? result.command.join(" ") : `Worktree créé : ${result.path}`);
    return;
  }

  printHelp();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Erreur Super IA : ${message}`);
  process.exitCode = 1;
});

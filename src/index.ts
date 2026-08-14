#!/usr/bin/env node
import { initializeProject } from "./core/config.js";
import { inspectProviders } from "./core/doctor.js";
import { providerCatalog } from "./providers/catalog.js";

function printHelp(): void {
  console.log(`Super IA v0.1.0

Usage:
  superia doctor [--json]      Détecte les outils IA et utilitaires installés
  superia providers [--json]   Affiche le catalogue des fournisseurs
  superia init                 Initialise .superia/config.json dans le dépôt courant
  superia help                 Affiche cette aide

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

async function main(): Promise<void> {
  const [command = "help", ...args] = process.argv.slice(2);
  const json = args.includes("--json");

  if (command === "doctor") {
    const checks = await inspectProviders();
    if (json) {
      console.log(JSON.stringify(checks, null, 2));
      return;
    }
    console.log("Super IA — diagnostic des fournisseurs\n");
    for (const item of checks) {
      const state = item.installed === null ? "ASSISTÉ" : item.installed ? "PRÉSENT" : "ABSENT";
      console.log(`${state.padEnd(8)} ${item.name.padEnd(30)} ${item.transport.padEnd(13)} ${item.cost}`);
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

  if (command === "init") {
    const result = await initializeProject(process.cwd());
    console.log(result.created ? `Configuration créée : ${result.path}` : `Configuration déjà présente : ${result.path}`);
    return;
  }

  printHelp();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Erreur Super IA : ${message}`);
  process.exitCode = 1;
});

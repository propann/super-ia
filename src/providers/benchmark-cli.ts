import { providerCatalog } from "./catalog.js";
import {
  benchmarkSummaries,
  listBenchmarks,
  recordBenchmark,
} from "./benchmark-store.js";
import type { RoutingMode } from "./router.js";

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function positionals(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (!["--json", "--success", "--failure"].includes(value)) index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

function mode(value: string | undefined, required = true): RoutingMode | undefined {
  if (!value && !required) return undefined;
  if (value === "plan" || value === "build" || value === "review") return value;
  throw new Error("Mode invalide : plan, build ou review attendu.");
}

function finite(value: string | undefined, label: string, minimum: number, maximum: number): number {
  const parsed = value === undefined ? Number.NaN : Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} invalide : valeur entre ${minimum} et ${maximum} attendue.`);
  }
  return parsed;
}

function integer(value: string | undefined, label: string, minimum: number, maximum: number): number {
  const parsed = finite(value, label, minimum, maximum);
  if (!Number.isInteger(parsed)) throw new Error(`${label} invalide : entier attendu.`);
  return parsed;
}

function assertProvider(id: string | undefined): string {
  if (!id || !providerCatalog.some((provider) => provider.id === id)) {
    throw new Error("Fournisseur inconnu. Utiliser `superia providers` pour afficher les identifiants.");
  }
  return id;
}

export async function handleBenchmarkCommand(
  command: string,
  args: string[],
  asJson: boolean,
): Promise<boolean> {
  if (command !== "benchmark" && command !== "bench") return false;
  const [action = "summary", providerPosition] = positionals(args);

  if (action === "record") {
    const providerId = assertProvider(providerPosition);
    const success = args.includes("--success");
    const failure = args.includes("--failure");
    if (success === failure) throw new Error("Choisir exactement une option : --success ou --failure.");
    const qualityValue = valueAfter(args, "--quality");
    const record = await recordBenchmark({
      providerId,
      mode: mode(valueAfter(args, "--mode")) as RoutingMode,
      success,
      durationMs: integer(valueAfter(args, "--duration-ms"), "duration-ms", 1, 86_400_000),
      costEur: finite(valueAfter(args, "--cost-eur"), "cost-eur", 0, 1_000),
      qualityScore: qualityValue === undefined ? undefined : finite(qualityValue, "quality", 0, 100),
      source: "manual",
    });
    console.log(asJson ? JSON.stringify(record, null, 2) : `Benchmark enregistré : ${record.id}`);
    return true;
  }

  if (action === "list") {
    const records = await listBenchmarks({
      providerId: valueAfter(args, "--provider"),
      mode: mode(valueAfter(args, "--mode"), false),
      limit: valueAfter(args, "--limit") === undefined
        ? 100
        : integer(valueAfter(args, "--limit"), "limit", 1, 1_000),
    });
    if (asJson) console.log(JSON.stringify(records, null, 2));
    else if (!records.length) console.log("Aucun benchmark enregistré.");
    else {
      for (const record of records) {
        console.log(`${record.recordedAt} ${record.providerId.padEnd(25)} ${record.mode.padEnd(6)} ${record.success ? "OK" : "ECHEC"} ${record.durationMs}ms ${record.costEur.toFixed(6)}EUR qualité=${record.qualityScore ?? "-"}`);
      }
    }
    return true;
  }

  if (action === "summary") {
    const providerFilter = valueAfter(args, "--provider");
    const modeFilter = mode(valueAfter(args, "--mode"), false);
    const summaries = (await benchmarkSummaries())
      .filter((summary) => !providerFilter || summary.providerId === providerFilter)
      .filter((summary) => !modeFilter || summary.mode === modeFilter);
    if (asJson) console.log(JSON.stringify(summaries, null, 2));
    else if (!summaries.length) console.log("Aucune mesure disponible.");
    else {
      for (const summary of summaries) {
        console.log(`${summary.providerId.padEnd(25)} ${summary.mode.padEnd(6)} n=${String(summary.sampleCount).padStart(3)} succès=${(summary.successRate * 100).toFixed(1)}% médiane=${summary.medianDurationMs}ms coût=${summary.averageCostEur.toFixed(6)}EUR qualité=${summary.averageQualityScore ?? "-"} ${summary.trustedForRouting ? "ROUTABLE" : "INSUFFISANT"}`);
      }
    }
    return true;
  }

  throw new Error("Usage : superia benchmark record|list|summary");
}

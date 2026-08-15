import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";
import { providerCatalog } from "./catalog.js";
import type {
  BenchmarkRecordInput,
  ProviderBenchmarkRecord,
  ProviderBenchmarkStore,
  ProviderBenchmarkSummary,
} from "./benchmark-types.js";
import type { RoutingMode } from "./router.js";

const MAX_RECORDS = 10_000;
const MIN_ROUTING_SAMPLES = 3;
const MAX_DURATION_MS = 24 * 60 * 60 * 1_000;
const MAX_COST_EUR = 1_000;
const PROVIDER_IDS = new Set(providerCatalog.map((provider) => provider.id));
const MODES = new Set<RoutingMode>(["plan", "build", "review"]);

function missing(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}

function finiteBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function validateRecord(value: unknown, label = "benchmark"): ProviderBenchmarkRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} invalide : objet attendu.`);
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) throw new Error(`${label} invalide : schemaVersion.`);
  if (typeof record.id !== "string" || !/^[0-9a-f-]{36}$/i.test(record.id)) throw new Error(`${label} invalide : id.`);
  if (typeof record.providerId !== "string" || !PROVIDER_IDS.has(record.providerId)) throw new Error(`${label} invalide : providerId.`);
  if (typeof record.mode !== "string" || !MODES.has(record.mode as RoutingMode)) throw new Error(`${label} invalide : mode.`);
  if (typeof record.recordedAt !== "string" || !Number.isFinite(Date.parse(record.recordedAt))) throw new Error(`${label} invalide : recordedAt.`);
  if (typeof record.success !== "boolean") throw new Error(`${label} invalide : success.`);
  if (!Number.isInteger(record.durationMs) || !finiteBetween(record.durationMs, 1, MAX_DURATION_MS)) throw new Error(`${label} invalide : durationMs.`);
  if (!finiteBetween(record.costEur, 0, MAX_COST_EUR)) throw new Error(`${label} invalide : costEur.`);
  if (record.qualityScore !== undefined && !finiteBetween(record.qualityScore, 0, 100)) throw new Error(`${label} invalide : qualityScore.`);
  if (record.source !== "manual" && record.source !== "receipt") throw new Error(`${label} invalide : source.`);
  return record as unknown as ProviderBenchmarkRecord;
}

function validateStore(value: unknown, path: string): ProviderBenchmarkStore {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Registre de benchmarks invalide : ${path}`);
  }
  const store = value as Record<string, unknown>;
  if (store.schemaVersion !== 1 || !Array.isArray(store.records) || store.records.length > MAX_RECORDS) {
    throw new Error(`Registre de benchmarks invalide : ${path}`);
  }
  const ids = new Set<string>();
  const records = store.records.map((record, index) => validateRecord(record, `benchmark ${index + 1}`));
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`Registre de benchmarks invalide : id dupliqué ${record.id}`);
    ids.add(record.id);
  }
  return { schemaVersion: 1, records };
}

async function paths(controlHome?: string): Promise<{ root: string; file: string }> {
  const control = await ensureControlHome(controlHome);
  const root = join(control.root, "providers");
  await mkdir(root, { recursive: true });
  return { root, file: join(root, "benchmarks.json") };
}

async function atomicWrite(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
  await chmod(path, 0o600);
}

export async function loadBenchmarkStore(controlHome?: string): Promise<ProviderBenchmarkStore> {
  const location = await paths(controlHome);
  try {
    const parsed = JSON.parse(await readFile(location.file, "utf8")) as unknown;
    await chmod(location.file, 0o600);
    return validateStore(parsed, location.file);
  } catch (error) {
    if (missing(error)) return { schemaVersion: 1, records: [] };
    throw error;
  }
}

export async function recordBenchmark(
  input: BenchmarkRecordInput,
  controlHome?: string,
  now: () => Date = () => new Date(),
): Promise<ProviderBenchmarkRecord> {
  const location = await paths(controlHome);
  const current = await loadBenchmarkStore(controlHome);
  if (current.records.length >= MAX_RECORDS) {
    throw new Error(`Limite de ${MAX_RECORDS} benchmarks atteinte. Exporter puis nettoyer explicitement le registre.`);
  }
  const record = validateRecord({
    schemaVersion: 1,
    id: randomUUID(),
    providerId: input.providerId,
    mode: input.mode,
    recordedAt: now().toISOString(),
    success: input.success,
    durationMs: input.durationMs,
    costEur: input.costEur,
    qualityScore: input.qualityScore,
    source: input.source ?? "manual",
  });
  await atomicWrite(location.file, { schemaVersion: 1, records: [...current.records, record] });
  return record;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function rounded(value: number, decimals = 4): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

export function summarizeBenchmarks(records: ProviderBenchmarkRecord[]): ProviderBenchmarkSummary[] {
  const groups = new Map<string, ProviderBenchmarkRecord[]>();
  for (const record of records) {
    const key = `${record.providerId}:${record.mode}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.values()].map((group) => {
    const first = group[0];
    const quality = group.flatMap((record) => record.qualityScore === undefined ? [] : [record.qualityScore]);
    const successCount = group.filter((record) => record.success).length;
    return {
      providerId: first.providerId,
      mode: first.mode,
      sampleCount: group.length,
      successCount,
      successRate: rounded(successCount / group.length),
      medianDurationMs: rounded(median(group.map((record) => record.durationMs)), 2),
      averageCostEur: rounded(average(group.map((record) => record.costEur)), 6),
      qualitySampleCount: quality.length,
      averageQualityScore: quality.length ? rounded(average(quality), 2) : undefined,
      trustedForRouting: group.length >= MIN_ROUTING_SAMPLES,
    };
  }).sort((left, right) => left.providerId.localeCompare(right.providerId) || left.mode.localeCompare(right.mode));
}

export async function benchmarkSummaries(controlHome?: string): Promise<ProviderBenchmarkSummary[]> {
  return summarizeBenchmarks((await loadBenchmarkStore(controlHome)).records);
}

export function benchmarkSummaryMap(summaries: ProviderBenchmarkSummary[]): Record<string, ProviderBenchmarkSummary> {
  return Object.fromEntries(summaries.map((summary) => [`${summary.providerId}:${summary.mode}`, summary]));
}

export async function listBenchmarks(
  options: { providerId?: string; mode?: RoutingMode; limit?: number } = {},
  controlHome?: string,
): Promise<ProviderBenchmarkRecord[]> {
  const limit = Math.min(1_000, Math.max(1, Math.floor(options.limit ?? 100)));
  return (await loadBenchmarkStore(controlHome)).records
    .filter((record) => !options.providerId || record.providerId === options.providerId)
    .filter((record) => !options.mode || record.mode === options.mode)
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
    .slice(0, limit);
}

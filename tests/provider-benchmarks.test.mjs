import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  benchmarkSummaries,
  listBenchmarks,
  loadBenchmarkStore,
  recordBenchmark,
} from "../dist/providers/benchmark-store.js";

async function withHome(fn) {
  const home = await mkdtemp(join(tmpdir(), "superia-benchmark-"));
  try {
    await fn(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

test("benchmark store is private bounded and summarized after three samples", async () => {
  await withHome(async (home) => {
    const inputs = [
      { success: true, durationMs: 1_000, costEur: 0.1, qualityScore: 90 },
      { success: false, durationMs: 3_000, costEur: 0.2, qualityScore: 70 },
      { success: true, durationMs: 2_000, costEur: 0, qualityScore: 80 },
    ];
    for (let index = 0; index < inputs.length; index += 1) {
      await recordBenchmark({
        providerId: "codex-cli",
        mode: "plan",
        source: "manual",
        ...inputs[index],
      }, home, () => new Date(`2026-08-15T00:00:0${index}.000Z`));
    }

    const path = join(home, "providers", "benchmarks.json");
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    const raw = await readFile(path, "utf8");
    assert.equal(raw.includes("prompt"), false);
    assert.equal(raw.includes("response"), false);
    assert.equal(raw.includes("secret"), false);

    const store = await loadBenchmarkStore(home);
    assert.equal(store.records.length, 3);
    assert.deepEqual((await listBenchmarks({ limit: 2 }, home)).map((record) => record.durationMs), [2_000, 3_000]);

    const [summary] = await benchmarkSummaries(home);
    assert.equal(summary.providerId, "codex-cli");
    assert.equal(summary.mode, "plan");
    assert.equal(summary.sampleCount, 3);
    assert.equal(summary.successCount, 2);
    assert.equal(summary.successRate, 0.6667);
    assert.equal(summary.medianDurationMs, 2_000);
    assert.equal(summary.averageCostEur, 0.1);
    assert.equal(summary.averageQualityScore, 80);
    assert.equal(summary.trustedForRouting, true);
  });
});

test("two samples stay informational and cannot be trusted for routing", async () => {
  await withHome(async (home) => {
    for (let index = 0; index < 2; index += 1) {
      await recordBenchmark({
        providerId: "mistral-vibe",
        mode: "review",
        success: true,
        durationMs: 500,
        costEur: 0.01,
        qualityScore: 100,
      }, home);
    }
    const [summary] = await benchmarkSummaries(home);
    assert.equal(summary.sampleCount, 2);
    assert.equal(summary.trustedForRouting, false);
  });
});

test("invalid benchmark files fail closed and are never overwritten", async () => {
  await withHome(async (home) => {
    const directory = join(home, "providers");
    const path = join(directory, "benchmarks.json");
    await mkdir(directory, { recursive: true });
    await writeFile(path, "{not-json\n", { encoding: "utf8", mode: 0o600 });

    await assert.rejects(loadBenchmarkStore(home));
    await assert.rejects(recordBenchmark({
      providerId: "codex-cli",
      mode: "plan",
      success: true,
      durationMs: 1_000,
      costEur: 0,
    }, home));
    assert.equal(await readFile(path, "utf8"), "{not-json\n");
  });
});

test("benchmark validation rejects unknown providers and unsafe numeric values", async () => {
  await withHome(async (home) => {
    await assert.rejects(recordBenchmark({
      providerId: "unknown-provider",
      mode: "plan",
      success: true,
      durationMs: 1_000,
      costEur: 0,
    }, home), /providerId/);
    await assert.rejects(recordBenchmark({
      providerId: "codex-cli",
      mode: "plan",
      success: true,
      durationMs: 0,
      costEur: 0,
    }, home), /durationMs/);
    await assert.rejects(recordBenchmark({
      providerId: "codex-cli",
      mode: "plan",
      success: true,
      durationMs: 1_000,
      costEur: -1,
    }, home), /costEur/);
  });
});

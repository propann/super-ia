import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildResticBackupInvocation,
  buildResticCheckInvocation,
  buildResticRetentionPreview,
  defaultResticConfig,
  ensureResticConfig,
  inspectRestic,
  runResticRetentionPreview,
  validateResticConfig,
} from "../dist/control/restic.js";

test("Restic config is private and stores references, never secret values", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-restic-config-"));
  try {
    const result = await ensureResticConfig(root);
    assert.equal(result.created, true);
    assert.equal((await stat(result.path)).mode & 0o777, 0o600);
    const content = await readFile(result.path, "utf8");
    assert.match(content, /RESTIC_REPOSITORY/);
    assert.match(content, /RESTIC_PASSWORD_FILE/);
    assert.doesNotMatch(content, /password\s*:/i);
    assert.doesNotMatch(content, /secret-value/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Restic plans are bounded, non-destructive and contain no secret material", () => {
  const backup = buildResticBackupInvocation(defaultResticConfig, "/tmp/backup-safe");
  assert.equal(backup.destructive, false);
  assert.equal(backup.requiresNetwork, true);
  assert.deepEqual(backup.requiredEnvironment, ["RESTIC_REPOSITORY", "RESTIC_PASSWORD_FILE"]);
  assert.equal(backup.args.includes("--json"), true);

  const retention = buildResticRetentionPreview(defaultResticConfig);
  assert.equal(retention.destructive, false);
  assert.equal(retention.args.includes("--dry-run"), true);
  assert.equal(retention.args.includes("--prune"), false);
  assert.equal(retention.args.includes("7"), true);
  assert.equal(retention.args.includes("12"), true);

  const check = buildResticCheckInvocation(defaultResticConfig);
  assert.deepEqual(check.args, ["check", "--read-data-subset=5%"]);
  const serialized = JSON.stringify({ backup, retention, check });
  assert.doesNotMatch(serialized, /actual-password|actual-repository/);
});

test("Restic inspection reports only booleans and executable path", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-restic-inspect-"));
  try {
    const result = await inspectRestic(
      root,
      { RESTIC_REPOSITORY: "actual-repository", RESTIC_PASSWORD_FILE: "/secret/password-file" },
      async () => "/usr/bin/restic",
    );
    assert.equal(result.ready, true);
    assert.equal(result.secretValuesRead, false);
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /actual-repository/);
    assert.doesNotMatch(serialized, /secret\/password-file/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Restic real execution requires explicit network permission", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-restic-network-"));
  let calls = 0;
  try {
    const preview = await runResticRetentionPreview({
      root,
      execute: false,
      network: false,
      executor: async () => { calls += 1; return { stdout: "", stderr: "" }; },
    });
    assert.equal(preview.executed, false);
    assert.equal(calls, 0);

    await assert.rejects(
      () => runResticRetentionPreview({
        root,
        execute: true,
        network: false,
        env: { RESTIC_REPOSITORY: "repo", RESTIC_PASSWORD_FILE: "/tmp/password" },
        executor: async () => { calls += 1; return { stdout: "", stderr: "" }; },
      }),
      /exige --network/,
    );
    assert.equal(calls, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Restic configuration rejects unsafe or unbounded policy values", () => {
  assert.throws(() => validateResticConfig({ ...defaultResticConfig, repositoryEnv: "OTHER_REPOSITORY" }), /RESTIC_REPOSITORY/);
  assert.throws(() => validateResticConfig({ ...defaultResticConfig, passwordFileEnv: "RESTIC_PASSWORD" }), /RESTIC_PASSWORD_FILE/);
  assert.throws(() => validateResticConfig({ ...defaultResticConfig, checkDataSubset: "0%" }), /pourcentage|compris/);
  assert.throws(() => validateResticConfig({ ...defaultResticConfig, retention: { ...defaultResticConfig.retention, daily: -1 } }), /retention.daily/);
});

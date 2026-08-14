import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openControlPlane } from "../dist/control/control-plane.js";
import { createControlBackup, listControlBackups, verifyControlBackup } from "../dist/control/backup-manager.js";

function scan(root) {
  return {
    root,
    name: "backup-demo",
    isGitRepository: true,
    branch: "main",
    dirty: false,
    manifests: [],
    languages: ["TypeScript"],
    instructions: [],
    scripts: {},
    recommendedChecks: [],
  };
}

test("control backup is consistent, listed and verifiable", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-backup-"));
  try {
    const control = await openControlPlane(home);
    control.registerProject(scan("/srv/git/backup-demo"));
    control.close();

    const backup = await createControlBackup(home, () => new Date("2026-08-14T22:00:00.000Z"));
    const verification = await verifyControlBackup(backup.directory);
    assert.equal(verification.valid, true);
    assert.deepEqual(await listControlBackups(home), [backup.manifest.id]);

    await writeFile(join(backup.directory, "events.jsonl"), "corruption\n", "utf8");
    const corrupted = await verifyControlBackup(backup.directory);
    assert.equal(corrupted.valid, false);
    assert.ok(corrupted.errors.some((error) => error.includes("events.jsonl")));
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

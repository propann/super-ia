import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createControlBackup, listControlBackups, verifyControlBackup } from "../dist/control/backup-manager.js";
import { openControlPlane } from "../dist/control/control-plane.js";
import { saveNotificationConfig, saveNotificationState } from "../dist/notifications/store.js";
import { engageEmergencyStop } from "../dist/safety/store.js";

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

test("control backup is consistent, private, listed and verifiable", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-backup-"));
  try {
    const control = await openControlPlane(home);
    control.registerProject(scan("/srv/git/backup-demo"));
    control.close();
    await engageEmergencyStop("maintenance", home);
    await saveNotificationConfig({
      schemaVersion: 1,
      enabled: true,
      stdout: false,
      notifyRuns: true,
      notifyBlockedTasks: false,
    }, home);
    await saveNotificationState({ schemaVersion: 1, lastEventId: 42 }, home);

    const backup = await createControlBackup(home, () => new Date("2026-08-14T22:00:00.000Z"));
    const names = backup.manifest.files.map((file) => file.name).sort();
    assert.deepEqual(names, [
      "control.sqlite",
      "emergency-stop.json",
      "events.jsonl",
      "notifications-config.json",
      "notifications-state.json",
    ]);
    for (const name of [...names, "MANIFEST.json"]) {
      assert.equal((await stat(join(backup.directory, name))).mode & 0o777, 0o600);
    }
    assert.equal(JSON.parse(await readFile(join(backup.directory, "emergency-stop.json"), "utf8")).engaged, true);
    assert.equal(JSON.parse(await readFile(join(backup.directory, "notifications-state.json"), "utf8")).lastEventId, 42);

    const verification = await verifyControlBackup(backup.directory);
    assert.equal(verification.valid, true);
    assert.deepEqual(await listControlBackups(home), [backup.manifest.id]);

    await writeFile(join(backup.directory, "emergency-stop.json"), "corruption\n", "utf8");
    const corrupted = await verifyControlBackup(backup.directory);
    assert.equal(corrupted.valid, false);
    assert.ok(corrupted.errors.some((error) => error.includes("emergency-stop.json")));
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

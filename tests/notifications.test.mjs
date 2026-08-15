import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openControlPlane } from "../dist/control/control-plane.js";
import { processNotifications } from "../dist/notifications/engine.js";
import {
  listNotificationRecords,
  loadNotificationConfig,
  loadNotificationState,
  notificationPaths,
} from "../dist/notifications/store.js";

function scan(root) {
  return {
    root,
    name: "notify-demo",
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

test("notifications are local, deduplicated and never copy event metadata", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-notify-home-"));
  const root = await mkdtemp(join(tmpdir(), "superia-notify-project-"));
  try {
    const control = await openControlPlane(home);
    const project = control.registerProject(scan(root));
    await loadNotificationState(control.listEvents(1)[0]?.id ?? 0, home);

    control.syncTasks(project.id, [{
      id: "TASK-0001",
      title: "secret sk-notification-test-12345678901234567890",
      goal: "ghp_abcdefghijklmnopqrstuvwxyz1234567890",
      status: "blocked",
      branchName: "agent/task-0001",
      checks: [],
      notes: ["private note"],
      createdAt: "2026-08-15T00:00:00.000Z",
      updatedAt: "2026-08-15T00:01:00.000Z",
    }]);
    const run = control.createRun({
      projectId: project.id,
      taskId: "TASK-0001",
      provider: "codex-cli",
      metadata: { secret: "sk-run-secret-abcdefghijklmnopqrstuvwxyz" },
    });
    control.finishRun(run.id, "failed", { diagnostic: "ghp_hidden_secret_abcdefghijklmnopqrstuvwxyz" });

    const first = await processNotifications(control);
    assert.equal(first.created, 2);
    assert.equal(first.blockedTasksSeen, 1);

    const second = await processNotifications(control);
    assert.equal(second.created, 0);
    assert.equal(second.duplicates, 1);

    const records = await listNotificationRecords(10, home);
    assert.equal(records.length, 2);
    assert.deepEqual(new Set(records.map((record) => record.kind)), new Set(["run", "task"]));
    const serialized = JSON.stringify(records);
    assert.doesNotMatch(serialized, /sk-notification|ghp_|private note|diagnostic|metadata/i);
    assert.match(serialized, /TASK-0001/);
    assert.match(serialized, /codex-cli/);

    const paths = await notificationPaths(home);
    assert.equal((await stat(paths.config)).mode & 0o777, 0o600);
    assert.equal((await stat(paths.state)).mode & 0o777, 0o600);
    control.close();
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid notification configuration fails closed and is preserved", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-notify-invalid-"));
  try {
    await loadNotificationConfig(home);
    const paths = await notificationPaths(home);
    await writeFile(paths.config, "{invalid-json\n", "utf8");
    await assert.rejects(() => loadNotificationConfig(home));
    assert.equal(await readFile(paths.config, "utf8"), "{invalid-json\n");
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

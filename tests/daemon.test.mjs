import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { openControlPlane } from "../dist/control/control-plane.js";
import { runDaemonTick } from "../dist/control/daemon.js";
import { listNotificationRecords } from "../dist/notifications/store.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

test("daemon synchronizes projects, recovers stale runs and creates a local notice", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-daemon-"));
  const root = join(parent, "repo");
  const home = join(parent, "home");
  const oldHome = process.env.SUPERIA_HOME;
  await git(parent, "init", "-b", "main", root);
  await writeFile(join(root, "README.md"), "# daemon demo\n");
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");

  try {
    process.env.SUPERIA_HOME = home;
    const scan = await scanRepository(root);
    const control = await openControlPlane(home, { now: () => new Date("2000-01-01T00:00:00.000Z") });
    const project = control.registerProject(scan);
    const run = control.createRun({ projectId: project.id, provider: "codex-cli" });
    control.close();

    const result = await runDaemonTick(1_000);
    assert.equal(result.projectsSeen, 1);
    assert.equal(result.projectsSynced, 1);
    assert.equal(result.projectsFailed, 0);
    assert.equal(result.recoveredRuns, 1);
    assert.equal(result.notificationsCreated, 1);
    assert.equal(result.notificationError, undefined);

    const reopened = await openControlPlane(home);
    assert.equal(reopened.getRun(run.id).status, "interrupted");
    reopened.close();
    const status = JSON.parse(await readFile(join(home, "daemon-status.json"), "utf8"));
    assert.equal(status.projectsSynced, 1);
    assert.equal(status.notificationsCreated, 1);
    const notifications = await listNotificationRecords(10, home);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].runId, run.id);
    assert.equal(notifications[0].level, "warning");
  } finally {
    if (oldHome === undefined) delete process.env.SUPERIA_HOME;
    else process.env.SUPERIA_HOME = oldHome;
    await rm(parent, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { createTask } from "../dist/core/task-store.js";
import { syncRepositoryToGlobalControl } from "../dist/control/repository-sync.js";
import { runAgentSecurityPreflight } from "../dist/agents/security-preflight.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

test("explicit Gitleaks waiver is visible and journaled", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-waiver-"));
  const root = join(parent, "repo");
  const home = join(parent, "home");
  const oldHome = process.env.SUPERIA_HOME;
  try {
    await git(parent, "init", "-b", "main", root);
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await writeFile(join(root, "README.md"), "# waiver\n");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "init");
    process.env.SUPERIA_HOME = home;

    const scan = await scanRepository(root);
    const task = await createTask(scan, "Tester une dérogation explicite");
    const synchronized = await syncRepositoryToGlobalControl(root);
    const result = await runAgentSecurityPreflight({
      cwd: root,
      projectId: synchronized.project.id,
      taskId: task.id,
      provider: "codex-cli",
      allowWithoutGitleaks: true,
    });

    assert.equal(result.status, "waived");
    assert.match(result.reason, /dérogation/i);
    const journal = await readFile(join(home, "events", "events.jsonl"), "utf8");
    assert.match(journal, /security\.preflight\.waived/);
    assert.match(journal, /allow-without-gitleaks/);
    assert.match(journal, /codex-cli/);
  } finally {
    if (oldHome === undefined) delete process.env.SUPERIA_HOME;
    else process.env.SUPERIA_HOME = oldHome;
    await rm(parent, { recursive: true, force: true });
  }
});

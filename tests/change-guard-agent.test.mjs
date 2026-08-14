import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { createTask, updateTask } from "../dist/core/task-store.js";
import { createWorktree } from "../dist/core/worktree-manager.js";
import { executeCodexTask } from "../dist/agents/executor.js";
import { openControlPlane } from "../dist/control/control-plane.js";

const execFileAsync = promisify(execFile);
async function git(cwd, ...args) { await execFileAsync("git", args, { cwd }); }

async function writeFakeGitleaks(path) {
  await writeFile(path, `#!/bin/sh
report=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--report-path" ]; then shift; report="$1"; fi
  shift
done
printf '%s\n' '[]' > "$report"
`);
  await chmod(path, 0o755);
}

async function writeFakeBubblewrap(path) {
  await writeFile(path, `#!/bin/sh
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--" ]; then shift; exec "$@"; fi
  shift
done
exit 97
`);
  await chmod(path, 0o755);
}

test("Codex build is failed when it modifies a file outside allowed paths", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-agent-change-guard-"));
  const root = join(parent, "repo");
  const home = join(parent, "home");
  const bin = join(parent, "bin");
  const oldPath = process.env.PATH;
  const oldHome = process.env.SUPERIA_HOME;
  await git(parent, "init", "-b", "main", root);
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(bin, { recursive: true });
  await writeFile(join(root, ".gitignore"), ".superia/\n");
  await writeFile(join(root, "README.md"), "# Initial\n");
  await writeFile(join(root, "src", "app.ts"), "export const value = 1;\n");
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");

  const fakeCodex = join(bin, "codex");
  await writeFile(fakeCodex, `#!/bin/sh
output=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output-last-message" ]; then shift; output="$1"; fi
  shift
done
cat >/dev/null
printf '%s\n' 'export const value = 2;' > src/app.ts
printf '%s\n' '# Modified outside scope' > README.md
printf '%s\n' '{"type":"item.completed","item":{"type":"agent_message"}}'
printf '%s\n' '# Build completed' > "$output"
`);
  await chmod(fakeCodex, 0o755);
  await writeFakeGitleaks(join(bin, "gitleaks"));
  await writeFakeBubblewrap(join(bin, "bwrap"));

  try {
    process.env.PATH = `${bin}${delimiter}${oldPath ?? ""}`;
    process.env.SUPERIA_HOME = home;
    const scan = await scanRepository(root);
    const created = await createTask(scan, "Modifier uniquement src/app.ts");
    const scoped = await updateTask(root, created.id, { allowedPaths: ["src/**"] });
    await createWorktree(scoped);

    const result = await executeCodexTask(root, scoped.id, { mode: "build", timeoutMs: 10_000 });
    assert.ok("process" in result);
    assert.equal(result.process.status, "failed");
    assert.equal(result.changeGuard.passed, false);
    assert.deepEqual(result.changeGuard.changedFiles, ["README.md", "src/app.ts"]);
    assert.deepEqual(result.changeGuard.outOfScopeFiles, ["README.md"]);
    assert.match(await readFile(result.changeGuard.diffPath, "utf8"), /Modified outside scope/);
    const stored = JSON.parse(await readFile(join(result.context.directory, "AGENT_RESULT.json"), "utf8"));
    assert.equal(stored.status, "failed");
    assert.deepEqual(stored.changeGuard.outOfScopeFiles, ["README.md"]);

    const control = await openControlPlane();
    try {
      assert.equal(control.getRun(result.process.runId).status, "failed");
    } finally {
      control.close();
    }
  } finally {
    process.env.PATH = oldPath;
    if (oldHome === undefined) delete process.env.SUPERIA_HOME;
    else process.env.SUPERIA_HOME = oldHome;
    await rm(parent, { recursive: true, force: true });
  }
});

test("build mode is refused before launch when no allowed path is declared", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-agent-no-scope-"));
  const root = join(parent, "repo");
  try {
    await git(parent, "init", "-b", "main", root);
    await writeFile(join(root, ".gitignore"), ".superia/\n");
    await writeFile(join(root, "README.md"), "# Initial\n");
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "init");
    const scan = await scanRepository(root);
    const task = await createTask(scan, "Build sans périmètre");
    await createWorktree(task);
    await assert.rejects(
      () => executeCodexTask(root, task.id, { mode: "build", dryRun: true }),
      /--allow-path/,
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

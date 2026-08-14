import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { createTask } from "../dist/core/task-store.js";
import { executeVibeTask } from "../dist/agents/vibe-executor.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

async function writeFakeGitleaks(path) {
  await writeFile(path, `#!/bin/sh
report=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--report-path" ]; then
    shift
    report="$1"
  fi
  shift
done
printf '%s\n' '[]' > "$report"
`);
  await chmod(path, 0o755);
}

test("Vibe adapter forces safe programmatic mode after a clean Gitleaks preflight", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-vibe-"));
  const root = join(parent, "repo");
  const home = join(parent, "home");
  const bin = join(parent, "bin");
  const oldPath = process.env.PATH;
  const oldHome = process.env.SUPERIA_HOME;
  await git(parent, "init", "-b", "main", root);
  await mkdir(bin, { recursive: true });
  await writeFile(join(root, ".gitignore"), ".superia/\n");
  await writeFile(join(root, "README.md"), "# Fake Vibe project\n");
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");

  const fakeVibe = join(bin, "vibe");
  await writeFile(fakeVibe, `#!/bin/sh
cat >/dev/null
printf '%s\n' '{"type":"assistant","content":"fake-vibe-completed"}'
`);
  await chmod(fakeVibe, 0o755);
  await writeFakeGitleaks(join(bin, "gitleaks"));

  try {
    process.env.PATH = `${bin}${delimiter}${oldPath ?? ""}`;
    process.env.SUPERIA_HOME = home;
    const scan = await scanRepository(root);
    const task = await createTask(scan, "Analyser le dépôt avec Vibe sans shell");

    const result = await executeVibeTask(root, task.id, { mode: "plan", timeoutMs: 10_000 });
    assert.ok("process" in result);
    assert.equal(result.process.status, "completed");
    assert.equal(result.securityPreflight.status, "passed");
    assert.equal(result.securityPreflight.findings, 0);
    assert.ok(result.securityPreflight.reportPath);
    assert.equal(result.parsedEvents, 1);
    assert.equal(result.invalidEventLines, 0);
    assert.equal(result.args[result.args.indexOf("--prompt") + 1], "");
    assert.ok(result.args.includes("--trust"));
    assert.equal(result.args[result.args.indexOf("--agent") + 1], "plan");
    assert.equal(result.args[result.args.indexOf("--disabled-tools") + 1], "bash*");
    assert.equal(result.args[result.args.indexOf("--max-price") + 1], "0.25");
    assert.ok(!result.args.includes("--auto-approve"));
    assert.ok(!result.args.includes("--yolo"));
    assert.match(await readFile(result.lastMessagePath, "utf8"), /fake-vibe-completed/);

    await assert.rejects(
      () => executeVibeTask(root, task.id, { mode: "build", dryRun: true }),
      /worktree/,
    );
  } finally {
    process.env.PATH = oldPath;
    if (oldHome === undefined) delete process.env.SUPERIA_HOME;
    else process.env.SUPERIA_HOME = oldHome;
    await rm(parent, { recursive: true, force: true });
  }
});

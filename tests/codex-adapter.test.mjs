import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanRepository } from "../dist/core/repository-scanner.js";
import { createTask } from "../dist/core/task-store.js";
import { executeCodexTask } from "../dist/agents/executor.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

async function writeFakeGitleaks(path, findings = [], exitCode = 0) {
  await writeFile(path, `#!/bin/sh
report=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--report-path" ]; then
    shift
    report="$1"
  fi
  shift
done
printf '%s\n' '${JSON.stringify(findings)}' > "$report"
exit ${exitCode}
`);
  await chmod(path, 0o755);
}

async function writeFakeBubblewrap(path, argumentsPath) {
  await writeFile(path, `#!/bin/sh
printf '%s\n' "$@" > ${JSON.stringify(argumentsPath)}
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--" ]; then
    shift
    exec "$@"
  fi
  shift
done
exit 97
`);
  await chmod(path, 0o755);
}

test("Codex requires clean Gitleaks and an active Bubblewrap policy before launch", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-codex-"));
  const root = join(parent, "repo");
  const home = join(parent, "home");
  const bin = join(parent, "bin");
  const marker = join(parent, "codex-launches.txt");
  const bwrapArguments = join(parent, "bwrap-args.txt");
  const oldPath = process.env.PATH;
  const oldHome = process.env.SUPERIA_HOME;
  await git(parent, "init", "-b", "main", root);
  await mkdir(bin, { recursive: true });
  await writeFile(join(root, ".gitignore"), ".superia/\n");
  await writeFile(join(root, "README.md"), "# Fake Codex project\n");
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }));
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");

  const fakeCodex = join(bin, "codex");
  await writeFile(fakeCodex, `#!/bin/sh
printf 'launch\n' >> ${JSON.stringify(marker)}
output=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output-last-message" ]; then
    shift
    output="$1"
  fi
  shift
done
cat >/dev/null
printf '%s\n' '{"type":"thread.started","thread_id":"fake-thread"}'
printf '%s\n' '# Fake Codex completed' > "$output"
`);
  await chmod(fakeCodex, 0o755);
  const fakeGitleaks = join(bin, "gitleaks");
  await writeFakeGitleaks(fakeGitleaks);
  await writeFakeBubblewrap(join(bin, "bwrap"), bwrapArguments);

  try {
    process.env.PATH = `${bin}${delimiter}${oldPath ?? ""}`;
    process.env.SUPERIA_HOME = home;
    const scan = await scanRepository(root);
    const task = await createTask(scan, "Analyser le dépôt sans modifier les fichiers");

    const result = await executeCodexTask(root, task.id, { mode: "plan", timeoutMs: 10_000 });
    assert.ok("process" in result);
    assert.equal(result.process.status, "completed");
    assert.equal(result.securityPreflight.status, "passed");
    assert.equal(result.sandboxPreflight.status, "active");
    assert.equal(result.sandboxPreflight.workspaceAccess, "read-only");
    assert.equal(result.process.sandbox?.engine, "bubblewrap");
    assert.equal(result.process.sandbox?.ephemeralHome, true);
    assert.equal(result.securityPreflight.findings, 0);
    assert.ok(result.securityPreflight.reportPath);
    assert.equal(result.parsedEvents, 1);
    assert.equal(result.invalidEventLines, 0);
    assert.ok(result.args.includes("read-only"));
    assert.ok(!result.args.includes("--dangerously-bypass-approvals-and-sandbox"));
    assert.match(await readFile(result.lastMessagePath, "utf8"), /Fake Codex completed/);
    assert.equal(JSON.parse(await readFile(result.normalizedEventsPath, "utf8"))[0].thread_id, "fake-thread");
    assert.equal((await readFile(marker, "utf8")).trim().split(/\r?\n/).length, 1);

    const bwrap = await readFile(bwrapArguments, "utf8");
    assert.match(bwrap, /--new-session/);
    assert.match(bwrap, /--disable-userns/);
    assert.match(bwrap, /--clearenv/);
    assert.match(bwrap, /--ro-bind/);
    assert.match(bwrap, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(bwrap, /--unshare-net/);

    await writeFakeGitleaks(fakeGitleaks, [{ RuleID: "test-secret", File: "README.md" }], 1);
    const blockedTask = await createTask(scan, "Ce run doit être bloqué avant Codex");
    await assert.rejects(
      () => executeCodexTask(root, blockedTask.id, { mode: "plan", timeoutMs: 10_000 }),
      /Préflight de sécurité refusé/,
    );
    assert.equal((await readFile(marker, "utf8")).trim().split(/\r?\n/).length, 1);

    await assert.rejects(
      () => executeCodexTask(root, task.id, { mode: "build", dryRun: true }),
      /worktree/,
    );
  } finally {
    process.env.PATH = oldPath;
    if (oldHome === undefined) delete process.env.SUPERIA_HOME;
    else process.env.SUPERIA_HOME = oldHome;
    await rm(parent, { recursive: true, force: true });
  }
});

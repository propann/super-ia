import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runGitleaksScan } from "../dist/security/gitleaks.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

async function fakeScanner(parent, name, findings, exitCode) {
  const path = join(parent, name);
  const source = `#!/usr/bin/env node\nconst fs = require("node:fs");\nconst i = process.argv.indexOf("--report-path");\nfs.writeFileSync(process.argv[i + 1], ${JSON.stringify(`${JSON.stringify(findings)}\n`)});\nconsole.log("fake gitleaks");\nprocess.exit(${exitCode});\n`;
  await writeFile(path, source);
  await chmod(path, 0o755);
  return path;
}

test("Gitleaks integration records clean and leaking scans", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-gitleaks-"));
  const root = join(parent, "repo");
  const home = join(parent, "home");
  const previousHome = process.env.SUPERIA_HOME;
  try {
    await git(parent, "init", "-b", "main", root);
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await writeFile(join(root, "README.md"), "# security\n");
    await git(root, "add", ".");
    await git(root, "commit", "-m", "init");
    process.env.SUPERIA_HOME = home;

    const cleanCommand = await fakeScanner(parent, "gitleaks-clean.cjs", [], 0);
    const clean = await runGitleaksScan(root, { command: cleanCommand, required: true });
    assert.equal(clean.available, true);
    assert.equal(clean.passed, true);
    assert.equal(clean.findings.length, 0);
    assert.equal(clean.process.status, "completed");

    const finding = [{ RuleID: "test-secret", File: "README.md", StartLine: 1, Fingerprint: "demo" }];
    const leakingCommand = await fakeScanner(parent, "gitleaks-leak.cjs", finding, 1);
    const leaking = await runGitleaksScan(root, { command: leakingCommand, required: true });
    assert.equal(leaking.available, true);
    assert.equal(leaking.passed, false);
    assert.equal(leaking.findings.length, 1);
    assert.equal(leaking.process.status, "failed");
  } finally {
    if (previousHome === undefined) delete process.env.SUPERIA_HOME;
    else process.env.SUPERIA_HOME = previousHome;
    await rm(parent, { recursive: true, force: true });
  }
});

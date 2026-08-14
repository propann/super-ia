import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareAgentSandbox } from "../dist/agents/sandbox-preflight.js";
import { prepareSandboxInvocation } from "../dist/security/sandbox.js";

function containsSequence(values, ...sequence) {
  return values.some((_, index) => sequence.every((value, offset) => values[index + offset] === value));
}

test("Bubblewrap policy uses an ephemeral HOME and limits workspace access", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-sandbox-"));
  const workspace = join(parent, "workspace");
  const state = join(parent, "provider-state");
  const bin = join(parent, "bin");
  const command = join(bin, "agent");
  const controlHome = join(parent, "control");
  await Promise.all([
    mkdir(workspace, { recursive: true }),
    mkdir(state, { recursive: true }),
    mkdir(bin, { recursive: true }),
    mkdir(controlHome, { recursive: true }),
  ]);
  await writeFile(command, "#!/bin/sh\nexit 0\n");

  try {
    const prepared = await prepareSandboxInvocation({
      projectId: "project",
      provider: "test-agent",
      command,
      args: ["--check"],
      cwd: workspace,
      sandbox: {
        engine: "bubblewrap",
        executable: "/usr/bin/bwrap",
        network: "isolated",
        workspaceAccess: "read-only",
        statePaths: [state],
      },
    }, {
      PATH: bin,
      HOME: "/home/real-user",
      SUPERIA_RUN: "1",
    }, controlHome);

    assert.equal(prepared.command, "/usr/bin/bwrap");
    assert.equal(prepared.env.HOME, "/home/superia");
    assert.equal(prepared.env.TMPDIR, "/tmp");
    assert.equal(prepared.env.SUPERIA_SANDBOX, "bubblewrap");
    assert.equal(prepared.summary?.active, true);
    assert.equal(prepared.summary?.network, "isolated");
    assert.equal(prepared.summary?.workspaceAccess, "read-only");
    assert.ok(prepared.args.includes("--new-session"));
    assert.ok(prepared.args.includes("--disable-userns"));
    assert.ok(prepared.args.includes("--unshare-net"));
    assert.ok(prepared.args.includes("--clearenv"));
    assert.ok(containsSequence(prepared.args, "--ro-bind", workspace, workspace));
    assert.ok(containsSequence(prepared.args, "--bind", state, state));
    assert.ok(containsSequence(prepared.args, "--chdir", workspace));
    assert.ok(containsSequence(prepared.args, "--", command, "--check"));
    assert.ok(!prepared.args.includes("/home/real-user"));

    await prepared.cleanup();
    assert.deepEqual(await readdir(join(controlHome, "sandboxes")), []);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("missing Bubblewrap blocks agents unless an explicit waiver is journaled", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-sandbox-waiver-"));
  const emptyPath = join(parent, "empty-bin");
  const home = join(parent, "home");
  const oldPath = process.env.PATH;
  const oldHome = process.env.SUPERIA_HOME;
  await mkdir(emptyPath, { recursive: true });
  try {
    process.env.PATH = emptyPath;
    process.env.SUPERIA_HOME = home;
    await assert.rejects(
      () => prepareAgentSandbox({
        projectId: "project",
        taskId: "TASK-0001",
        provider: "codex-cli",
        mode: "plan",
      }),
      /Préflight sandbox refusé/,
    );

    const waived = await prepareAgentSandbox({
      projectId: "project",
      taskId: "TASK-0001",
      provider: "codex-cli",
      mode: "plan",
      allowWithoutBubblewrap: true,
    });
    assert.equal(waived.preflight.status, "waived");
    assert.equal(waived.sandbox, undefined);
    const journal = await readFile(join(home, "events", "events.jsonl"), "utf8");
    assert.match(journal, /sandbox\.preflight\.waived/);
    assert.match(journal, /allow-without-bwrap/);
  } finally {
    process.env.PATH = oldPath;
    if (oldHome === undefined) delete process.env.SUPERIA_HOME;
    else process.env.SUPERIA_HOME = oldHome;
    await rm(parent, { recursive: true, force: true });
  }
});

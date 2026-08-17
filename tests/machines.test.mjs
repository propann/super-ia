import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureMachineStore, inspectMachine, saveMachine, validateMachine } from "../dist/machines/store.js";

function machine(overrides = {}) {
  const now = new Date().toISOString();
  return { id: "pi5", label: "Pi 5", platform: "linux", transport: "ssh", host: "192.0.2.10", port: 22, user: "azoth", enabled: true, authMode: "key", identityFile: "~/.ssh/super-agent-pi", shell: "bash", sessionName: "super-agent-pi", notes: "test", createdAt: now, updatedAt: now, ...overrides };
}

test("machine registry supports Linux SSH, Windows SSH and manual WinRM without secrets", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-machines-"));
  const previous = process.env.SUPERIA_HOME;
  process.env.SUPERIA_HOME = root;
  try {
    await saveMachine(machine());
    await saveMachine(machine({ id: "windows", label: "Windows", platform: "windows", host: "192.0.2.20", shell: "powershell", sessionName: "superia-windows" }));
    await saveMachine(machine({ id: "winrm", label: "WinRM", platform: "windows", transport: "winrm", port: 5985, shell: "powershell", sessionName: "superia-winrm" }));
    const store = await ensureMachineStore();
    assert.equal(store.store.machines.length, 3);
    assert.equal((await stat(store.path)).mode & 0o777, 0o600);
    assert.doesNotMatch(await readFile(store.path, "utf8"), /password|secret|token/i);
    assert.equal((await inspectMachine(machine(), async () => "/usr/bin/ssh")).state, "ready");
    assert.equal((await inspectMachine(machine({ id: "windows", platform: "windows", shell: "powershell" }), async () => "/usr/bin/ssh")).state, "ready");
    assert.equal((await inspectMachine(machine({ id: "winrm", platform: "windows", transport: "winrm", port: 5985, shell: "powershell" }), async () => undefined)).state, "manual");
  } finally {
    process.env.SUPERIA_HOME = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test("machine validation rejects a Windows SSH target without a shell", () => {
  assert.throws(() => validateMachine(machine({ platform: "windows", shell: undefined })), /déclarer son shell/);
  assert.throws(() => validateMachine(machine({ transport: "winrm", platform: "linux" })), /réservé à Windows/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { renderConnectionDashboard } from "../dist/connections/dashboard.js";

const execFileAsync = promisify(execFile);

async function superia(home, ...args) {
  return execFileAsync(process.execPath, ["dist/index.js", ...args], {
    env: { ...process.env, SUPERIA_HOME: home },
    maxBuffer: 2 * 1024 * 1024,
  });
}

test("main CLI initializes, enables and diagnoses connections without exposing secrets", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-connection-cli-"));
  try {
    const initialized = await superia(home, "connection", "init", "--json");
    const init = JSON.parse(initialized.stdout);
    assert.equal(init.store.schemaVersion, 1);
    assert.match(init.path, /connections\.json$/);

    const enabled = await superia(home, "connection", "enable", "openai-api", "--json");
    assert.equal(JSON.parse(enabled.stdout).enabled, true);

    const doctor = await superia(home, "connection", "doctor", "--json");
    const checks = JSON.parse(doctor.stdout);
    const openai = checks.find((item) => item.id === "openai-api");
    assert.equal(openai.state, process.env.OPENAI_API_KEY ? "ready" : "needs-auth");
    assert.equal(doctor.stdout.includes(process.env.OPENAI_API_KEY ?? "__not_present__"), false);

    const dashboard = renderConnectionDashboard(checks);
    assert.match(dashboard, /CONNECTION MATRIX/);
    assert.match(dashboard, /openai-api/);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

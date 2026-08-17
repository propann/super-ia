import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("toolchain manifest has coherent profiles and never installs a local model", async () => {
  const manifest = JSON.parse(await readFile("install/tools/toolchain-manifest.json", "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.principles.noLocalModelByDefault, true);
  const ids = manifest.tools.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  const full = JSON.stringify(manifest.profiles.full) + JSON.stringify(manifest.tools);
  assert.doesNotMatch(full, /model weights|ollama.*profile|llama\.cpp.*profile/i);
  assert.equal(manifest.tools.every((item) => item.command && item.channel && item.verification), true);
});

test("user tool bootstrap dry-run is non destructive and covers the full profile", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-tool-dry-"));
  try {
    const { stdout } = await execFileAsync("bash", ["install/tools/bootstrap-user-tools.sh", "--profile", "full", "--dry-run", "--no-modify-path"], {
      env: { ...process.env, HOME: home }, maxBuffer: 1024 * 1024,
    });
    for (const expected of ["@openai/codex", "mistral-vibe", "@google/gemini-cli", "@qwen-code/qwen-code", "opencode-ai", "aider-chat", "mini-swe-agent", "@anthropic-ai/claude-code"]) {
      assert.match(stdout, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.deepEqual(await readdir(home), []);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("installer scripts are explicit about privilege and avoid remote pipe to shell", async () => {
  const userScript = await readFile("install/tools/bootstrap-user-tools.sh", "utf8");
  const systemScript = await readFile("install/tools/system-packages-debian.sh", "utf8");
  assert.doesNotMatch(userScript, /(^|\s)sudo(\s|$)/m);
  assert.doesNotMatch(userScript, /curl[^\n|]*\|\s*(ba)?sh/);
  assert.doesNotMatch(userScript, /wget[^\n|]*\|\s*(ba)?sh/);
  assert.match(systemScript, /doit être lancé en root/);
  const { stdout } = await execFileAsync("bash", ["install/tools/system-packages-debian.sh", "--profile", "full", "--with-containers", "--dry-run"]);
  assert.match(stdout, /apt-get install/);
  assert.match(stdout, /podman/);
});

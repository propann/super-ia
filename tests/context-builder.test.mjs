import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildGitContext } from "../dist/context/builder.js";

const execFileAsync = promisify(execFile);

async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

test("context bundle is hashed, targeted and excludes secrets", async () => {
  const parent = await mkdtemp(join(tmpdir(), "superia-context-"));
  const root = join(parent, "demo");
  await git(parent, "init", "-b", "main", root);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "AGENTS.md"), "# Rules\nRun tests.\n");
  await writeFile(join(root, "README.md"), "# Demo auth service\n");
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }));
  await writeFile(join(root, "src", "auth.ts"), "export function authenticate() { return true; }\n");
  await writeFile(join(root, "src", "secret.ts"), "export const token = 'sk-abcdefghijklmnopqrstuvwxyz123456';\n");
  await writeFile(join(root, ".env"), "PASSWORD=do-not-send\n");
  await git(root, "config", "user.email", "test@example.invalid");
  await git(root, "config", "user.name", "Super IA Test");
  await git(root, "add", ".");
  await git(root, "commit", "-m", "init");

  try {
    const result = await buildGitContext(root, {
      query: "modifier src/auth.ts et vérifier src/secret.ts",
      maxBytes: 100_000,
      now: () => new Date("2026-08-14T21:00:00.000Z"),
    });
    const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));
    const context = await readFile(result.contextPath, "utf8");

    assert.match(manifest.contextHash, /^[a-f0-9]{64}$/);
    assert.ok(manifest.files.some((file) => file.path === "src/auth.ts"));
    assert.ok(manifest.instructions.includes("AGENTS.md"));
    assert.ok(manifest.excluded.some((file) => file.path === "src/secret.ts" && file.reason === "secret détecté"));
    assert.doesNotMatch(context, /abcdefghijklmnopqrstuvwxyz123456/);
    assert.ok(manifest.includedBytes <= manifest.maxBytes);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { discoverSensitiveWorkspacePaths } from "../dist/security/workspace-mask.js";

const execFileAsync = promisify(execFile);
async function git(cwd, ...args) {
  await execFileAsync("git", args, { cwd });
}

test("workspace mask preserves exact Git paths across tracked untracked and ignored files", async () => {
  const root = await mkdtemp(join(tmpdir(), "superia-workspace-mask-"));
  try {
    await git(root, "init", "-b", "main");
    await git(root, "config", "user.email", "test@example.invalid");
    await git(root, "config", "user.name", "Super IA Test");
    await writeFile(join(root, ".gitignore"), ".env\nprivate.sqlite\n.aws/\n");
    await writeFile(join(root, "README.md"), "# mask test\n");
    await writeFile(join(root, "tracked.key"), "tracked-private\n");
    await git(root, "add", ".gitignore", "README.md", "tracked.key");
    await git(root, "commit", "-m", "init");

    await writeFile(join(root, ".env"), "IGNORED=value\n");
    await writeFile(join(root, "private.sqlite"), "ignored-db\n");
    await mkdir(join(root, ".aws"), { recursive: true });
    await writeFile(join(root, ".aws", "credentials"), "ignored-credentials\n");
    await writeFile(join(root, " leading.key"), "untracked-private\n");

    const masked = await discoverSensitiveWorkspacePaths(root);
    const paths = new Set(masked.map((item) => item.path));
    assert.equal(paths.has(join(root, "tracked.key")), true);
    assert.equal(paths.has(join(root, ".env")), true);
    assert.equal(paths.has(join(root, "private.sqlite")), true);
    assert.equal(paths.has(join(root, ".aws", "credentials")), true);
    assert.equal(paths.has(join(root, " leading.key")), true);
    assert.equal(masked.every((item) => item.path.startsWith(root)), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

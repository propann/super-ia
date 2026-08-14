import { lstat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { sensitivePathReason } from "../context/secret-scanner.js";
import { runCommand } from "../utils/command.js";
import type { SandboxMaskedPath } from "../runtime/types.js";

function splitNullDelimited(value: string): string[] {
  return value.split("\u0000").map((item) => item.trim()).filter(Boolean);
}

function insideWorkspace(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

async function listGitPaths(root: string, args: string[]): Promise<string[]> {
  const result = await runCommand("git", ["-C", root, "ls-files", "-z", ...args], { timeoutMs: 15_000 });
  return splitNullDelimited(result.stdout);
}

export async function discoverSensitiveWorkspacePaths(rootDirectory: string): Promise<SandboxMaskedPath[]> {
  const root = resolve(rootDirectory);
  const [tracked, untracked, ignored] = await Promise.all([
    listGitPaths(root, []),
    listGitPaths(root, ["--others", "--exclude-standard"]),
    listGitPaths(root, ["--others", "--ignored", "--exclude-standard"]),
  ]);
  const paths = new Set([...tracked, ...untracked, ...ignored]);
  const masked: SandboxMaskedPath[] = [];

  for (const relativePath of [...paths].sort()) {
    const reason = sensitivePathReason(relativePath);
    if (!reason) continue;
    const absolutePath = resolve(root, relativePath);
    if (!insideWorkspace(root, absolutePath) || absolutePath === root) {
      throw new Error(`Chemin sensible hors workspace refusé : ${relativePath}`);
    }
    try {
      const info = await lstat(absolutePath);
      masked.push({
        path: absolutePath,
        kind: info.isDirectory() ? "directory" : "file",
        reason,
      });
    } catch (error) {
      const missing = typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
      if (!missing) throw error;
    }
  }

  return masked;
}

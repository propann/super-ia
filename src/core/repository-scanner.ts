import { access, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { RepositoryScan } from "./types.js";
import { runCommand } from "../utils/command.js";

const manifestCandidates = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "composer.json",
  "Gemfile",
];

const instructionCandidates = ["AGENTS.md", "PROJECT_CONTEXT.md", "CLAUDE.md", "GEMINI.md", "README.md"];

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function gitValue(cwd: string, args: string[]): Promise<string | undefined> {
  try {
    const result = await runCommand("git", args, { cwd, timeoutMs: 8_000 });
    return result.stdout || undefined;
  } catch {
    return undefined;
  }
}

function detectPackageManager(files: string[]): RepositoryScan["packageManager"] {
  if (files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes("yarn.lock")) return "yarn";
  if (files.includes("bun.lock") || files.includes("bun.lockb")) return "bun";
  if (files.includes("package-lock.json") || files.includes("package.json")) return "npm";
  return undefined;
}

function languageFromManifest(file: string): string | undefined {
  const mapping: Record<string, string> = {
    "package.json": "JavaScript/TypeScript",
    "pyproject.toml": "Python",
    "requirements.txt": "Python",
    "Cargo.toml": "Rust",
    "go.mod": "Go",
    "pom.xml": "Java",
    "build.gradle": "Java/Kotlin",
    "composer.json": "PHP",
    Gemfile: "Ruby",
  };
  return mapping[file];
}

function recommendedChecks(manager: RepositoryScan["packageManager"], scripts: Record<string, string>): string[] {
  if (!manager) return [];
  const prefix = manager === "npm" ? "npm run" : manager;
  const preferred = ["lint", "typecheck", "test", "build", "check"];
  return preferred.filter((name) => scripts[name]).map((name) => `${prefix} ${name}`);
}

export async function scanRepository(directory: string): Promise<RepositoryScan> {
  const start = resolve(directory);
  const gitRoot = await gitValue(start, ["rev-parse", "--show-toplevel"]);
  const root = gitRoot ? resolve(gitRoot) : start;
  const isGitRepository = Boolean(gitRoot);

  const extraFiles = ["pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb", "package-lock.json"];
  const allCandidates = [...manifestCandidates, ...instructionCandidates, ...extraFiles];
  const present = (await Promise.all(allCandidates.map(async (file) => ((await exists(join(root, file))) ? file : undefined))))
    .filter((file): file is string => Boolean(file));

  const manifests = manifestCandidates.filter((file) => present.includes(file));
  const instructions = instructionCandidates.filter((file) => present.includes(file));
  const packageManager = detectPackageManager(present);
  let scripts: Record<string, string> = {};

  if (present.includes("package.json")) {
    try {
      const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
      scripts = pkg.scripts ?? {};
    } catch {
      scripts = {};
    }
  }

  const branch = isGitRepository ? await gitValue(root, ["branch", "--show-current"]) : undefined;
  const remote = isGitRepository ? await gitValue(root, ["remote", "get-url", "origin"]) : undefined;
  const status = isGitRepository ? await gitValue(root, ["status", "--porcelain"]) : undefined;
  const languages = [...new Set(manifests.map(languageFromManifest).filter((value): value is string => Boolean(value)))];

  return {
    root,
    name: basename(root),
    isGitRepository,
    branch,
    remote,
    dirty: Boolean(status),
    packageManager,
    manifests,
    languages,
    instructions,
    scripts,
    recommendedChecks: recommendedChecks(packageManager, scripts),
  };
}

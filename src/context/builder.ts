import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { SuperIaTask } from "../core/types.js";
import { runCommand } from "../utils/command.js";
import { looksBinary, scanTextForSecrets, sensitivePathReason } from "./secret-scanner.js";
import type {
  BuildContextOptions,
  ContextBuildResult,
  ContextFileEntry,
  ContextManifest,
  ExcludedContextFile,
} from "./types.js";

const instructionNames = new Set(["AGENTS.md", "PROJECT_CONTEXT.md", "CLAUDE.md", "GEMINI.md", "README.md"]);
const manifestNames = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "composer.json",
  "Gemfile",
]);
const stopWords = new Set([
  "avec", "dans", "pour", "plus", "tout", "tous", "toute", "faire", "ajouter", "mettre", "notre", "cette",
  "this", "that", "with", "from", "into", "have", "will", "should", "build", "create", "project", "task",
]);

interface Candidate {
  path: string;
  score: number;
  reasons: Set<string>;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function trackedFiles(stdout: string): string[] {
  return stdout.split("\u0000").map((file) => file.trim()).filter(Boolean);
}

function extractKeywords(value: string): string[] {
  return [...new Set(value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9_-]{4,}/g) ?? [])]
    .filter((word) => !stopWords.has(word) && !/^\d+$/.test(word))
    .slice(0, 10);
}

function explicitFileReferences(value: string, tracked: Set<string>): string[] {
  const matches = value.match(/[A-Za-z0-9_.@/-]+\.[A-Za-z0-9]{1,12}/g) ?? [];
  return [...new Set(matches.map((match) => match.replace(/^\.\//, "")).filter((match) => tracked.has(match)))];
}

function addCandidate(map: Map<string, Candidate>, path: string, score: number, reason: string): void {
  const current = map.get(path) ?? { path, score: 0, reasons: new Set<string>() };
  current.score = Math.max(current.score, score);
  current.reasons.add(reason);
  map.set(path, current);
}

async function gitValue(root: string, args: string[]): Promise<string> {
  try {
    return (await runCommand("git", args, { cwd: root, timeoutMs: 15_000 })).stdout;
  } catch {
    return "";
  }
}

async function keywordMatches(root: string, keyword: string): Promise<string[]> {
  const output = await gitValue(root, ["grep", "-Il", "-e", keyword, "--"]);
  return output.split(/\r?\n/).map((file) => file.trim()).filter(Boolean).slice(0, 40);
}

function changedFiles(status: string, tracked: Set<string>): string[] {
  const files: string[] = [];
  for (const line of status.split(/\r?\n/)) {
    if (line.length < 4) continue;
    const raw = line.slice(3).trim();
    const path = raw.includes(" -> ") ? raw.split(" -> ").at(-1) ?? raw : raw;
    if (tracked.has(path)) files.push(path);
  }
  return files;
}

function contextHeader(manifest: ContextManifest): string {
  return [
    "# Contexte Super IA",
    "",
    `- Identifiant : \`${manifest.id}\``,
    `- Dépôt : \`${manifest.repositoryName}\``,
    `- Commit de base : \`${manifest.baseCommit}\``,
    `- État sale : ${manifest.dirty ? "oui" : "non"}`,
    `- Empreinte : \`${manifest.contextHash}\``,
    `- Taille incluse : ${manifest.includedBytes} octets`,
    "",
    "Ce paquet est une sélection vérifiable. Il ne remplace pas le dépôt Git complet.",
    "",
  ].join("\n");
}

function missionMarkdown(options: BuildContextOptions, task?: SuperIaTask): string {
  const goal = task?.goal ?? options.goal ?? options.query ?? "Mission non précisée.";
  return [
    "# Mission",
    "",
    task ? `- Mission : \`${task.id}\`` : "- Mission : ad hoc",
    `- Objectif : ${goal}`,
    task ? `- Branche prévue : \`${task.branchName}\`` : "",
    task?.checks.length ? `- Validations : ${task.checks.join(" ; ")}` : "",
    "",
    "## Règles",
    "",
    "- respecter les instructions AGENTS.md incluses ;",
    "- ne jamais inventer le contenu d'un fichier absent du paquet ;",
    "- signaler tout contexte manquant ;",
    "- ne pas exposer de secret ;",
    "- fournir les commandes de validation réellement exécutées.",
    "",
  ].filter(Boolean).join("\n");
}

export async function buildGitContext(
  repositoryRoot: string,
  options: BuildContextOptions = {},
  task?: SuperIaTask,
): Promise<ContextBuildResult> {
  const root = resolve(repositoryRoot);
  const listed = await runCommand("git", ["ls-files", "-z"], { cwd: root, timeoutMs: 30_000 });
  const tracked = new Set(trackedFiles(listed.stdout));
  if (!tracked.size) throw new Error("Aucun fichier suivi par Git dans ce dépôt.");

  const baseCommit = await gitValue(root, ["rev-parse", "HEAD"]);
  const status = await gitValue(root, ["status", "--porcelain"]);
  const query = [task?.goal, options.goal, options.query].filter(Boolean).join(" ");
  const candidates = new Map<string, Candidate>();

  for (const path of tracked) {
    const name = basename(path);
    if (instructionNames.has(name)) addCandidate(candidates, path, 70, "instruction du projet");
    if (manifestNames.has(name)) addCandidate(candidates, path, 55, "manifest du projet");
  }
  for (const path of changedFiles(status, tracked)) addCandidate(candidates, path, 90, "fichier modifié");
  for (const path of explicitFileReferences(query, tracked)) addCandidate(candidates, path, 100, "fichier explicitement cité");

  for (const keyword of extractKeywords(query)) {
    for (const path of await keywordMatches(root, keyword)) {
      if (tracked.has(path)) addCandidate(candidates, path, 45, `contient le mot-clé ${keyword}`);
    }
  }

  const maxBytes = Math.min(2_000_000, Math.max(16_384, options.maxBytes ?? 300_000));
  const included: Array<{ entry: ContextFileEntry; content: string }> = [];
  const excluded: ExcludedContextFile[] = [];
  let includedBytes = 0;

  const ordered = [...candidates.values()].sort((left, right) =>
    right.score - left.score || left.path.localeCompare(right.path));

  for (const candidate of ordered) {
    const denied = sensitivePathReason(candidate.path);
    if (denied) {
      excluded.push({ path: candidate.path, reason: denied });
      continue;
    }
    let content: string;
    try {
      content = await readFile(join(root, candidate.path), "utf8");
    } catch {
      excluded.push({ path: candidate.path, reason: "fichier illisible" });
      continue;
    }
    if (looksBinary(content)) {
      excluded.push({ path: candidate.path, reason: "contenu binaire" });
      continue;
    }
    const findings = scanTextForSecrets(candidate.path, content);
    if (findings.some((finding) => finding.severity === "high")) {
      excluded.push({ path: candidate.path, reason: "secret détecté", findings });
      continue;
    }
    const bytes = Buffer.byteLength(content, "utf8");
    if (includedBytes + bytes > maxBytes) {
      excluded.push({ path: candidate.path, reason: "budget de contexte dépassé" });
      continue;
    }
    const entry: ContextFileEntry = {
      path: candidate.path,
      sha256: sha256(content),
      bytes,
      mode: "full",
      reasons: [...candidate.reasons].sort(),
    };
    included.push({ entry, content });
    includedBytes += bytes;
  }

  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const manifestCore = {
    schemaVersion: 1 as const,
    repositoryRoot: root,
    repositoryName: basename(root),
    baseCommit: baseCommit || "unborn",
    dirty: Boolean(status),
    taskId: task?.id ?? options.taskId,
    goal: task?.goal ?? options.goal,
    query: options.query,
    createdAt,
    maxBytes,
    includedBytes,
    files: included.map(({ entry }) => entry),
    excluded,
    instructions: included.map(({ entry }) => entry.path).filter((path) => instructionNames.has(basename(path))),
  };
  const contextHash = sha256(JSON.stringify(manifestCore));
  const id = `CTX-${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${contextHash.slice(0, 8)}`;
  const manifest: ContextManifest = { ...manifestCore, id, contextHash };
  const outputRoot = options.outputRoot ?? join(root, ".superia", "contexts");
  const directory = join(outputRoot, id);
  await mkdir(directory, { recursive: true });

  const missionPath = join(directory, "MISSION.md");
  const contextPath = join(directory, "CONTEXT.md");
  const manifestPath = join(directory, "MANIFEST.json");
  const sections = included.map(({ entry, content }) => [
    `## ${entry.path}`,
    "",
    `Raisons : ${entry.reasons.join(" ; ")}`,
    "",
    `===== FILE: ${entry.path} =====`,
    content,
    `===== END FILE: ${entry.path} =====`,
    "",
  ].join("\n"));

  await Promise.all([
    writeFile(missionPath, `${missionMarkdown(options, task)}\n`, "utf8"),
    writeFile(contextPath, `${contextHeader(manifest)}${sections.join("\n")}`, "utf8"),
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
  ]);

  return { directory, missionPath, contextPath, manifestPath, manifest };
}

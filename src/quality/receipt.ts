import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { openControlPlane } from "../control/control-plane.js";
import { runCommand } from "../utils/command.js";
import type { ReceiptArtifact, ReceiptReview, ReceiptValidation, ReceiptVerification, RunReceipt } from "./types.js";

function sha256(value: unknown): string {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function artifact(kind: string, path: string): Promise<ReceiptArtifact | undefined> {
  if (!(await exists(path))) return undefined;
  const data = await readFile(path);
  return { kind, path, bytes: data.byteLength, sha256: sha256(data) };
}

async function gitValue(cwd: string, args: string[]): Promise<string> {
  try {
    return (await runCommand("git", args, { cwd, timeoutMs: 20_000 })).stdout;
  } catch {
    return "";
  }
}

function receiptCore(receipt: Omit<RunReceipt, "receiptHash" | "id">): string {
  return JSON.stringify(receipt);
}

function validationState(mode: string | undefined, validations: ReceiptValidation[]): RunReceipt["verdict"]["validationState"] {
  if (mode !== "build") return "not-required";
  if (!validations.length) return "missing";
  return validations.every((item) => item.status === "completed") ? "passed" : "failed";
}

function reviewState(mode: string | undefined, review: ReceiptReview | undefined): RunReceipt["verdict"]["reviewState"] {
  if (mode !== "build") return "not-required";
  return review?.verdict ?? "missing";
}

function contextFiles(cwd: string, contextId: string, provider: string): Array<[string, string]> {
  const directory = join(cwd, ".superia", "contexts", contextId);
  const files: Array<[string, string]> = [
    ["context-manifest", join(directory, "MANIFEST.json")],
    ["agent-result", join(directory, "AGENT_RESULT.json")],
    ["change-guard", join(directory, "CHANGE_GUARD.json")],
    ["agent-changes", join(directory, "AGENT_CHANGES.patch")],
    ["independent-review", join(directory, "REVIEW.json")],
  ];
  if (provider === "codex-cli") {
    files.push(["agent-last-message", join(directory, "CODEX_LAST_MESSAGE.md")]);
    files.push(["agent-events", join(directory, "CODEX_EVENTS.json")]);
  }
  if (provider === "mistral-vibe") {
    files.push(["agent-last-message", join(directory, "VIBE_OUTPUT.json")]);
    files.push(["agent-events", join(directory, "VIBE_EVENTS.json")]);
  }
  return files;
}

async function readReview(path: string): Promise<ReceiptReview | undefined> {
  if (!(await exists(path))) return undefined;
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    const verdict = parsed.verdict;
    if (verdict !== "approve" && verdict !== "changes-requested" && verdict !== "blocked") return undefined;
    if (typeof parsed.reviewerProvider !== "string" || typeof parsed.reviewerRunId !== "string") return undefined;
    return {
      path,
      reviewerProvider: parsed.reviewerProvider,
      reviewerRunId: parsed.reviewerRunId,
      verdict,
      structured: parsed.structured === true,
      findings: Array.isArray(parsed.findings) ? parsed.findings.length : 0,
    };
  } catch {
    return undefined;
  }
}

export async function createRunReceipt(
  runId: string,
  root?: string,
  now: () => Date = () => new Date(),
): Promise<{ path: string; receipt: RunReceipt }> {
  const control = await openControlPlane(root);
  try {
    const run = control.getRun(runId);
    const project = control.getProject(run.projectId);
    const task = run.taskId
      ? control.listProjectTasks(run.projectId).find((candidate) => candidate.id === run.taskId)
      : undefined;
    const cwd = resolve(typeof run.metadata.cwd === "string" ? run.metadata.cwd : task?.worktreePath ?? project.root);
    const baseCommit = typeof run.metadata.baseCommit === "string" ? run.metadata.baseCommit : undefined;
    const resultCommit = await gitValue(cwd, ["rev-parse", "HEAD"]);
    const status = await gitValue(cwd, ["status", "--porcelain"]);
    const changedFiles = status.split(/\r?\n/).filter(Boolean).map((line) => {
      const raw = line.slice(3).trim();
      return raw.includes(" -> ") ? raw.split(" -> ").at(-1) ?? raw : raw;
    }).sort();
    const diff = await gitValue(cwd, ["diff", "--binary", "HEAD"]);

    const artifacts: ReceiptArtifact[] = [];
    const stdoutPath = typeof run.metadata.stdoutPath === "string" ? run.metadata.stdoutPath : undefined;
    const stderrPath = typeof run.metadata.stderrPath === "string" ? run.metadata.stderrPath : undefined;
    for (const candidate of [
      stdoutPath ? await artifact("stdout", stdoutPath) : undefined,
      stderrPath ? await artifact("stderr", stderrPath) : undefined,
    ]) {
      if (candidate) artifacts.push(candidate);
    }

    const contextId = typeof run.metadata.contextId === "string" ? run.metadata.contextId : undefined;
    const expectedContextHash = typeof run.metadata.contextHash === "string" ? run.metadata.contextHash : undefined;
    let context: RunReceipt["context"];
    let review: ReceiptReview | undefined;
    if (contextId) {
      for (const [kind, path] of contextFiles(cwd, contextId, run.provider)) {
        const candidate = await artifact(kind, path);
        if (candidate) artifacts.push(candidate);
      }
      const manifestPath = join(cwd, ".superia", "contexts", contextId, "MANIFEST.json");
      const reviewPath = join(cwd, ".superia", "contexts", contextId, "REVIEW.json");
      review = await readReview(reviewPath);
      let manifestSha256: string | undefined;
      let manifestHashMatches = false;
      if (await exists(manifestPath)) {
        const raw = await readFile(manifestPath, "utf8");
        manifestSha256 = sha256(raw);
        try {
          const parsed = JSON.parse(raw) as { contextHash?: string };
          manifestHashMatches = Boolean(expectedContextHash && parsed.contextHash === expectedContextHash);
        } catch {
          manifestHashMatches = false;
        }
      }
      context = {
        id: contextId,
        expectedHash: expectedContextHash,
        manifestPath,
        manifestSha256,
        manifestHashMatches,
      };
    }

    const validations = control.listRuns(run.projectId)
      .filter((candidate) => candidate.provider === "local-validator")
      .filter((candidate) => !run.taskId || candidate.taskId === run.taskId)
      .filter((candidate) => candidate.startedAt >= run.startedAt)
      .map<ReceiptValidation>((candidate) => ({
        runId: candidate.id,
        command: typeof candidate.metadata.validationCommand === "string"
          ? candidate.metadata.validationCommand
          : undefined,
        status: candidate.status,
        startedAt: candidate.startedAt,
        finishedAt: candidate.finishedAt,
      }));

    const mode = typeof run.metadata.mode === "string" ? run.metadata.mode : undefined;
    const createdAt = now().toISOString();
    const core: Omit<RunReceipt, "receiptHash" | "id"> = {
      schemaVersion: 1,
      createdAt,
      run: {
        id: run.id,
        projectId: run.projectId,
        taskId: run.taskId,
        provider: run.provider,
        mode,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
      },
      project: {
        id: project.id,
        name: project.name,
        root: project.root,
        remote: project.remote,
      },
      task: task ? {
        id: task.id,
        title: task.title,
        goal: task.goal,
        branchName: task.branchName,
        worktreePath: task.worktreePath,
      } : undefined,
      git: {
        cwd,
        baseCommit,
        resultCommit: resultCommit || undefined,
        dirty: Boolean(status),
        changedFiles,
        diffSha256: sha256(diff),
      },
      context,
      review,
      artifacts: artifacts.sort((left, right) => left.kind.localeCompare(right.kind) || left.path.localeCompare(right.path)),
      validations,
      verdict: {
        agentCompleted: run.status === "completed",
        contextVerified: Boolean(context?.manifestHashMatches),
        artifactsVerified: artifacts.length > 0,
        validationState: validationState(mode, validations),
        reviewState: reviewState(mode, review),
        humanApprovalRequired: true,
      },
    };
    const receiptHash = sha256(receiptCore(core));
    const receipt: RunReceipt = {
      ...core,
      id: `RCP-${run.id.slice(0, 8)}-${receiptHash.slice(0, 8)}`,
      receiptHash,
    };
    const directory = join(control.paths.runs, run.id);
    await mkdir(directory, { recursive: true });
    const path = join(directory, "RECEIPT.json");
    await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    control.appendEvent("run", run.id, "receipt.created", {
      receiptId: receipt.id,
      receiptHash,
      path,
      validationState: receipt.verdict.validationState,
      reviewState: receipt.verdict.reviewState,
    });
    return { path, receipt };
  } finally {
    control.close();
  }
}

export async function verifyRunReceipt(path: string): Promise<ReceiptVerification> {
  const receipt = JSON.parse(await readFile(path, "utf8")) as RunReceipt;
  const errors: string[] = [];
  const { receiptHash, id: _id, ...core } = receipt;
  const expectedHash = sha256(receiptCore(core));
  if (expectedHash !== receiptHash) errors.push("empreinte du receipt invalide");
  for (const expected of receipt.artifacts) {
    const actual = await artifact(expected.kind, expected.path);
    if (!actual) {
      errors.push(`${expected.kind}: artefact absent`);
      continue;
    }
    if (actual.bytes !== expected.bytes) errors.push(`${expected.kind}: taille différente`);
    if (actual.sha256 !== expected.sha256) errors.push(`${expected.kind}: empreinte différente`);
  }
  if (receipt.context?.manifestPath) {
    if (!(await exists(receipt.context.manifestPath))) {
      errors.push("manifest de contexte absent");
    } else if (receipt.context.manifestSha256) {
      const raw = await readFile(receipt.context.manifestPath, "utf8");
      if (sha256(raw) !== receipt.context.manifestSha256) errors.push("manifest de contexte modifié");
    }
  }
  return { valid: errors.length === 0, receipt, errors };
}

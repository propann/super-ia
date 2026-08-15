import { openControlPlane } from "../control/control-plane.js";
import type { RunRecord } from "../control/types.js";

const DEFAULT_HEARTBEAT_MAX_AGE_MS = 60_000;
const DEFAULT_GRACE_MS = 1_000;

export interface EmergencyTerminationReport {
  schemaVersion: 1;
  requestedAt: string;
  considered: number;
  signalled: string[];
  escalated: string[];
  skippedNoPid: string[];
  skippedStale: string[];
  skippedUnsafePid: string[];
  alreadyExited: string[];
  failures: Array<{ runId: string; code: string }>;
}

export interface EmergencyTerminationOptions {
  heartbeatMaxAgeMs?: number;
  graceMs?: number;
  now?: () => Date;
}

function active(run: RunRecord): boolean {
  return run.status === "queued" || run.status === "running";
}

function safePid(pid: number | undefined): pid is number {
  return Number.isInteger(pid) && Number(pid) > 1 && pid !== process.pid;
}

function processTarget(pid: number): number {
  return process.platform === "win32" ? pid : -pid;
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code?: unknown }).code ?? "UNKNOWN");
  }
  return "UNKNOWN";
}

function signalProcessGroup(pid: number, signal: NodeJS.Signals | 0): "sent" | "exited" | "failed" {
  try {
    process.kill(processTarget(pid), signal);
    return "sent";
  } catch (error) {
    const code = errorCode(error);
    if (code === "ESRCH") return "exited";
    if (signal === 0 && code === "EPERM") return "sent";
    return "failed";
  }
}

function heartbeatFresh(run: RunRecord, now: Date, maximumAgeMs: number): boolean {
  const heartbeat = Date.parse(run.heartbeatAt);
  return Number.isFinite(heartbeat)
    && heartbeat <= now.getTime() + 5_000
    && now.getTime() - heartbeat <= maximumAgeMs;
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function terminateActiveManagedRuns(
  controlHome?: string,
  options: EmergencyTerminationOptions = {},
): Promise<EmergencyTerminationReport> {
  const now = options.now?.() ?? new Date();
  const heartbeatMaxAgeMs = Math.max(1_000, options.heartbeatMaxAgeMs ?? DEFAULT_HEARTBEAT_MAX_AGE_MS);
  const graceMs = Math.max(100, options.graceMs ?? DEFAULT_GRACE_MS);
  const control = await openControlPlane(controlHome);
  try {
    const runs = control.listRuns().filter(active);
    const report: EmergencyTerminationReport = {
      schemaVersion: 1,
      requestedAt: now.toISOString(),
      considered: runs.length,
      signalled: [],
      escalated: [],
      skippedNoPid: [],
      skippedStale: [],
      skippedUnsafePid: [],
      alreadyExited: [],
      failures: [],
    };
    const pending: Array<{ runId: string; pid: number }> = [];

    for (const run of runs) {
      if (run.pid === undefined) {
        report.skippedNoPid.push(run.id);
        continue;
      }
      if (!safePid(run.pid)) {
        report.skippedUnsafePid.push(run.id);
        continue;
      }
      if (!heartbeatFresh(run, now, heartbeatMaxAgeMs)) {
        report.skippedStale.push(run.id);
        continue;
      }
      const probe = signalProcessGroup(run.pid, 0);
      if (probe === "exited") {
        report.alreadyExited.push(run.id);
        continue;
      }
      if (probe === "failed") {
        report.failures.push({ runId: run.id, code: "PROBE_FAILED" });
        continue;
      }
      const terminated = signalProcessGroup(run.pid, "SIGTERM");
      if (terminated === "sent") {
        report.signalled.push(run.id);
        pending.push({ runId: run.id, pid: run.pid });
      } else if (terminated === "exited") {
        report.alreadyExited.push(run.id);
      } else {
        report.failures.push({ runId: run.id, code: "SIGTERM_FAILED" });
      }
    }

    if (pending.length) await sleep(graceMs);
    for (const run of pending) {
      const alive = signalProcessGroup(run.pid, 0);
      if (alive === "exited") continue;
      if (alive === "failed") {
        report.failures.push({ runId: run.runId, code: "POST_TERM_PROBE_FAILED" });
        continue;
      }
      const killed = signalProcessGroup(run.pid, "SIGKILL");
      if (killed === "sent") report.escalated.push(run.runId);
      else if (killed === "failed") report.failures.push({ runId: run.runId, code: "SIGKILL_FAILED" });
    }

    control.appendEvent("safety", "emergency-stop", "safety.active_runs_termination_requested", {
      considered: report.considered,
      signalledRunIds: report.signalled,
      escalatedRunIds: report.escalated,
      skippedNoPidRunIds: report.skippedNoPid,
      skippedStaleRunIds: report.skippedStale,
      skippedUnsafePidRunIds: report.skippedUnsafePid,
      alreadyExitedRunIds: report.alreadyExited,
      failedRunIds: report.failures.map((item) => item.runId),
    });
    return report;
  } finally {
    control.close();
  }
}

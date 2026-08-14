import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { openControlPlane } from "../control/control-plane.js";
import { ensureControlHome } from "../control/home.js";
import type { ManagedSandboxRequest } from "../runtime/types.js";
import { findExecutable } from "../utils/command.js";
import type { AgentMode, SandboxPreflightResult } from "./types.js";

export interface AgentSandboxPreparation {
  preflight: SandboxPreflightResult;
  sandbox?: ManagedSandboxRequest;
  env?: Record<string, string>;
  allowedEnvKeys: string[];
}

function workspaceAccess(mode: AgentMode): "read-only" | "read-write" {
  return mode === "build" ? "read-write" : "read-only";
}

async function appendSandboxEvent(input: {
  projectId: string;
  taskId: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const control = await openControlPlane();
  try {
    control.appendEvent("task", `${input.projectId}:${input.taskId}`, input.type, input.payload);
  } finally {
    control.close();
  }
}

export async function prepareAgentSandbox(input: {
  projectId: string;
  taskId: string;
  provider: string;
  mode: AgentMode;
  writablePaths?: string[];
  dryRun?: boolean;
  allowWithoutBubblewrap?: boolean;
}): Promise<AgentSandboxPreparation> {
  const access = workspaceAccess(input.mode);
  const network = "host" as const;

  if (input.dryRun) {
    return {
      preflight: {
        status: "not-run-dry-run",
        engine: "bubblewrap",
        network,
        workspaceAccess: access,
        ephemeralHome: true,
        reason: "Prévisualisation uniquement : Bubblewrap sera exigé avant un run réel.",
      },
      allowedEnvKeys: [],
    };
  }

  const bubblewrap = process.platform === "linux" ? await findExecutable("bwrap") : undefined;
  if (!bubblewrap) {
    if (!input.allowWithoutBubblewrap) {
      const platformReason = process.platform === "linux"
        ? "Bubblewrap est absent du PATH"
        : `Bubblewrap exige Linux, plateforme détectée : ${process.platform}`;
      throw new Error(`Préflight sandbox refusé : ${platformReason}. L'agent ${input.provider} n'a pas été lancé.`);
    }
    const reason = "Dérogation locale explicite --allow-without-bwrap";
    await appendSandboxEvent({
      projectId: input.projectId,
      taskId: input.taskId,
      type: "sandbox.preflight.waived",
      payload: { provider: input.provider, engine: "bubblewrap", reason },
    });
    return {
      preflight: {
        status: "waived",
        engine: "bubblewrap",
        network,
        workspaceAccess: access,
        ephemeralHome: true,
        reason: `${reason}, enregistrée dans le journal.`,
      },
      allowedEnvKeys: [],
    };
  }

  const paths = await ensureControlHome();
  const providerState = join(paths.root, "providers", input.provider);
  await mkdir(providerState, { recursive: true });
  const env: Record<string, string> = {};
  if (input.provider === "codex-cli") env.CODEX_HOME = providerState;
  if (input.provider === "mistral-vibe") env.VIBE_HOME = providerState;
  const allowedEnvKeys = Object.keys(env);
  const preflight: SandboxPreflightResult = {
    status: "active",
    engine: "bubblewrap",
    network,
    workspaceAccess: access,
    ephemeralHome: true,
  };
  await appendSandboxEvent({
    projectId: input.projectId,
    taskId: input.taskId,
    type: "sandbox.preflight.passed",
    payload: {
      provider: input.provider,
      engine: "bubblewrap",
      network,
      workspaceAccess: access,
      ephemeralHome: true,
      writablePaths: input.writablePaths?.length ?? 0,
    },
  });
  return {
    preflight,
    sandbox: {
      engine: "bubblewrap",
      executable: bubblewrap,
      network,
      workspaceAccess: access,
      statePaths: [providerState],
      writablePaths: input.writablePaths,
    },
    env,
    allowedEnvKeys,
  };
}

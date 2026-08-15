import { openControlPlane } from "../control/control-plane.js";
import {
  engageEmergencyStop,
  loadEmergencyStop,
  releaseEmergencyStop,
  type EmergencyStopCategory,
  type EmergencyStopState,
} from "./store.js";
import { terminateActiveManagedRuns, type EmergencyTerminationReport } from "./terminate.js";

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function positionals(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (value !== "--json") index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

function category(value: string | undefined): EmergencyStopCategory {
  const resolved = value ?? "manual";
  if (!["manual", "security", "budget", "maintenance"].includes(resolved)) {
    throw new Error("--category doit être manual, security, budget ou maintenance.");
  }
  return resolved as EmergencyStopCategory;
}

function render(state: EmergencyStopState, termination?: EmergencyTerminationReport): void {
  console.log("SUPER IA — ARRÊT D'URGENCE\n");
  console.log(`État       ${state.engaged ? "ENGAGÉ" : "LIBRE"}`);
  console.log(`Catégorie  ${state.category ?? "-"}`);
  console.log(`Génération ${state.generation}`);
  console.log(`Mise à jour ${state.updatedAt}`);
  console.log(`Engagé le  ${state.engagedAt ?? "-"}`);
  console.log(`Libéré le  ${state.releasedAt ?? "-"}`);
  if (termination) {
    console.log("");
    console.log(`Runs actifs examinés ${termination.considered}`);
    console.log(`SIGTERM demandé       ${termination.signalled.length}`);
    console.log(`SIGKILL demandé       ${termination.escalated.length}`);
    console.log(`Sans PID              ${termination.skippedNoPid.length}`);
    console.log(`Heartbeat ancien      ${termination.skippedStale.length}`);
    console.log(`Échecs de signal      ${termination.failures.length}`);
  }
}

async function audit(type: string, state: EmergencyStopState, termination?: EmergencyTerminationReport): Promise<void> {
  const control = await openControlPlane();
  try {
    control.appendEvent("safety", "emergency-stop", type, {
      engaged: state.engaged,
      category: state.category,
      generation: state.generation,
      termination: termination ? {
        considered: termination.considered,
        signalledRunIds: termination.signalled,
        escalatedRunIds: termination.escalated,
        skippedRunIds: [
          ...termination.skippedNoPid,
          ...termination.skippedStale,
          ...termination.skippedUnsafePid,
        ],
        failedRunIds: termination.failures.map((item) => item.runId),
      } : null,
    });
  } finally {
    control.close();
  }
}

export async function handleSafetyCommand(command: string, args: string[], asJson: boolean): Promise<boolean> {
  if (command !== "safety" && command !== "stop") return false;
  const [action = "status"] = positionals(args);
  let state: EmergencyStopState;
  let termination: EmergencyTerminationReport | undefined;

  if (action === "status") {
    state = await loadEmergencyStop();
  } else if (action === "engage") {
    state = await engageEmergencyStop(category(flagValue(args, "--category")));
    termination = await terminateActiveManagedRuns();
    await audit("safety.emergency_stop_engaged", state, termination);
  } else if (action === "release") {
    state = await releaseEmergencyStop();
    await audit("safety.emergency_stop_released", state);
  } else {
    throw new Error("Usage : superia safety status|engage|release [--category manual|security|budget|maintenance]");
  }

  if (asJson) console.log(JSON.stringify({ ...state, termination: termination ?? null }, null, 2));
  else render(state, termination);
  return true;
}

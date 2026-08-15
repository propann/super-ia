import { openControlPlane } from "../control/control-plane.js";
import {
  engageEmergencyStop,
  loadEmergencyStop,
  releaseEmergencyStop,
  type EmergencyStopCategory,
  type EmergencyStopState,
} from "./store.js";

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

function render(state: EmergencyStopState): void {
  console.log("SUPER IA — ARRÊT D'URGENCE\n");
  console.log(`État       ${state.engaged ? "ENGAGÉ" : "LIBRE"}`);
  console.log(`Catégorie  ${state.category ?? "-"}`);
  console.log(`Génération ${state.generation}`);
  console.log(`Mise à jour ${state.updatedAt}`);
  console.log(`Engagé le  ${state.engagedAt ?? "-"}`);
  console.log(`Libéré le  ${state.releasedAt ?? "-"}`);
}

async function audit(type: string, state: EmergencyStopState): Promise<void> {
  const control = await openControlPlane();
  try {
    control.appendEvent("safety", "emergency-stop", type, {
      engaged: state.engaged,
      category: state.category,
      generation: state.generation,
    });
  } finally {
    control.close();
  }
}

export async function handleSafetyCommand(command: string, args: string[], asJson: boolean): Promise<boolean> {
  if (command !== "safety" && command !== "stop") return false;
  const [action = "status"] = positionals(args);
  let state: EmergencyStopState;

  if (action === "status") {
    state = await loadEmergencyStop();
  } else if (action === "engage") {
    state = await engageEmergencyStop(category(flagValue(args, "--category")));
    await audit("safety.emergency_stop_engaged", state);
  } else if (action === "release") {
    state = await releaseEmergencyStop();
    await audit("safety.emergency_stop_released", state);
  } else {
    throw new Error("Usage : superia safety status|engage|release [--category manual|security|budget|maintenance]");
  }

  if (asJson) console.log(JSON.stringify(state, null, 2));
  else render(state);
  return true;
}

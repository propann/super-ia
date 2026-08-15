import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";

export type EmergencyStopCategory = "manual" | "security" | "budget" | "maintenance";

export interface EmergencyStopState {
  schemaVersion: 1;
  engaged: boolean;
  category: EmergencyStopCategory | null;
  generation: number;
  updatedAt: string;
  engagedAt?: string;
  releasedAt?: string;
}

function missing(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}

function assertCategory(value: unknown): EmergencyStopCategory | null {
  if (value === null) return null;
  if (["manual", "security", "budget", "maintenance"].includes(String(value))) {
    return value as EmergencyStopCategory;
  }
  throw new Error("Catégorie d'arrêt d'urgence invalide.");
}

function validateState(value: unknown, path: string): EmergencyStopState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`État d'arrêt d'urgence invalide : ${path}`);
  }
  const input = value as Record<string, unknown>;
  const category = assertCategory(input.category);
  if (input.schemaVersion !== 1
    || typeof input.engaged !== "boolean"
    || !Number.isInteger(input.generation)
    || Number(input.generation) < 0
    || typeof input.updatedAt !== "string"
    || (input.engaged && category === null)
    || (!input.engaged && category !== null)
    || (input.engagedAt !== undefined && typeof input.engagedAt !== "string")
    || (input.releasedAt !== undefined && typeof input.releasedAt !== "string")) {
    throw new Error(`État d'arrêt d'urgence invalide : ${path}`);
  }
  return {
    schemaVersion: 1,
    engaged: input.engaged,
    category,
    generation: Number(input.generation),
    updatedAt: input.updatedAt,
    engagedAt: input.engagedAt as string | undefined,
    releasedAt: input.releasedAt as string | undefined,
  };
}

async function statePath(controlHome?: string): Promise<string> {
  const control = await ensureControlHome(controlHome);
  const directory = join(control.root, "safety");
  await mkdir(directory, { recursive: true });
  return join(directory, "emergency-stop.json");
}

async function atomicWrite(path: string, state: EmergencyStopState): Promise<void> {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
  await chmod(path, 0o600);
}

export async function loadEmergencyStop(controlHome?: string): Promise<EmergencyStopState> {
  const path = await statePath(controlHome);
  try {
    const state = validateState(JSON.parse(await readFile(path, "utf8")) as unknown, path);
    await chmod(path, 0o600);
    return state;
  } catch (error) {
    if (!missing(error)) throw error;
    const now = new Date().toISOString();
    const state: EmergencyStopState = {
      schemaVersion: 1,
      engaged: false,
      category: null,
      generation: 0,
      updatedAt: now,
      releasedAt: now,
    };
    await atomicWrite(path, state);
    return state;
  }
}

export async function engageEmergencyStop(
  category: EmergencyStopCategory = "manual",
  controlHome?: string,
): Promise<EmergencyStopState> {
  const current = await loadEmergencyStop(controlHome);
  if (current.engaged && current.category === category) return current;
  const now = new Date().toISOString();
  const state: EmergencyStopState = {
    schemaVersion: 1,
    engaged: true,
    category,
    generation: current.generation + 1,
    updatedAt: now,
    engagedAt: now,
    releasedAt: current.releasedAt,
  };
  await atomicWrite(await statePath(controlHome), state);
  return state;
}

export async function releaseEmergencyStop(controlHome?: string): Promise<EmergencyStopState> {
  const current = await loadEmergencyStop(controlHome);
  if (!current.engaged) return current;
  const now = new Date().toISOString();
  const state: EmergencyStopState = {
    schemaVersion: 1,
    engaged: false,
    category: null,
    generation: current.generation + 1,
    updatedAt: now,
    engagedAt: current.engagedAt,
    releasedAt: now,
  };
  await atomicWrite(await statePath(controlHome), state);
  return state;
}

export async function assertExecutionAllowed(controlHome?: string): Promise<EmergencyStopState> {
  const state = await loadEmergencyStop(controlHome);
  if (state.engaged) {
    throw new Error(`Arrêt d'urgence engagé (${state.category}) depuis ${state.engagedAt ?? state.updatedAt}. Seuls les diagnostics et dry-runs restent autorisés.`);
  }
  return state;
}

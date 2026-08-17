import { access, chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";

export interface ArenaState {
  schemaVersion: 1;
  updatedAt: string;
  selected: string[];
  groups: string[][];
}

function arenaPath(root: string): string { return join(root, "arena.json"); }
function missing(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT"; }
function validReference(value: string): boolean { return /^(agent|machine|project):[a-z0-9][a-z0-9._-]{1,63}$/.test(value); }

export function validateArenaState(state: ArenaState): void {
  if (state.schemaVersion !== 1 || !Array.isArray(state.selected) || !Array.isArray(state.groups)) throw new Error("arena.json est invalide ou incompatible.");
  const all = [...state.selected, ...state.groups.flat()];
  if (all.some((value) => typeof value !== "string" || !validReference(value))) throw new Error("Référence d'arène invalide.");
  if (new Set(state.selected).size !== state.selected.length) throw new Error("Sélection d'arène dupliquée.");
  const grouped = new Set<string>();
  for (const group of state.groups) {
    if (group.length < 2) throw new Error("Un groupe d'arène doit contenir au moins deux éléments.");
    if (new Set(group).size !== group.length) throw new Error("Groupe d'arène dupliqué.");
    for (const reference of group) {
      if (grouped.has(reference)) throw new Error(`Élément déjà présent dans un autre groupe : ${reference}`);
      grouped.add(reference);
    }
  }
}

export async function ensureArenaState(root?: string): Promise<{ path: string; state: ArenaState; created: boolean }> {
  const home = await ensureControlHome(root);
  const path = arenaPath(home.root);
  try {
    await access(path);
  } catch (error) {
    if (!missing(error)) throw error;
    const state: ArenaState = { schemaVersion: 1, updatedAt: new Date().toISOString(), selected: [], groups: [] };
    await writeArenaState(state, home.root);
    return { path, state, created: true };
  }
  const state = JSON.parse(await readFile(path, "utf8")) as ArenaState;
  validateArenaState(state);
  return { path, state, created: false };
}

export async function writeArenaState(input: ArenaState, root?: string): Promise<ArenaState> {
  const state: ArenaState = { ...input, schemaVersion: 1, updatedAt: new Date().toISOString(), selected: [...new Set(input.selected)], groups: input.groups.map((group) => [...new Set(group)]) };
  validateArenaState(state);
  const home = await ensureControlHome(root);
  const path = arenaPath(home.root);
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(path, 0o600);
  return state;
}

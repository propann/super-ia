import { access, chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";
import { findExecutable } from "../utils/command.js";
import type { MachineCheck, MachinePlatform, MachineStore, MachineTransport, RemoteMachine } from "./types.js";

function machinePath(root: string): string { return join(root, "machines.json"); }
function validId(value: string): boolean { return /^[a-z0-9][a-z0-9._-]{1,63}$/.test(value); }
function missing(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT"; }

export function validateMachine(machine: RemoteMachine): void {
  if (!validId(machine.id)) throw new Error(`Identifiant de machine invalide : ${machine.id}`);
  if (!machine.label.trim()) throw new Error("Le libellé de machine est requis.");
  if (!["linux", "windows"].includes(machine.platform)) throw new Error(`Plateforme invalide : ${machine.platform}`);
  if (!["ssh", "winrm"].includes(machine.transport)) throw new Error(`Transport invalide : ${machine.transport}`);
  if (!machine.host.trim() || !machine.user.trim()) throw new Error("Hôte et utilisateur requis.");
  if (!Number.isInteger(machine.port) || machine.port < 1 || machine.port > 65_535) throw new Error("Port invalide.");
  if (machine.transport === "winrm" && machine.platform !== "windows") throw new Error("WinRM est réservé à Windows.");
  if (machine.transport === "ssh" && machine.platform === "windows" && !machine.shell) throw new Error("Une machine Windows via SSH doit déclarer son shell.");
  const serialized = JSON.stringify(machine).toLowerCase();
  for (const forbidden of ["password\":", "passwordvalue\":", "secret\":", "token\":"]) {
    if (serialized.includes(forbidden)) throw new Error("Les mots de passe et secrets ne doivent jamais être enregistrés dans machines.json.");
  }
}

async function writeStore(path: string, store: MachineStore): Promise<void> {
  const ids = new Set<string>();
  for (const machine of store.machines) {
    validateMachine(machine);
    if (ids.has(machine.id)) throw new Error(`Machine dupliquée : ${machine.id}`);
    ids.add(machine.id);
  }
  await writeFile(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await chmod(path, 0o600);
}

export async function ensureMachineStore(root?: string): Promise<{ path: string; store: MachineStore; created: boolean }> {
  const home = await ensureControlHome(root);
  const path = machinePath(home.root);
  try { await access(path); } catch (error) {
    if (!missing(error)) throw error;
    const store: MachineStore = { schemaVersion: 1, updatedAt: new Date().toISOString(), machines: defaultMachines() };
    await writeStore(path, store);
    return { path, store, created: true };
  }
  const store = JSON.parse(await readFile(path, "utf8")) as MachineStore;
  if (store.schemaVersion !== 1 || !Array.isArray(store.machines)) throw new Error("machines.json est invalide ou incompatible.");
  if (store.machines.length === 0) {
    store.machines = defaultMachines();
    await writeStore(path, store);
  }
  store.machines.forEach(validateMachine);
  return { path, store, created: false };
}

export async function saveMachine(machine: RemoteMachine, root?: string): Promise<void> {
  const { path, store } = await ensureMachineStore(root);
  validateMachine(machine);
  const now = new Date().toISOString();
  const normalized = { ...machine, createdAt: machine.createdAt || now, updatedAt: now };
  const index = store.machines.findIndex((item) => item.id === machine.id);
  if (index >= 0) store.machines[index] = normalized; else store.machines.push(normalized);
  store.updatedAt = now;
  store.machines.sort((a, b) => a.id.localeCompare(b.id));
  await writeStore(path, store);
}

export async function removeMachine(id: string, root?: string): Promise<boolean> {
  const { path, store } = await ensureMachineStore(root);
  const before = store.machines.length;
  store.machines = store.machines.filter((machine) => machine.id !== id);
  if (before === store.machines.length) return false;
  store.updatedAt = new Date().toISOString();
  await writeStore(path, store);
  return true;
}

export async function inspectMachine(machine: RemoteMachine, executableResolver: (command: string) => Promise<string | undefined> = findExecutable): Promise<MachineCheck> {
  const reasons: string[] = [];
  if (!machine.enabled) return { ...machine, state: "disabled", ready: false, reasons: ["machine désactivée"], networkChecked: false };
  if (machine.transport === "winrm") return { ...machine, state: "manual", ready: false, reasons: ["WinRM est déclaré mais son exécution réseau n'est pas encore câblée"], networkChecked: false };
  if (machine.authMode === "password") return { ...machine, state: "manual", ready: false, reasons: ["L'authentification par mot de passe exige un coffre ou une saisie interactive; aucune valeur n'est stockée"], networkChecked: false };
  if (!(await executableResolver("ssh"))) reasons.push("commande ssh absente du PATH");
  if (machine.platform === "windows" && !machine.shell) reasons.push("shell Windows absent");
  if (reasons.length) return { ...machine, state: "invalid", ready: false, reasons, networkChecked: false };
  return { ...machine, state: machine.authMode === "manual" ? "manual" : "ready", ready: true, reasons: ["SSH configuré; aucun test réseau automatique"], networkChecked: false };
}

export function defaultMachines(now = new Date().toISOString()): RemoteMachine[] {
  return [
    {
      id: "pi5",
      label: "Raspberry Pi 5 (ARM64 / SSH)",
      platform: "linux",
      transport: "ssh",
      host: "192.168.1.50",
      port: 22,
      user: "pi",
      enabled: true,
      authMode: "key",
      sessionName: "superia-pi5",
      notes: "Console matérielle Raspberry Pi 5 sous Raspberry Pi OS 64-bit",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "win11",
      label: "Windows 11 Dev Station (SSH)",
      platform: "windows",
      transport: "ssh",
      host: "192.168.1.100",
      port: 22,
      user: "developer",
      shell: "powershell.exe",
      enabled: true,
      authMode: "key",
      sessionName: "superia-win11",
      notes: "Console distante Windows 11 avec PowerShell 7",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function inspectMachines(root?: string): Promise<MachineCheck[]> {
  const { store } = await ensureMachineStore(root);
  const machines = store.machines.length > 0 ? store.machines : defaultMachines();
  return Promise.all(machines.map((machine) => inspectMachine(machine)));
}

export type { MachinePlatform, MachineTransport };

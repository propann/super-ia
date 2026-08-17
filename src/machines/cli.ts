import { ensureMachineStore, inspectMachines, removeMachine, saveMachine } from "./store.js";
import type { MachineAuthMode, MachinePlatform, MachineTransport, RemoteMachine } from "./types.js";

function valueAfter(args: string[], flag: string): string | undefined { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
function positional(args: string[]): string[] {
  const valueFlags = new Set(["--label", "--platform", "--transport", "--host", "--port", "--user", "--auth", "--identity", "--shell", "--session", "--project-root", "--note"]);
  const result: string[] = [];
  for (let i = 0; i < args.length; i += 1) { if (valueFlags.has(args[i])) { i += 1; continue; } if (!args[i].startsWith("--")) result.push(args[i]); }
  return result;
}

export async function handleMachineCommand(command: string, args: string[], json: boolean): Promise<boolean> {
  if (command !== "machine" && command !== "machines") return false;
  const [subcommand = "list", ...rest] = args.filter((arg) => arg !== "--json");
  if (subcommand === "init") {
    const result = await ensureMachineStore();
    console.log(json ? JSON.stringify(result, null, 2) : `${result.created ? "Créé" : "Déjà présent"} : ${result.path}`);
    return true;
  }
  if (subcommand === "list" || subcommand === "doctor") {
    const checks = await inspectMachines();
    if (json) console.log(JSON.stringify(checks, null, 2));
    else { console.log("Super IA — arène des machines\n"); for (const item of checks) console.log(`${item.state.toUpperCase().padEnd(12)} ${item.id.padEnd(22)} ${item.platform.padEnd(8)} ${item.transport.padEnd(7)} ${item.user}@${item.host}:${item.port} — ${item.label}`); }
    return true;
  }
  if (subcommand === "remove") {
    const id = rest[0]; if (!id) throw new Error("Usage : superia machine remove <ID>");
    if (!await removeMachine(id)) throw new Error(`Machine inconnue : ${id}`);
    console.log(json ? JSON.stringify({ removed: id }) : `Machine supprimée : ${id}`); return true;
  }
  if (subcommand === "add") {
    const id = positional(rest)[0];
    const label = valueAfter(rest, "--label");
    const platform = (valueAfter(rest, "--platform") ?? "linux") as MachinePlatform;
    const transport = (valueAfter(rest, "--transport") ?? "ssh") as MachineTransport;
    const host = valueAfter(rest, "--host"); const user = valueAfter(rest, "--user");
    if (!id || !label || !host || !user) throw new Error("Usage : superia machine add <ID> --label <NOM> --platform linux|windows --transport ssh|winrm --host <HÔTE> --user <UTILISATEUR>");
    const now = new Date().toISOString();
    const machine: RemoteMachine = { id, label, platform, transport, host, user, port: Number(valueAfter(rest, "--port") ?? (transport === "winrm" ? 5985 : 22)), enabled: rest.includes("--enabled"), authMode: (valueAfter(rest, "--auth") ?? "key") as MachineAuthMode, identityFile: valueAfter(rest, "--identity"), shell: valueAfter(rest, "--shell") ?? (platform === "windows" ? "powershell" : "bash"), sessionName: valueAfter(rest, "--session") ?? `superia-${id}`, projectRoot: valueAfter(rest, "--project-root"), notes: valueAfter(rest, "--note") ?? "Machine distante.", createdAt: now, updatedAt: now };
    await saveMachine(machine); console.log(json ? JSON.stringify(machine, null, 2) : `Machine enregistrée : ${machine.id}`); return true;
  }
  throw new Error("Sous-commande machine inconnue. Utiliser init, list, doctor, add ou remove.");
}

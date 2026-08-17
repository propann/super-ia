import { spawn } from "node:child_process";
import type { RemoteMachine } from "../machines/types.js";

interface ConsoleSession {
  machine: RemoteMachine;
  process: any;
  history: string;
  clients: Set<any>;
}

function append(session: ConsoleSession, chunk: string): void {
  session.history = `${session.history}${chunk}`.slice(-12_000);
  for (const client of session.clients) {
    client.write(`event: output\ndata: ${JSON.stringify(chunk)}\n\n`);
  }
}

function sshArgs(machine: RemoteMachine): string[] {
  const args = ["-tt", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3"];
  if (machine.identityFile) args.push("-i", machine.identityFile);
  args.push("-p", String(machine.port), `${machine.user}@${machine.host}`);
  return args;
}

export class ConsoleManager {
  private readonly sessions = new Map<string, ConsoleSession>();

  open(machine: RemoteMachine): ConsoleSession {
    if (machine.transport !== "ssh") throw new Error("Cette console n'utilise pas SSH.");
    if (machine.authMode === "password") throw new Error("Le mot de passe n'est jamais pris par l'interface web; utilisez une clé SSH ou l'agent SSH.");
    if (machine.authMode !== "key" && machine.authMode !== "session") throw new Error("Cette console exige une authentification SSH interactive non câblée.");
    const existing = this.sessions.get(machine.id);
    if (existing) return existing;
    const child = spawn("ssh", sshArgs(machine), { stdio: "pipe" });
    const session: ConsoleSession = { machine, process: child, history: `[SUPER IA] Ouverture SSH vers ${machine.user}@${machine.host}:${machine.port}\n`, clients: new Set() };
    this.sessions.set(machine.id, session);
    child.stdout.on("data", (chunk: any) => append(session, chunk.toString("utf8")));
    child.stderr.on("data", (chunk: any) => append(session, chunk.toString("utf8")));
    child.on("error", (error: Error) => append(session, `[SUPER IA] Erreur SSH: ${error.message}\n`));
    child.on("close", (code: number | null, signal: string | null) => {
      append(session, `\n[SUPER IA] Session terminée (${signal ?? `code ${code ?? "?"}`})\n`);
      for (const client of session.clients) client.end();
      this.sessions.delete(machine.id);
    });
    return session;
  }

  input(machineId: string, data: string): void {
    const session = this.sessions.get(machineId);
    if (!session) throw new Error("Aucune session SSH ouverte pour cette machine.");
    if (!data || data.length > 4_096) throw new Error("Entrée console vide ou trop longue.");
    session.process.stdin.write(data);
  }

  subscribe(machineId: string, response: any): void {
    const session = this.sessions.get(machineId);
    if (!session) throw new Error("Aucune session SSH ouverte pour cette machine.");
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("Cache-Control", "no-cache, no-store");
    response.write(`event: history\ndata: ${JSON.stringify(session.history)}\n\n`);
    session.clients.add(response);
    response.on("close", () => session.clients.delete(response));
  }

  close(machineId: string): void {
    const session = this.sessions.get(machineId);
    if (!session) return;
    session.process.kill("SIGTERM");
    this.sessions.delete(machineId);
  }

  closeAll(): void {
    for (const id of this.sessions.keys()) this.close(id);
  }
}

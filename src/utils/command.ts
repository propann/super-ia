import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CommandOptions {
  cwd?: string;
  timeoutMs?: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export async function runCommand(command: string, args: string[] = [], options: CommandOptions = {}): Promise<CommandResult> {
  const result = await execFileAsync(command, args, {
    cwd: options.cwd,
    timeout: options.timeoutMs ?? 15_000,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    stdout: result.stdout.trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

export async function findExecutable(command: string): Promise<string | undefined> {
  const locator = process.platform === "win32" ? "where" : "which";
  try {
    const { stdout } = await runCommand(locator, [command], { timeoutMs: 3_000 });
    return stdout.split(/\r?\n/)[0] || undefined;
  } catch {
    return undefined;
  }
}

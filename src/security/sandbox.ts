import { randomUUID } from "node:crypto";
import { access, mkdir, realpath, rm } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type {
  ManagedProcessRequest,
  SandboxExecutionSummary,
  SandboxMaskedPath,
} from "../runtime/types.js";

export interface PreparedSandboxInvocation {
  command: string;
  args: string[];
  env: Record<string, string>;
  summary?: SandboxExecutionSummary;
  cleanup(): Promise<void>;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function packageRootForExecutable(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const marker = "/node_modules/";
  const index = normalized.lastIndexOf(marker);
  if (index < 0) return dirname(path);
  const prefix = normalized.slice(0, index + marker.length);
  const remainder = normalized.slice(index + marker.length).split("/").filter(Boolean);
  const packageParts = remainder[0]?.startsWith("@") ? remainder.slice(0, 2) : remainder.slice(0, 1);
  return `${prefix}${packageParts.join("/")}`;
}

async function executableMounts(command: string): Promise<string[]> {
  const mounts = new Set<string>([dirname(resolve(command))]);
  try {
    const target = await realpath(command);
    mounts.add(packageRootForExecutable(target));
  } catch {
    // A direct binary path does not need an additional resolved target mount.
  }
  return [...mounts];
}

function setEnvironmentArguments(env: Record<string, string>): string[] {
  const args: string[] = ["--clearenv"];
  for (const [key, value] of Object.entries(env).sort(([left], [right]) => left.localeCompare(right))) {
    args.push("--setenv", key, value);
  }
  return args;
}

function isInsideWorkspace(workspace: string, path: string): boolean {
  return path === workspace || path.startsWith(`${workspace}${sep}`);
}

async function normalizeMaskedPaths(workspace: string, entries: SandboxMaskedPath[]): Promise<SandboxMaskedPath[]> {
  const byPath = new Map<string, SandboxMaskedPath>();
  for (const entry of entries) {
    const path = resolve(entry.path);
    if (path === workspace || !isInsideWorkspace(workspace, path)) {
      throw new Error(`Masque sandbox hors workspace refusé : ${entry.path}`);
    }
    if (!await pathExists(path)) continue;
    byPath.set(path, { ...entry, path });
  }
  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export async function prepareSandboxInvocation(
  request: ManagedProcessRequest,
  safeEnv: Record<string, string>,
  controlHome: string,
): Promise<PreparedSandboxInvocation> {
  if (!request.sandbox) {
    return {
      command: request.command,
      args: request.args ?? [],
      env: safeEnv,
      cleanup: async () => undefined,
    };
  }
  if (process.platform !== "linux") {
    throw new Error("La sandbox Bubblewrap exige Linux.");
  }
  if (!request.sandbox.executable.trim()) {
    throw new Error("Le chemin de Bubblewrap est vide.");
  }

  const sandboxRoot = join(controlHome, "sandboxes", randomUUID());
  const hostHome = join(sandboxRoot, "home");
  await mkdir(hostHome, { recursive: true });
  const insideHome = "/home/superia";
  const env: Record<string, string> = {
    ...safeEnv,
    HOME: insideHome,
    XDG_CONFIG_HOME: `${insideHome}/.config`,
    XDG_CACHE_HOME: `${insideHome}/.cache`,
    XDG_DATA_HOME: `${insideHome}/.local/share`,
    TMPDIR: "/tmp",
    SUPERIA_SANDBOX: "bubblewrap",
  };

  const workspace = resolve(request.cwd);
  const statePaths = [...new Set((request.sandbox.statePaths ?? []).map((path) => resolve(path)))];
  const writablePaths = [...new Set((request.sandbox.writablePaths ?? []).map((path) => resolve(path)))];
  const requestedReadOnly = [...new Set((request.sandbox.readOnlyPaths ?? []).map((path) => resolve(path)))];
  const maskedPaths = await normalizeMaskedPaths(workspace, request.sandbox.maskedPaths ?? []);
  for (const path of statePaths) await mkdir(path, { recursive: true });
  for (const path of writablePaths) {
    if (!await pathExists(path)) throw new Error(`Chemin d'écriture sandbox introuvable : ${path}`);
    if (maskedPaths.some((masked) => masked.path === path)) throw new Error(`Chemin à la fois inscriptible et masqué : ${path}`);
  }
  const commandMounts = await executableMounts(request.command);
  const readOnlyPaths = [...new Set([...commandMounts, ...requestedReadOnly])]
    .filter((path) => path !== workspace);

  const args: string[] = [
    "--die-with-parent",
    "--new-session",
    "--unshare-user",
    "--disable-userns",
    "--unshare-ipc",
    "--unshare-pid",
    "--unshare-uts",
    "--unshare-cgroup-try",
    "--cap-drop",
    "ALL",
    "--hostname",
    "superia",
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--size",
    String(256 * 1024 * 1024),
    "--perms",
    "0700",
    "--tmpfs",
    "/tmp",
    "--ro-bind-try",
    "/usr",
    "/usr",
    "--ro-bind-try",
    "/bin",
    "/bin",
    "--ro-bind-try",
    "/sbin",
    "/sbin",
    "--ro-bind-try",
    "/lib",
    "/lib",
    "--ro-bind-try",
    "/lib64",
    "/lib64",
    "--ro-bind-try",
    "/etc",
    "/etc",
    "--ro-bind-try",
    "/opt",
    "/opt",
    "--ro-bind-try",
    "/nix",
    "/nix",
    "--ro-bind-try",
    "/snap",
    "/snap",
    "--ro-bind-try",
    "/run/systemd/resolve/stub-resolv.conf",
    "/run/systemd/resolve/stub-resolv.conf",
    "--ro-bind-try",
    "/run/systemd/resolve/resolv.conf",
    "/run/systemd/resolve/resolv.conf",
    "--ro-bind-try",
    "/run/NetworkManager/resolv.conf",
    "/run/NetworkManager/resolv.conf",
    "--bind",
    hostHome,
    insideHome,
  ];

  if (request.sandbox.network === "isolated") args.push("--unshare-net");

  for (const path of readOnlyPaths) {
    if (await pathExists(path)) args.push("--ro-bind", path, path);
  }
  for (const path of statePaths) args.push("--bind", path, path);

  args.push(
    request.sandbox.workspaceAccess === "read-write" ? "--bind" : "--ro-bind",
    workspace,
    workspace,
  );
  for (const path of writablePaths) args.push("--bind", path, path);
  for (const masked of maskedPaths) {
    if (masked.kind === "directory") args.push("--tmpfs", masked.path);
    else args.push("--ro-bind", "/dev/null", masked.path);
  }
  args.push(
    ...setEnvironmentArguments(env),
    "--chdir",
    workspace,
    "--",
    request.command,
    ...(request.args ?? []),
  );

  const summary: SandboxExecutionSummary = {
    engine: "bubblewrap",
    active: true,
    network: request.sandbox.network,
    workspaceAccess: request.sandbox.workspaceAccess,
    ephemeralHome: true,
    statePaths,
    writablePaths,
    readOnlyPaths,
    maskedPaths,
  };

  return {
    command: request.sandbox.executable,
    args,
    env,
    summary,
    cleanup: async () => {
      await rm(sandboxRoot, { recursive: true, force: true });
    },
  };
}

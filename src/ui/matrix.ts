import type { LocalToolCheck, ProviderCheck, RepositoryScan, SuperIaConfig, SuperIaTask } from "../core/types.js";
import { inspectLocalTools, inspectProviders } from "../core/doctor.js";
import { loadProjectConfig } from "../core/config.js";
import { scanRepository } from "../core/repository-scanner.js";
import { listTasks } from "../core/task-store.js";
import { openControlPlane } from "../control/control-plane.js";
import type { ControlStatus, ProjectRecord, RunRecord } from "../control/types.js";

const ANSI = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  brightGreen: "\x1b[92m",
  black: "\x1b[30m",
  greenBg: "\x1b[42m",
  clear: "\x1b[2J\x1b[H",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  altScreen: "\x1b[?1049h",
  normalScreen: "\x1b[?1049l",
};

export interface MatrixSnapshot {
  scan: RepositoryScan;
  providers: ProviderCheck[];
  localTools: LocalToolCheck[];
  tasks: SuperIaTask[];
  config: SuperIaConfig;
  control?: ControlStatus;
  projects?: ProjectRecord[];
  runs?: RunRecord[];
  now: Date;
}

export interface MatrixOptions {
  once?: boolean;
  refreshMs?: number;
  width?: number;
}

export function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function fit(value: string, width: number): string {
  const plain = stripAnsi(value);
  if (plain.length > width) return `${plain.slice(0, Math.max(0, width - 1))}…`;
  return `${value}${" ".repeat(Math.max(0, width - plain.length))}`;
}

function box(title: string, lines: string[], width: number): string[] {
  const inner = Math.max(12, width - 2);
  const heading = ` ${title.toUpperCase()} `;
  const top = `┌${heading}${"─".repeat(Math.max(0, inner - heading.length))}┐`;
  const body = lines.map((line) => `│${fit(line, inner)}│`);
  const bottom = `└${"─".repeat(inner)}┘`;
  return [top, ...body, bottom];
}

function joinColumns(left: string[], right: string[], gap = 2): string[] {
  const leftWidth = Math.max(...left.map((line) => stripAnsi(line).length));
  const height = Math.max(left.length, right.length);
  const rows: string[] = [];
  for (let index = 0; index < height; index += 1) {
    rows.push(`${fit(left[index] ?? "", leftWidth)}${" ".repeat(gap)}${right[index] ?? ""}`);
  }
  return rows;
}

function providerState(provider: ProviderCheck): string {
  if (provider.installed === true) return `${ANSI.brightGreen}● PRÊT${ANSI.reset}`;
  if (provider.installed === null) return `${ANSI.green}◐ ASSISTÉ${ANSI.reset}`;
  return `${ANSI.dim}○ ABSENT${ANSI.reset}`;
}

function localToolState(tool: LocalToolCheck): string {
  return tool.installed
    ? `${ANSI.brightGreen}● LOCAL${ANSI.reset}`
    : `${ANSI.dim}○ ABSENT${ANSI.reset}`;
}

function taskState(task: SuperIaTask): string {
  const symbol: Record<SuperIaTask["status"], string> = {
    planned: "◇",
    ready: "◆",
    running: "▶",
    blocked: "⊘",
    review: "◎",
    done: "✓",
    failed: "!",
    cancelled: "×",
  };
  return `${symbol[task.status]} ${task.id} [${task.priority}] ${task.title}`;
}

function projectState(project: ProjectRecord): string {
  return `${project.status === "active" ? "●" : "○"} ${project.name}  ${project.defaultBranch ?? "-"}`;
}

function runState(run: RunRecord): string {
  const symbol: Record<RunRecord["status"], string> = {
    queued: "◇",
    running: "▶",
    completed: "✓",
    failed: "!",
    cancelled: "×",
    interrupted: "↯",
  };
  return `${symbol[run.status]} ${run.provider}  ${run.taskId ?? run.id.slice(0, 8)}`;
}

function rainLine(width: number, now: Date): string {
  const alphabet = "01ZXCVBNMASDFGHJKLQWERTYUIOP<>[]{}/*+-";
  let seed = now.getTime() >>> 0;
  let result = "";
  for (let index = 0; index < width; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    result += alphabet[seed % alphabet.length];
  }
  return `${ANSI.dim}${ANSI.green}${result}${ANSI.reset}`;
}

export function renderMatrixDashboard(snapshot: MatrixSnapshot, width = 100): string {
  const safeWidth = Math.max(76, width);
  const columnWidth = Math.floor((safeWidth - 2) / 2);
  const readyProviders = snapshot.providers.filter((item) => item.installed === true).length;
  const assistedProviders = snapshot.providers.filter((item) => item.installed === null).length;
  const readyLocalTools = snapshot.localTools.filter((item) => item.installed).length;
  const activeTasks = snapshot.tasks.filter((task) => !["done", "cancelled"].includes(task.status)).length;
  const blockedTasks = snapshot.tasks.filter((task) => task.status === "blocked").length;
  const projects = snapshot.projects ?? [];
  const runs = snapshot.runs ?? [];
  const control = snapshot.control;

  const repo = box("dépôt courant", [
    `${ANSI.bright}NOM${ANSI.reset}       ${snapshot.scan.name}`,
    `${ANSI.bright}BRANCHE${ANSI.reset}   ${snapshot.scan.branch ?? "hors Git"}`,
    `${ANSI.bright}ÉTAT${ANSI.reset}      ${snapshot.scan.dirty ? "MODIFICATIONS LOCALES" : "PROPRE"}`,
    `${ANSI.bright}STACK${ANSI.reset}     ${snapshot.scan.languages.join(", ") || "inconnue"}`,
    `${ANSI.bright}CHECKS${ANSI.reset}    ${snapshot.scan.recommendedChecks.length}`,
  ], columnWidth);

  const system = box("plan de contrôle", [
    `${ANSI.brightGreen}SUPER IA // MATRIX CONTROL${ANSI.reset}`,
    `SQLite          ${control ? `${control.journalMode.toUpperCase()} / schéma ${control.schemaVersion}` : "indisponible"}`,
    `Projets         ${control?.projects ?? projects.length}`,
    `Missions        ${control?.tasks ?? snapshot.tasks.length} (${activeTasks} actives, ${blockedTasks} bloquées)`,
    `Runs            ${control?.runs ?? runs.length} (${control?.activeRuns ?? runs.filter((run) => run.status === "running").length} actifs)`,
    `Événements      ${control?.events ?? 0}`,
  ], columnWidth);

  const providers = box("réseau IA", snapshot.providers.slice(0, 8).map((provider) => `${providerState(provider)}  ${provider.name}`), columnWidth);
  const tasks = box("missions du dépôt", snapshot.tasks.length ? snapshot.tasks.slice(-8).reverse().map(taskState) : ["Aucune mission enregistrée.", "superia task create \"objectif\""], columnWidth);

  const projectPanel = box("projets globaux", projects.length ? projects.slice(0, 8).map(projectState) : ["Aucun projet global.", "superia project add ."], columnWidth);
  const runPanel = box("runs récents", runs.length ? runs.slice(0, 8).map(runState) : ["Aucun run enregistré.", "superia agent run codex TASK-0001 --dry-run"], columnWidth);

  const localTools = box("outils locaux", snapshot.localTools.slice(0, 8).map((tool) => `${localToolState(tool)}  ${tool.name} [${tool.category}]`), columnWidth);
  const policy = box("politique", [
    `IA prêtes        ${readyProviders}`,
    `IA assistées     ${assistedProviders}`,
    `Outils locaux    ${readyLocalTools}/${snapshot.localTools.length}`,
    `API              ${snapshot.config.policy.allowApi ? "AUTORISÉES" : "VERROUILLÉES"}`,
    `Budget mensuel   ${snapshot.config.policy.monthlyApiBudgetEur.toFixed(2)} €`,
    `Fusion humaine   ${snapshot.config.policy.requireHumanApprovalBeforeMerge ? "OBLIGATOIRE" : "NON"}`,
    `Secrets          ${snapshot.config.policy.redactSecretsBeforeRemoteSend ? "EXPURGÉS" : "ATTENTION"}`,
  ], columnWidth);

  const actions = box("commandes", [
    `[R] rafraîchir       [Q] quitter`,
    `superia task board   suivi des tâches`,
    `superia project list voir tous les projets`,
    `superia run list     voir les exécutions`,
    `superia security scan scanner les secrets`,
    `superia backup list  voir les sauvegardes`,
    `superia daemon --once synchroniser/récupérer`,
  ], safeWidth);

  const header = [
    rainLine(safeWidth, snapshot.now),
    `${ANSI.greenBg}${ANSI.black}${ANSI.bright} SUPER IA ${ANSI.reset} ${ANSI.brightGreen}CONSOLE DE CONTRÔLE MULTI-PROJETS${ANSI.reset}`,
    `${ANSI.dim}Canal local sécurisé // ${snapshot.now.toLocaleString("fr-FR")}${ANSI.reset}`,
    "",
  ];

  return [
    ...header,
    ...joinColumns(repo, system),
    "",
    ...joinColumns(providers, tasks),
    "",
    ...joinColumns(projectPanel, runPanel),
    "",
    ...joinColumns(localTools, policy),
    "",
    ...actions,
    "",
    rainLine(safeWidth, new Date(snapshot.now.getTime() + 7)),
  ].join("\n");
}

async function captureSnapshot(root: string): Promise<MatrixSnapshot> {
  const scan = await scanRepository(root);
  const [providers, localTools, tasks, config] = await Promise.all([
    inspectProviders(),
    inspectLocalTools(),
    listTasks(scan.root),
    loadProjectConfig(scan.root),
  ]);
  const controlPlane = await openControlPlane();
  try {
    return {
      scan,
      providers,
      localTools,
      tasks,
      config,
      control: controlPlane.status(),
      projects: controlPlane.listProjects(),
      runs: controlPlane.listRuns().slice(0, 20),
      now: new Date(),
    };
  } finally {
    controlPlane.close();
  }
}

export async function runMatrixConsole(root: string, options: MatrixOptions = {}): Promise<void> {
  const render = async (): Promise<void> => {
    const snapshot = await captureSnapshot(root);
    const output = renderMatrixDashboard(snapshot, options.width ?? process.stdout.columns ?? 100);
    process.stdout.write(`${options.once ? "" : ANSI.clear}${output}\n`);
  };

  if (options.once) {
    await render();
    return;
  }

  process.stdout.write(`${ANSI.altScreen}${ANSI.hideCursor}`);
  let rendering = false;
  const safeRender = async (): Promise<void> => {
    if (rendering) return;
    rendering = true;
    try {
      await render();
    } finally {
      rendering = false;
    }
  };
  await safeRender();
  const timer = setInterval(() => {
    void safeRender();
  }, Math.max(500, options.refreshMs ?? 2_000));

  const onKey = (key: string): void => {
    if (key === "q" || key === "Q" || key === "\u0003") cleanup();
    if (key === "r" || key === "R") void safeRender();
  };

  const cleanup = (): void => {
    clearInterval(timer);
    process.stdin.setRawMode?.(false);
    process.stdin.pause();
    process.stdin.off("data", onKey);
    process.stdout.write(`${ANSI.showCursor}${ANSI.normalScreen}`);
    process.off("SIGINT", cleanup);
    process.off("SIGTERM", cleanup);
  };

  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode?.(Boolean(process.stdin.isTTY));
  process.stdin.resume();
  process.stdin.on("data", onKey);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

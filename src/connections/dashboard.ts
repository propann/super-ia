import type { ConnectionCheck } from "./types.js";

const ANSI = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  brightGreen: "\x1b[92m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function marker(item: ConnectionCheck): string {
  if (item.state === "ready" || item.state === "configured") return `${ANSI.brightGreen}●${ANSI.reset}`;
  if (item.state === "manual") return `${ANSI.cyan}◐${ANSI.reset}`;
  if (item.state === "disabled") return `${ANSI.dim}○${ANSI.reset}`;
  if (item.state === "needs-auth") return `${ANSI.yellow}◆${ANSI.reset}`;
  return `${ANSI.red}!${ANSI.reset}`;
}

function line(value: string, width: number): string {
  const plain = value.replace(/\x1b\[[0-9;]*m/g, "");
  if (plain.length >= width) return plain.slice(0, Math.max(0, width - 1)) + "…";
  return value + " ".repeat(width - plain.length);
}

export function renderConnectionDashboard(checks: ConnectionCheck[], width = 112): string {
  const enabled = checks.filter((item) => item.enabled);
  const ready = enabled.filter((item) => item.ready).length;
  const auth = enabled.filter((item) => item.state === "needs-auth").length;
  const broken = enabled.filter((item) => ["missing-command", "invalid"].includes(item.state)).length;
  const kinds = [...new Set(checks.map((item) => item.kind))];
  const rows = checks.map((item) => {
    const detail = item.reasons[0] ?? item.executablePath ?? item.baseUrl ?? item.host ?? "configuration disponible";
    return `${marker(item)} ${item.id.padEnd(27)} ${item.kind.padEnd(19)} ${item.state.padEnd(15)} ${detail}`;
  });
  const header = [
    `${ANSI.green}${"01".repeat(Math.floor(width / 2))}${ANSI.reset}`,
    `${ANSI.bright}${ANSI.brightGreen}SUPER IA // CONNECTION MATRIX${ANSI.reset}`,
    `${ANSI.dim}Aucun secret affiché • aucun test réseau automatique • toutes les connexions désactivées par défaut${ANSI.reset}`,
    "",
    `Connexions: ${checks.length}  Activées: ${enabled.length}  Prêtes/configurées: ${ready}  Auth: ${auth}  Erreurs: ${broken}  Transports: ${kinds.length}`,
    "",
    "  ID                          TRANSPORT           ÉTAT            DÉTAIL",
    "  " + "─".repeat(Math.max(20, width - 2)),
  ];
  const footer = [
    "",
    `${ANSI.cyan}Commandes:${ANSI.reset} connection enable <ID> • connection doctor • connection secrets-template`,
    `${ANSI.dim}Les endpoints locaux restent expérimentaux et aucun modèle n'est installé automatiquement.${ANSI.reset}`,
  ];
  return [...header, ...rows.map((row) => line(row, width)), ...footer].join("\n");
}

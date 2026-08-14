import type { SecretFinding } from "./types.js";

const deniedNames = new Set([
  ".env",
  ".npmrc",
  ".pypirc",
  ".netrc",
  ".git-credentials",
  ".vault-token",
  "auth.json",
  "credentials.json",
  "secrets.json",
  "terraform.tfstate",
  "terraform.tfstate.backup",
  "id_rsa",
  "id_ed25519",
  "known_hosts",
]);

const deniedExtensions = [
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".jks",
  ".keystore",
  ".db",
  ".sqlite",
  ".sqlite3",
  ".kdbx",
  ".age",
  ".gpg",
  ".pgp",
  ".ovpn",
  ".mobileconfig",
];

const secretRules: Array<{ name: string; pattern: RegExp; message: string }> = [
  {
    name: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    message: "Clé privée détectée.",
  },
  {
    name: "aws-access-key",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
    message: "Identifiant AWS détecté.",
  },
  {
    name: "github-token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    message: "Jeton GitHub détecté.",
  },
  {
    name: "openai-style-key",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
    message: "Clé de service au format sk-* détectée.",
  },
  {
    name: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/,
    message: "Clé API Google détectée.",
  },
  {
    name: "slack-token",
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/,
    message: "Jeton Slack détecté.",
  },
];

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function sensitivePathReason(path: string): string | undefined {
  const normalized = normalizePath(path);
  const segments = normalized.toLowerCase().split("/");
  const name = segments.at(-1) ?? "";
  const sensitiveDirectories = [".git", ".ssh", ".gnupg", ".aws", ".azure", ".kube", ".docker", ".terraform"];
  if (sensitiveDirectories.some((segment) => segments.includes(segment))) {
    return "répertoire sensible";
  }
  if (deniedNames.has(name) || name.startsWith(".env.")) return "fichier de secrets";
  if (deniedExtensions.some((extension) => name.endsWith(extension))) return "donnée privée ou matériel cryptographique";
  return undefined;
}

export function scanTextForSecrets(path: string, content: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of secretRules) {
      if (rule.pattern.test(line)) {
        findings.push({
          path,
          rule: rule.name,
          line: index + 1,
          severity: "high",
          message: rule.message,
        });
      }
    }
  }
  return findings;
}

export function looksBinary(content: string): boolean {
  if (!content.length) return false;
  if (content.includes("\u0000")) return true;
  const sample = content.slice(0, 8_192);
  let controls = 0;
  for (const character of sample) {
    const code = character.charCodeAt(0);
    if (code < 9 || (code > 13 && code < 32)) controls += 1;
  }
  return controls / sample.length > 0.02;
}

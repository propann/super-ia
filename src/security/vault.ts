import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureControlHome } from "../control/home.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM

export interface VaultEntry {
  provider: string; // e.g. "openai", "anthropic", "gemini", "groq", "xai", "mistral", "deepseek", "openrouter"
  envVarName: string; // e.g. "OPENAI_API_KEY"
  iv: string; // hex
  tag: string; // hex
  data: string; // hex
  preview: string; // e.g. "sk-ant-••••••••••••3f8a"
  preferredMode: "cli" | "api" | "hybrid";
  customBaseUrl?: string;
  updatedAt: string;
}

export interface VaultStore {
  schemaVersion: 1;
  updatedAt: string;
  entries: Record<string, VaultEntry>;
}

export const PROVIDER_ENV_DEFAULTS: Record<string, { envVar: string; defaultUrl: string; label: string; cliCommand: string }> = {
  groq: {
    envVar: "GROQ_API_KEY",
    defaultUrl: "https://api.groq.com/openai/v1",
    label: "Groq (Inférence Ultra-Rapide / Économique)",
    cliCommand: "groq"
  },
  openai: {
    envVar: "OPENAI_API_KEY",
    defaultUrl: "https://api.openai.com/v1",
    label: "OpenAI (GPT-4o, o3-mini, Codex)",
    cliCommand: "codex"
  },
  anthropic: {
    envVar: "ANTHROPIC_API_KEY",
    defaultUrl: "https://api.anthropic.com",
    label: "Anthropic (Claude 3.7 Sonnet, Haiku)",
    cliCommand: "claude"
  },
  gemini: {
    envVar: "GEMINI_API_KEY",
    defaultUrl: "https://generativelanguage.googleapis.com",
    label: "Google Gemini (2.5 Pro, Flash)",
    cliCommand: "gemini"
  },
  xai: {
    envVar: "XAI_API_KEY",
    defaultUrl: "https://api.x.ai/v1",
    label: "xAI (Grok 3, Grok Beta)",
    cliCommand: "grok"
  },
  mistral: {
    envVar: "MISTRAL_API_KEY",
    defaultUrl: "https://api.mistral.ai/v1",
    label: "Mistral AI (Large 2, Codestral / Vibe)",
    cliCommand: "vibe"
  },
  deepseek: {
    envVar: "DEEPSEEK_API_KEY",
    defaultUrl: "https://api.deepseek.com",
    label: "DeepSeek (V3, R1 Raisonnement)",
    cliCommand: "deepseek"
  },
  openrouter: {
    envVar: "OPENROUTER_API_KEY",
    defaultUrl: "https://openrouter.ai/api/v1",
    label: "OpenRouter (Passerelle Multi-Modèles)",
    cliCommand: "openrouter"
  }
};

function credentialsDir(root: string): string {
  return join(root, "credentials");
}

function keyFilePath(root: string): string {
  return join(credentialsDir(root), ".vault.key");
}

function vaultFilePath(root: string): string {
  return join(credentialsDir(root), "vault.enc");
}

export function maskSecret(secret: string): string {
  const trimmed = secret.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  const start = trimmed.slice(0, Math.min(6, Math.floor(trimmed.length / 4)));
  const end = trimmed.slice(-4);
  return `${start}••••••••${end}`;
}

export async function ensureVaultMasterKey(root?: string): Promise<Buffer> {
  const home = await ensureControlHome(root);
  const dir = credentialsDir(home.root);
  await mkdir(dir, { recursive: true });
  await chmod(dir, 0o700).catch(() => {});

  const keyPath = keyFilePath(home.root);
  try {
    const raw = await readFile(keyPath);
    if ((raw as any).length === 32 || (raw as any).byteLength === 32) return raw as unknown as Buffer;
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }

  // Generate 32 cryptographically secure bytes
  const newKey = randomBytes(32) as unknown as Buffer;
  await writeFile(keyPath, newKey as any);
  await chmod(keyPath, 0o600).catch(() => {});
  return newKey;
}

export async function loadVaultStore(root?: string): Promise<{ path: string; store: VaultStore }> {
  const home = await ensureControlHome(root);
  const path = vaultFilePath(home.root);
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as VaultStore;
    if (parsed && parsed.schemaVersion === 1 && typeof parsed.entries === "object") {
      return { path, store: parsed };
    }
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.warn("Erreur lecture vault.enc, réinitialisation:", error);
    }
  }

  const emptyStore: VaultStore = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    entries: {}
  };
  return { path, store: emptyStore };
}

async function writeVaultStore(path: string, store: VaultStore): Promise<void> {
  store.updatedAt = new Date().toISOString();
  await writeFile(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await chmod(path, 0o600).catch(() => {});
}

export function encryptPayload(plainText: string, masterKey: any): { iv: string; tag: string; data: string } {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return {
    iv: (iv as any).toString("hex"),
    tag: (tag as any).toString("hex"),
    data: encrypted
  };
}

export function decryptPayload(encrypted: { iv: string; tag: string; data: string }, masterKey: any): string {
  const iv = Buffer.from(encrypted.iv, "hex");
  const tag = Buffer.from(encrypted.tag, "hex");
  const decipher = createDecipheriv(ALGORITHM, masterKey, iv as any);
  decipher.setAuthTag(tag as any);
  let decrypted = decipher.update(encrypted.data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function saveEncryptedApiKey(
  provider: string,
  apiKey: string,
  options: {
    envVarName?: string;
    preferredMode?: "cli" | "api" | "hybrid";
    customBaseUrl?: string;
    root?: string;
  } = {}
): Promise<{ provider: string; preview: string; preferredMode: string }> {
  const masterKey = await ensureVaultMasterKey(options.root);
  const { path, store } = await loadVaultStore(options.root);

  const cleanKey = apiKey.trim();
  const providerLower = provider.toLowerCase();
  const envVar = options.envVarName || PROVIDER_ENV_DEFAULTS[providerLower]?.envVar || `${providerLower.toUpperCase()}_API_KEY`;
  const preferredMode = options.preferredMode || "api";
  const customBaseUrl = options.customBaseUrl || PROVIDER_ENV_DEFAULTS[providerLower]?.defaultUrl;

  const encrypted = encryptPayload(cleanKey, masterKey);
  const preview = maskSecret(cleanKey);

  store.entries[providerLower] = {
    provider: providerLower,
    envVarName: envVar,
    iv: encrypted.iv,
    tag: encrypted.tag,
    data: encrypted.data,
    preview,
    preferredMode,
    customBaseUrl,
    updatedAt: new Date().toISOString()
  };

  await writeVaultStore(path, store);
  return { provider: providerLower, preview, preferredMode };
}

export async function getDecryptedApiKey(provider: string, root?: string): Promise<string | undefined> {
  const { store } = await loadVaultStore(root);
  const entry = store.entries[provider.toLowerCase()];
  if (!entry) return undefined;
  try {
    const masterKey = await ensureVaultMasterKey(root);
    return decryptPayload(entry, masterKey);
  } catch (err) {
    console.error(`Impossible de déchiffrer la clé pour ${provider}:`, err);
    return undefined;
  }
}

export async function deleteEncryptedApiKey(provider: string, root?: string): Promise<boolean> {
  const { path, store } = await loadVaultStore(root);
  const providerLower = provider.toLowerCase();
  if (!store.entries[providerLower]) return false;
  delete store.entries[providerLower];
  await writeVaultStore(path, store);
  return true;
}

export async function listVaultEntries(root?: string): Promise<Array<{
  provider: string;
  envVarName: string;
  preview: string;
  preferredMode: "cli" | "api" | "hybrid";
  customBaseUrl?: string;
  isConfigured: boolean;
  updatedAt: string;
}>> {
  const { store } = await loadVaultStore(root);
  const results: Array<{
    provider: string;
    envVarName: string;
    preview: string;
    preferredMode: "cli" | "api" | "hybrid";
    customBaseUrl?: string;
    isConfigured: boolean;
    updatedAt: string;
  }> = [];

  const allProviders = Object.keys(PROVIDER_ENV_DEFAULTS);
  for (const p of allProviders) {
    const entry = store.entries[p];
    if (entry) {
      results.push({
        provider: p,
        envVarName: entry.envVarName,
        preview: entry.preview,
        preferredMode: entry.preferredMode || "api",
        customBaseUrl: entry.customBaseUrl,
        isConfigured: true,
        updatedAt: entry.updatedAt
      });
    } else {
      results.push({
        provider: p,
        envVarName: PROVIDER_ENV_DEFAULTS[p].envVar,
        preview: "",
        preferredMode: "cli",
        customBaseUrl: PROVIDER_ENV_DEFAULTS[p].defaultUrl,
        isConfigured: false,
        updatedAt: ""
      });
    }
  }

  return results;
}

export async function getDecryptedEnvironment(root?: string): Promise<Record<string, string>> {
  const { store } = await loadVaultStore(root);
  const entries = Object.values(store.entries);
  if (!entries.length) return {};
  const masterKey = await ensureVaultMasterKey(root);
  const env: Record<string, string> = {};

  for (const entry of entries) {
    try {
      const decrypted = decryptPayload(entry, masterKey);
      if (decrypted) {
        env[entry.envVarName] = decrypted;
      }
    } catch {
      // ignore single decryption failure
    }
  }
  return env;
}

import type { AiConnection, ConnectionAuthMode, ConnectionKind } from "./types.js";

interface Seed {
  id: string;
  label: string;
  kind: ConnectionKind;
  providerId?: string;
  authMode: ConnectionAuthMode;
  command?: string;
  baseUrl?: string;
  host?: string;
  requiredEnv?: string[];
  protocolVersion?: string;
  notes: string;
}

const seeds: Seed[] = [
  { id: "codex-cli", label: "OpenAI Codex CLI", kind: "cli-session", providerId: "codex-cli", authMode: "session", command: "codex", notes: "Connexion ChatGPT interactive ou clé OpenAI gérée hors dépôt." },
  { id: "claude-code", label: "Anthropic Claude Code", kind: "cli-session", providerId: "claude-code", authMode: "session", command: "claude", notes: "Connexion navigateur, organisation ou clé Anthropic selon le compte." },
  { id: "mistral-vibe", label: "Mistral Vibe", kind: "cli-session", providerId: "mistral-vibe", authMode: "session", command: "vibe", notes: "Session Vibe ou MISTRAL_API_KEY hors dépôt." },
  { id: "gemini-cli", label: "Google Gemini CLI", kind: "cli-session", providerId: "gemini-cli", authMode: "session", command: "gemini", notes: "Connexion Google interactive ou clé Gemini." },
  { id: "qwen-code", label: "Qwen Code", kind: "cli-session", providerId: "qwen-code", authMode: "session", command: "qwen", notes: "Assistant multi-fournisseurs avec authentification interactive." },
  { id: "opencode", label: "OpenCode", kind: "cli-session", providerId: "opencode", authMode: "session", command: "opencode", notes: "Coquille multi-fournisseurs configurée avec /connect." },
  { id: "aider", label: "Aider", kind: "cli-session", providerId: "aider", authMode: "environment", command: "aider", notes: "Supporte de nombreux fournisseurs et endpoints compatibles." },
  { id: "mini-swe-agent", label: "mini-SWE-agent", kind: "cli-session", providerId: "mini-swe-agent", authMode: "environment", command: "mini", notes: "Agent minimal, à maintenir en mode confirmation dans Super IA." },

  { id: "openai-api", label: "OpenAI API", kind: "api-key-env", providerId: "openai", authMode: "environment", baseUrl: "https://api.openai.com/v1", requiredEnv: ["OPENAI_API_KEY"], notes: "API officielle, désactivée tant qu'un budget explicite n'est pas configuré." },
  { id: "anthropic-api", label: "Anthropic API", kind: "api-key-env", providerId: "anthropic", authMode: "environment", baseUrl: "https://api.anthropic.com", requiredEnv: ["ANTHROPIC_API_KEY"], notes: "API officielle Anthropic." },
  { id: "mistral-api", label: "Mistral API", kind: "api-key-env", providerId: "mistral", authMode: "environment", baseUrl: "https://api.mistral.ai/v1", requiredEnv: ["MISTRAL_API_KEY"], notes: "API officielle Mistral." },
  { id: "gemini-api", label: "Google Gemini API", kind: "api-key-env", providerId: "gemini", authMode: "environment", baseUrl: "https://generativelanguage.googleapis.com", requiredEnv: ["GEMINI_API_KEY"], notes: "API Gemini ou configuration Google Cloud selon le compte." },
  { id: "openrouter", label: "OpenRouter", kind: "openai-compatible", providerId: "openrouter", authMode: "environment", baseUrl: "https://openrouter.ai/api/v1", requiredEnv: ["OPENROUTER_API_KEY"], notes: "Passerelle multi-modèles compatible OpenAI." },
  { id: "deepseek-api", label: "DeepSeek API", kind: "openai-compatible", providerId: "deepseek", authMode: "environment", baseUrl: "https://api.deepseek.com", requiredEnv: ["DEEPSEEK_API_KEY"], notes: "Endpoint compatible OpenAI." },
  { id: "groq-api", label: "Groq API", kind: "openai-compatible", providerId: "groq", authMode: "environment", baseUrl: "https://api.groq.com/openai/v1", requiredEnv: ["GROQ_API_KEY"], notes: "Endpoint compatible OpenAI." },
  { id: "generic-openai-compatible", label: "Endpoint compatible OpenAI", kind: "openai-compatible", providerId: "generic", authMode: "environment", requiredEnv: ["OPENAI_API_KEY"], notes: "Base URL et nom de variable configurables sans enregistrer la valeur du secret." },

  { id: "mcp-stdio", label: "Serveur MCP stdio", kind: "mcp-stdio", authMode: "none", notes: "Processus local lancé avec une commande explicite." },
  { id: "mcp-http", label: "Serveur MCP HTTP", kind: "mcp-http", authMode: "environment", protocolVersion: "MCP", notes: "Endpoint HTTP/S avec secrets référencés par variables d'environnement." },
  { id: "acp-stdio", label: "Agent ACP stdio", kind: "acp-stdio", authMode: "none", protocolVersion: "ACP", notes: "Agent de code piloté par protocole Agent Client Protocol." },
  { id: "a2a-http", label: "Agent A2A HTTP", kind: "a2a-http", authMode: "environment", protocolVersion: "A2A", notes: "Worker distant avec carte d'agent et cycle de tâches." },
  { id: "ssh-worker", label: "Worker distant SSH", kind: "ssh-cli", authMode: "session", command: "ssh", notes: "Exécute un agent CLI sur une autre machine sans copier les clés dans Super IA." },

  { id: "chatgpt-web", label: "ChatGPT Web assisté", kind: "web-assisted", authMode: "manual", notes: "Paquet de contexte préparé puis transfert humain contrôlé." },
  { id: "claude-web", label: "Claude Web assisté", kind: "web-assisted", authMode: "manual", notes: "Paquet de contexte expurgé et import manuel." },
  { id: "mistral-web", label: "Mistral Le Chat assisté", kind: "web-assisted", authMode: "manual", notes: "Utilisation manuelle de l'interface officielle." },
  { id: "deepseek-web", label: "DeepSeek Web assisté", kind: "web-assisted", authMode: "manual", notes: "Utilisation manuelle sans automatisation fragile." },

  { id: "ollama-local", label: "Ollama local expérimental", kind: "local-endpoint", providerId: "ollama", authMode: "none", baseUrl: "http://127.0.0.1:11434", notes: "Catalogue seulement; aucun modèle local n'est installé par défaut." },
  { id: "lmstudio-local", label: "LM Studio local expérimental", kind: "local-endpoint", providerId: "lmstudio", authMode: "none", baseUrl: "http://127.0.0.1:1234/v1", notes: "Endpoint compatible OpenAI, désactivé par défaut." },
  { id: "localai-local", label: "LocalAI expérimental", kind: "local-endpoint", providerId: "localai", authMode: "none", baseUrl: "http://127.0.0.1:8080/v1", notes: "Endpoint local optionnel hors MVP Pi." }
];

export function defaultConnections(now = new Date().toISOString()): AiConnection[] {
  return seeds.map((seed) => ({
    ...seed,
    enabled: false,
    args: [],
    requiredEnv: seed.requiredEnv ?? [],
    createdAt: now,
    updatedAt: now,
  }));
}

export const connectionCatalog = seeds.map((seed) => ({ ...seed, requiredEnv: seed.requiredEnv ?? [] }));

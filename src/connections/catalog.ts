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
  model?: string;
  role?: string;
  systemPrompt?: string;
  isLeader?: boolean;
  authPath?: "cli" | "api" | "hybrid";
}

const seeds: Seed[] = [
  {
    id: "claude-3-7-sonnet",
    label: "Claude 3.7 Sonnet — Architecte & Chef",
    kind: "cli-session",
    providerId: "claude-code",
    authMode: "session",
    command: "claude",
    model: "claude-3-7-sonnet",
    role: "Chef d'équipe & Architecte",
    isLeader: true,
    authPath: "cli",
    systemPrompt: "Tu es le Chef d'équipe & Architecte Système. Tu analyses la structure globale, segments les tâches techniques et coordonnes l'exécution entre les experts du groupe.",
    notes: "Rôle: Chef d'équipe & Architecte. Pilotage de projet, décomposition modulaire et arbitrage technique."
  },
  {
    id: "gpt-4o-coder",
    label: "GPT-4o — Codeur Principal",
    kind: "cli-session",
    providerId: "codex-cli",
    authMode: "session",
    command: "codex",
    model: "gpt-4o",
    role: "Codeur Principal",
    isLeader: false,
    authPath: "cli",
    systemPrompt: "Tu es le Codeur Principal. Tu rédiges et implémentes le code métier avec typage strict, modularité et couverture de tests.",
    notes: "Rôle: Codeur Principal & Architecture. Génération, refactoring et complétion TypeScript/Python."
  },
  {
    id: "groq-llama-3-3",
    label: "Groq Llama 3.3 70B — Inférence Éclair",
    kind: "openai-compatible",
    providerId: "groq",
    authMode: "environment",
    baseUrl: "https://api.groq.com/openai/v1",
    requiredEnv: ["GROQ_API_KEY"],
    model: "llama-3.3-70b-versatile",
    role: "Codeur Éclair & Prototypage",
    authPath: "api",
    systemPrompt: "Tu es le Codeur Éclair Groq (500+ tok/s). Tu génères rapidement des prototypes, scripts et implémentations fonctionnelles.",
    notes: "Rôle: Codeur Éclair & Prototypage. Inférence ultra-rapide pour génération instantanée et scripts."
  },
  {
    id: "gemini-2-5-pro",
    label: "Gemini 2.5 Pro — Super Contexte",
    kind: "cli-session",
    providerId: "gemini-cli",
    authMode: "session",
    command: "gemini",
    model: "gemini-2.5-pro",
    role: "Super Contexte & Multimodal",
    authPath: "cli",
    systemPrompt: "Tu es l'Analyste Grand Contexte Gemini. Tu absorbes les dépôts complets (2M tokens) et documentations volumineuses pour guider les décisions.",
    notes: "Rôle: Super Contexte & Multimodal. Analyse de dépôts complets (2M tokens) et documentation."
  },
  {
    id: "grok-3-reason",
    label: "Grok 3 — Débogage & Invariants",
    kind: "openai-compatible",
    providerId: "xai",
    authMode: "environment",
    baseUrl: "https://api.x.ai/v1",
    requiredEnv: ["XAI_API_KEY"],
    model: "grok-3",
    role: "Débogage Profond & Algorithmique",
    authPath: "api",
    systemPrompt: "Tu es l'Expert Débogage & Logique Grok 3. Tu isoles les bogues complexes, vérifies les invariants et optimises la robustesse.",
    notes: "Rôle: Débogage Profond & Algorithmique. Traçage d'erreurs complexes et logique pure."
  },
  {
    id: "mistral-large-2",
    label: "Mistral Large 2 — Validateur Souverain",
    kind: "api-key-env",
    providerId: "mistral",
    authMode: "environment",
    baseUrl: "https://api.mistral.ai/v1",
    requiredEnv: ["MISTRAL_API_KEY"],
    model: "mistral-large-latest",
    role: "Contrôle Qualité & Validateur",
    authPath: "api",
    systemPrompt: "Tu es le Validateur Qualité Souverain Mistral. Tu effectues des revues de code rigoureuses et vérifies le respect des critères de sécurité et conformité.",
    notes: "Rôle: Contrôle Qualité & Souveraineté. Revue de conformité et validation stricte."
  },
  {
    id: "deepseek-r1-reason",
    label: "DeepSeek R1 — Raisonnement Math",
    kind: "openai-compatible",
    providerId: "deepseek",
    authMode: "environment",
    baseUrl: "https://api.deepseek.com",
    requiredEnv: ["DEEPSEEK_API_KEY"],
    model: "deepseek-reasoner",
    role: "Raisonnement Mathématique & STEM",
    authPath: "api",
    systemPrompt: "Tu es le Spécialiste Raisonnement Mathématique & Algorithmique DeepSeek R1. Tu résous les calculs mathématiques, arbres de décision et algorithmes optimaux.",
    notes: "Rôle: Raisonnement Mathématique & STEM. Résolution algorithmique et calculs distribués."
  },
  {
    id: "ui-designer-ia",
    label: "Agent Dessin & UI/UX",
    kind: "openai-compatible",
    providerId: "gemini",
    authMode: "environment",
    baseUrl: "https://generativelanguage.googleapis.com",
    requiredEnv: ["GEMINI_API_KEY"],
    model: "gemini-2.5-flash",
    role: "Dessinateur & Designer UI/UX",
    authPath: "api",
    systemPrompt: "Tu es le Designer UI/UX & Dessinateur. Tu crées des interfaces ergonomiques, des composants CSS modernes, des maquettes SVG et des icônes vectorielles.",
    notes: "Rôle: Designer UI/UX & Visuels. Création de composants CSS, maquettes SVG et ergonomie."
  },
  {
    id: "embedded-hardware-ia",
    label: "Spécialiste Microcontrôleurs & IoT",
    kind: "openai-compatible",
    providerId: "openai",
    authMode: "environment",
    baseUrl: "https://api.openai.com/v1",
    requiredEnv: ["OPENAI_API_KEY"],
    model: "gpt-4o",
    role: "Spécialiste Microcontrôleurs (ESP32/STM32/Pico)",
    authPath: "api",
    systemPrompt: "Tu es le Spécialiste Microcontrôleurs (ESP32, STM32, Arduino, Raspberry Pi Pico). Tu développes du code embarqué C/C++, gères GPIO, I2C, SPI, UART, PWM et contraintes temps réel.",
    notes: "Rôle: Firmware ESP32 / Pico / Arduino. Programmation bas niveau C++, GPIO, I2C, SPI et PWM."
  },
  {
    id: "audio-midi-ia",
    label: "Spécialiste Musique & MIDI",
    kind: "openai-compatible",
    providerId: "anthropic",
    authMode: "environment",
    baseUrl: "https://api.anthropic.com",
    requiredEnv: ["ANTHROPIC_API_KEY"],
    model: "claude-3-7-sonnet",
    role: "Spécialiste Musique & Synthèse MIDI",
    authPath: "api",
    systemPrompt: "Tu es le Spécialiste Audio & MIDI. Tu conçois la synthèse sonore (WebAudio API, oscillateurs, filtres) et gères le protocole MIDI (NoteOn/Off, CC, SysEx, MIDI Clock).",
    notes: "Rôle: Synthèse Audio & Protocole MIDI. WebAudio API, oscillateurs, horloge MIDI Clock et SysEx."
  },
  {
    id: "openrouter-hub",
    label: "OpenRouter — Passerelle Multi-IA",
    kind: "openai-compatible",
    providerId: "openrouter",
    authMode: "environment",
    baseUrl: "https://openrouter.ai/api/v1",
    requiredEnv: ["OPENROUTER_API_KEY"],
    model: "anthropic/claude-3.7-sonnet",
    role: "Passerelle Multi-Modèles & Secours",
    authPath: "api",
    systemPrompt: "Tu es la Passerelle Multi-IA OpenRouter. Tu offres un accès unifié à tous les modèles récents avec basculement de secours.",
    notes: "Rôle: Passerelle Multi-IA & Réserve. Accès immédiat à des centaines de modèles avec basculement."
  }
];

export function defaultConnections(now = new Date().toISOString()): AiConnection[] {
  return seeds.map((seed) => ({
    ...seed,
    enabled: true,
    args: [],
    requiredEnv: seed.requiredEnv ?? [],
    createdAt: now,
    updatedAt: now,
  }));
}

export const connectionCatalog = seeds.map((seed) => ({ ...seed, requiredEnv: seed.requiredEnv ?? [] }));

# Journal de travail IA

## 14 août 2026 — fondation

- Mission : créer le socle universel de Super IA.
- Branche : `agent/bootstrap-universal-cli`.
- Décisions : fournisseurs interchangeables, API désactivées par défaut, aucun contournement de quotas, Git et worktrees comme garde-fous.
- Livré : CLI minimale, catalogue, diagnostic, configuration, documentation et tests initiaux.

## 14 août 2026 — noyau opérationnel et console Matrix

- Mission : rendre le socle réellement exploitable depuis un dépôt Git.
- Livré : scanner Git, détection de stack et de checks, missions persistantes `TASK-XXXX`, création de worktree, console `superia matrix`.
- Validation locale : compilation TypeScript réussie ; tests du rendu Matrix et du flux complet `scan → mission → worktree` réussis.
- Sécurité : aucun merge automatique, API toujours verrouillées, `--dry-run` disponible avant création d'un worktree.

## 14 août 2026 — étude multi-agent et Pi 5

- Mission : étudier les IA, agents open source, systèmes de contexte et solutions locales avant de figer l'architecture.
- Projets étudiés : Codex, Claude Code, Mistral Vibe, Gemini CLI, Qwen Code, Aider, OpenCode, mini-SWE-agent, OpenHands, Spec Kit, Repomix, Pochi, Tabby, Ollama, llama.cpp et LocalAI.
- Décision matérielle : Raspberry Pi 5 comme tour de contrôle permanente sur NVMe ; les modèles lourds restent distants ou sur une autre machine.
- Décision mémoire : Git pour la vérité du code, Markdown pour les décisions, SQLite et JSONL pour les missions et événements, transcriptions locales pour les preuves.
- Décision multi-agent : orchestrateur déterministe, rôles spécialisés, worktrees séparés, contrôleur indépendant et validation humaine.
- Livré : documentation de recherche, matrice des rôles, architecture Pi 5, mémoire de contexte, pipeline multi-agent et protocole de benchmark.
- Suite : registre des outils locaux, constructeur de contexte Git, checkpoints, puis adaptateurs Codex et Mistral Vibe.

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

## 14 août 2026 — première étude multi-agent

- Mission : étudier les IA, agents open source, systèmes de contexte et solutions locales avant de figer l'architecture.
- Projets initiaux : Codex, Claude Code, Mistral Vibe, Gemini CLI, Qwen Code, Aider, OpenCode, mini-SWE-agent, OpenHands, Spec Kit, Repomix, Pochi et Tabby.
- Décision mémoire : Git pour la vérité du code, Markdown pour les décisions, SQLite et JSONL pour les missions et événements, transcriptions locales pour les preuves.
- Décision multi-agent : orchestrateur déterministe, rôles spécialisés, worktrees séparés, contrôleur indépendant et validation humaine.

## 14 août 2026 — registre des capacités locales

- Mission : distinguer les fournisseurs IA des outils réellement disponibles sur la machine.
- Livré : registre de 15 outils locaux couvrant Git, recherche, contexte, agents, inférence expérimentale, sandbox, conteneurs et sauvegarde.
- Nouvelle commande : `superia local [--json]`.
- Diagnostic étendu : `superia doctor` affiche fournisseurs et outils locaux.
- Console Matrix : panneau des capacités locales détectées.
- Tests : unicité du catalogue, exigences des outils obligatoires et rendu Matrix.

## 14 août 2026 — étude concurrentielle approfondie

- Mission : analyser le plus largement possible les concurrents, protocoles, architectures, forces, limites et briques réutilisables.
- Concurrents directs étudiés : Shep, Mozzie, Agetor, Agent of Empires, Claude Squad, Squad, The Pair, Mission Control, OpenHands Agent Canvas et Agent Orchestrator.
- Projets adjacents ajoutés : Serena, codebase-memory-mcp, Beads, Gitleaks, Cline, Roo Code, Agent Deck, ADHDev et amux.
- Protocoles étudiés : ACP, MCP, A2A, sorties JSON/JSONL, terminal/tmux, REST/OpenAPI et bus SQLite.
- Enseignements :
  - worktree = isolation Git, pas sandbox ;
  - SQLite + événements append-only = meilleur socle léger ;
  - mission, run et session doivent être séparés ;
  - les tâches importantes utilisent un état structuré, pas une conversation libre ;
  - ACP est le transport préféré lorsqu'il est disponible ;
  - MCP sert les outils et le contexte, pas l'orchestration globale ;
  - A2A est différé aux workers distants ;
  - toute fin de mission doit produire un receipt de preuve.
- Livré :
  - `COMPETITOR_LANDSCAPE_2026.md` ;
  - `PROTOCOLS_RUNTIME_AND_INTEROP.md` ;
  - `REFERENCE_ARCHITECTURE.md` ;
  - `RESEARCH_CATALOG.json` ;
  - index de recherche mis à jour ;
  - roadmap reconstruite à partir des conclusions.

## 14 août 2026 — correction du rôle du Pi

- Décision utilisateur : aucun modèle IA sur le Pi dans le MVP.
- Le Pi 5 devient exclusivement le plan de contrôle : Git, SQLite, contextes, worktrees, agents CLI, tests, receipts et sauvegardes.
- Ollama, llama.cpp et LocalAI sont marqués expérimentaux, hors installation par défaut et hors MVP.
- Un Pi 4/5 pourra servir de laboratoire futur uniquement après benchmark d'un cas d'usage précis.

## 14 août 2026 — audit de livraison

- Mission : vérifier le dépôt plutôt que se fier aux annonces de travail intermédiaires.
- Branche vérifiée : `agent/bootstrap-universal-cli`.
- Commit initialement contrôlé : `3c3e19710b73b6743f4368064befbf82f477eada`.
- PR : ouverte, brouillon et fusionnable.
- Version réellement publiée : `0.3.0`.
- CI GitHub : Ubuntu 24.04, Node 22.23.2 et npm 10.9.8.
- Résultat : compilation TypeScript réussie, 10 tests réussis, 0 échec et 0 vulnérabilité npm signalée pendant le job.
- Constat : SQLite WAL, serveur web, reprise, receipts, exécution d'agents et paquet systemd Pi n'étaient pas présents dans la branche.
- Décision : ces éléments restent non livrés tant qu'ils ne sont pas rattachés à un commit et validés par GitHub Actions.
- Documentation ajoutée : `docs/STATUS.md`, avec séparation stricte entre livré, conçu et restant à implémenter.

## Prochaine phase

1. stockage global SQLite en WAL et migrations ;
2. registre multi-projets ;
3. journal d'événements et reprise ;
4. migration du stockage JSON actuel ;
5. manifeste de contexte + Gitleaks ;
6. runner de processus générique ;
7. Codex puis Mistral Vibe ;
8. receipts de validation ;
9. paquet et test sur le Raspberry Pi 5 réel.

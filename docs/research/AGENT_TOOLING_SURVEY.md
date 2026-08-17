# Étude des agents et outils existants

Dernière revue : 14 août 2026.

Ce document se concentre sur les briques techniques. Pour la comparaison des produits complets, consulter [Paysage concurrentiel 2026](COMPETITOR_LANDSCAPE_2026.md).

## Règle Pi

Le Pi 5 héberge les outils, agents CLI, dépôts, états et sauvegardes. Il ne fait tourner aucun modèle local dans le MVP. Ollama, llama.cpp et LocalAI sont conservés uniquement comme sujets de laboratoire futur.

---

# 1. Agents de code et runtimes

## Aider

### À récupérer

- cartographie du dépôt pour réduire le contexte ;
- intégration Git native ;
- commits et retour arrière ;
- linters et tests ;
- nombreux fournisseurs ;
- modifications chirurgicales ;
- workflow copier/coller avec certaines interfaces web.

### Décision

Backend optionnel prioritaire et référence pour le constructeur de contexte. Super IA conserve mission, mémoire, permissions et receipts.

Source : https://github.com/Aider-AI/aider

## OpenCode

### À récupérer

- séparation plan/build ;
- architecture ouverte et multi-fournisseurs ;
- sous-agents ;
- TUI ;
- configuration des providers.

### Décision

Candidat comme backend générique. L'intégration passe par un adaptateur versionné et ne dépend pas de ses fichiers de session internes.

Source : https://github.com/anomalyco/opencode

## mini-SWE-agent

### À récupérer

- boucle minimale ;
- historique linéaire ;
- bash comme interface universelle ;
- action par sous-processus indépendant ;
- environnements local/Docker/Podman/bubblewrap ;
- trajectoire complète.

### Décision

Meilleure référence pour le runner minimal et le benchmark des harnesses. Nous ajoutons cependant politiques de permissions, groupes de processus et receipts.

Source : https://github.com/SWE-agent/mini-swe-agent

## Cline

### À récupérer

- agent disponible comme SDK, CLI et extension ;
- outils, approbations et expérience utilisateur mature ;
- écosystème large.

### Décision

Worker adjacent à tester plus tard. Super IA ne doit pas devenir une extension IDE dépendante de VS Code.

Source : https://github.com/cline/cline

## Roo Code

### À récupérer

- rôles et modes spécialisés ;
- équipes d'agents dans l'éditeur ;
- personnalisation des instructions.

### Décision

Référence UX historique. Le dépôt observé est archivé lors de la revue ; ne pas en faire une dépendance.

Source : https://github.com/RooCodeInc/Roo-Code

---

# 2. Spécification et gestion du travail

## GitHub Spec Kit

### À récupérer

- constitution du projet ;
- séparation spécification → plan → tâches → implémentation ;
- artefacts versionnés ;
- checklists ;
- convergence entre code et spécification ;
- intégrations avec de nombreux agents.

### Décision

Adopter une version légère. Les corrections triviales peuvent utiliser un fast path ; les gros travaux passent par des gates.

Source : https://github.com/github/spec-kit

## Beads

### À récupérer

- graphe de dépendances ;
- requête des tâches prêtes ;
- format orienté agents ;
- fonctionnement hors ligne ;
- mémoire de tâches durable.

### Décision

Construire d'abord un DAG SQLite minimal. Prévoir import/export ou intégration Beads plus tard plutôt qu'imposer Dolt au MVP.

Source : https://github.com/gastownhall/beads

## Squad

### À récupérer

- tâches `create/ack/complete/requeue` ;
- bus SQLite sans démon ;
- métadonnées de capacités ;
- protocol version ;
- rôles et équipes versionnés.

### Décision

Inspiration directe pour la coordination locale légère.

Source : https://github.com/mco-org/squad

---

# 3. Construction du contexte

## Repomix

### À récupérer

- sélection Git-aware ;
- comptage de tokens ;
- compression structurelle ;
- formats adaptés aux modèles ;
- détection de secrets ;
- historique Git optionnel ;
- liste ciblée de fichiers.

### Décision

Intégration optionnelle rapide. Le manifest, les raisons de sélection et les hashes restent natifs à Super IA.

Source : https://github.com/yamadashy/repomix

## Serena

### À récupérer

- navigation par symboles via LSP ;
- recherche et édition sémantiques ;
- outils MCP ;
- mémoire locale ;
- fonctionnement indépendant du modèle.

### Décision

Excellent candidat pour l'exploration symbolique et la réduction du contexte. Benchmark sur TypeScript, Python, Rust et dépôts réels avant adoption.

Source : https://github.com/oraios/serena

## codebase-memory-mcp

### À récupérer

- index Tree-sitter ;
- graphe local SQLite ;
- binaire ARM64 ;
- requêtes MCP ;
- analyse de dépendances.

### Risques

- affirmations de gains à reproduire ;
- index dérivé susceptible de devenir obsolète ;
- forks corrigeant des bugs en amont ;
- coût d'indexation sur gros dépôt.

### Décision

Évaluer comme cache reconstruisible, jamais comme vérité officielle.

Source : https://github.com/DeusData/codebase-memory-mcp

## Tree-sitter

### À récupérer

- parsing incrémental ;
- robustesse sur code incomplet ;
- support multi-langages ;
- intégration native légère.

### Décision

Brique probable pour symboles, imports, structure et compression.

Source : https://github.com/tree-sitter/tree-sitter

## ripgrep et Git

Avant tout index complexe :

- `git ls-files` ;
- `git grep` / `rg` ;
- `git log` ;
- `git diff` ;
- analyse des imports.

Le fast path local doit résoudre un maximum de demandes sans appel IA.

---

# 4. Sécurité

## Gitleaks

### Usage

- scan du paquet de contexte ;
- scan du diff ;
- scan de l'historique si nécessaire ;
- hook local/CI ;
- rapport conservé comme preuve.

### Limite

Aucun scanner n'identifie tous les secrets. Gitleaks complète les exclusions et politiques, il ne les remplace pas.

Source : https://github.com/gitleaks/gitleaks

## bubblewrap

### Usage

- sandbox Linux légère ;
- montages lecture seule ;
- HOME temporaire ;
- réseau désactivé ;
- exposition minimale du worktree.

### Décision

Priorité élevée sur le Pi.

Source : https://github.com/containers/bubblewrap

## Podman

### Usage

- conteneurs rootless ;
- isolation plus forte ;
- images de projet reproductibles.

### Décision

Option pour missions risquées ou projets qui exigent un environnement complet.

Source : https://github.com/containers/podman

## Docker

### Décision

Support de compatibilité, pas dépendance obligatoire. Ne jamais exposer la socket Docker directement à un agent non fiable.

## Restic

### Usage

- sauvegarde chiffrée ;
- déduplication ;
- rétention ;
- vérification et restauration.

### Décision

Outil recommandé pour SQLite, événements, contextes, receipts et branches critiques.

Source : https://github.com/restic/restic

---

# 5. Plans de contrôle et backends

## OpenHands Agent Canvas

### À récupérer

- séparation interface / Agent Server / Automation Server ;
- agents locaux, VM, conteneurs ou cloud ;
- compatibilité ACP ;
- backends enregistrables.

### À éviter dans le noyau

- plateforme complète ;
- nombreux services dès le départ ;
- accès hôte non sandboxé.

Source : https://github.com/OpenHands/OpenHands

## Mission Control

### À récupérer

- coûts, tokens et activités ;
- identité et audit ;
- receipts ;
- quality gate ;
- API/CLI/MCP/OpenAPI ;
- mémoire et skills.

### À éviter dans le MVP

- authentification multi-utilisateurs ;
- surface réseau étendue ;
- toutes les fonctions d'entreprise.

Source : https://github.com/builderz-labs/mission-control

## Agent of Empires

### À récupérer

- sessions tmux persistantes ;
- statut des agents ;
- PWA mobile ;
- ACP structuré ;
- worktrees et sandboxes ;
- API HTTP.

### Décision

Candidat comme gestionnaire de sessions externe ou source d'idées. Super IA reste la mémoire et le moteur de mission.

Source : https://github.com/agent-of-empires/agent-of-empires

---

# 6. Protocoles

## ACP

Transport préféré entre Super IA et un agent de code lorsqu'il est disponible et stable.

Source : https://agentclientprotocol.com/

## MCP

Transport pour outils et contexte. Le serveur Super IA commencera en lecture seule. MCP ne remplace pas notre workflow.

Source : https://modelcontextprotocol.io/

## A2A

Réservé aux workers distants futurs. Trop complexe pour le MVP local.

Source : https://a2a-protocol.org/

## JSON/JSONL

Fallback prioritaire après ACP. Chaque sortie est convertie en événements internes.

## tmux/terminal

Fallback interactif. Utile pour la persistance, mais trop fragile pour être la seule source d'état.

---

# 7. Inférence locale différée

## Ollama, llama.cpp et LocalAI

Ils restent dans le registre pour :

- détecter une installation existante ;
- préparer une expérimentation future ;
- permettre un worker distant personnel ;
- comparer des modèles sur une autre machine.

Ils sont hors :

- installation Pi minimale ;
- routeur par défaut ;
- dépendances ;
- critères de réussite du MVP.

Aucun modèle local ne sera installé sans cas d'usage, benchmark et décision explicite.

---

# 8. Priorités d'intégration

| Brique | Usage | Priorité |
|---|---|---:|
| Git + SQLite + JSONL | vérité, état et événements | critique |
| Gitleaks | secret gate | critique |
| Generic CLI Adapter | prise universelle | critique |
| Codex / Vibe / Claude / Gemini | workers principaux | critique |
| Repomix | contexte rapide | haute |
| Tree-sitter / Serena | contexte symbolique | haute |
| bubblewrap | sandbox Pi | haute |
| Restic | sauvegarde | haute |
| mini-SWE-agent | runner/benchmark | haute |
| Aider / OpenCode | backends optionnels | haute |
| ACP | transport structuré | haute après MVP initial |
| MCP lecture seule | outils Super IA | moyenne |
| Podman | isolation forte | moyenne |
| Beads | import/export de tâches | moyenne |
| OpenHands/AoE | workers ou gestionnaires externes | future |
| A2A | workers distants | future |
| Ollama/llama.cpp/LocalAI | laboratoire seulement | différée |

# Conclusion

Super IA doit intégrer les meilleurs outils comme des adaptateurs, pas les recopier. Le cœur à construire est la couche qui manque encore : état durable, contexte explicable, coût, permissions, reprise, validation et preuves communes à tous les agents.

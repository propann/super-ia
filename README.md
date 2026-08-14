# Super IA

**Un centre de commandement local, multi-fournisseurs et économique pour coder avec plusieurs IA sans dépendre d'une API d'orchestration payante.**

Super IA détecte les agents disponibles, suit les dépôts et projets, construit un contexte contrôlé, isole les modifications dans Git et conserve les preuves nécessaires à la reprise et à la validation.

> État public vérifié : **v0.3.0**, build réussi et 10 tests réussis. Les fonctions SQLite, reprise, contexte sécurisé, exécution d'agents et paquet Pi sont encore dans la roadmap. Voir [État vérifié du projet](docs/STATUS.md).

## Décision matérielle

Le Raspberry Pi 5 est la **tour de contrôle permanente** : Git, SQLite, missions, contexte, console, tests et sauvegardes. Il ne fait tourner aucun modèle IA dans le MVP. Les programmes Codex, Claude Code, Mistral Vibe, Gemini CLI et autres peuvent s'exécuter sur le Pi tout en utilisant les services officiels de leurs fournisseurs.

Un Pi 4/5 pourra devenir plus tard un laboratoire séparé pour un petit modèle uniquement si un benchmark prouve son utilité.

## Console Matrix

```bash
npm install
npm run build
node dist/index.js matrix
```

La console affiche :

- dépôt, branche et état Git ;
- stack et commandes de validation ;
- fournisseurs IA disponibles ;
- outils locaux, sandboxes et sauvegardes ;
- missions persistantes ;
- verrou API, budget et règles de fusion.

Contrôles : `R` rafraîchit, `Q` quitte.

```bash
node dist/index.js matrix --once
```

## Architecture cible

```text
Raspberry Pi 5 + NVMe
├── dépôts Git complets et suivi multi-projets
├── SQLite + journal d'événements
├── missions, dépendances et checkpoints
├── constructeur et sauvegarde de contexte
├── worktrees isolés
├── gestionnaire de processus et politiques
├── tests, audits et receipts
├── console Matrix
├── sauvegardes chiffrées
└── adaptateurs vers les agents
        ├── Codex CLI
        ├── Claude Code
        ├── Mistral Vibe
        ├── Gemini CLI
        ├── Qwen Code
        ├── Aider / OpenCode / mini-SWE-agent
        └── web assisté légitime
```

## Philosophie

```text
demande
   ↓
analyse du dépôt et des instructions
   ↓
spécification + plan + graphe de tâches
   ↓
contexte ciblé, scanné et versionné
   ↓
choix du fournisseur légitime le moins coûteux
   ↓
mission isolée dans un worktree
   ↓
code + tests + audit indépendant
   ↓
checkpoint + receipt de preuve
   ↓
fusion humaine
```

## Commandes actuelles

```bash
superia matrix
superia doctor
superia providers
superia local
superia scan
superia init
superia task create "Ajouter une authentification"
superia task list
superia task show TASK-0001
superia worktree TASK-0001
```

`superia local --json` retourne les capacités détectées. `superia worktree TASK-0001 --dry-run` affiche la commande sans modifier Git.

## Outils locaux suivis

### Cœur recommandé

- Git, ripgrep, jq et SQLite ;
- Gitleaks pour les secrets ;
- Restic pour les sauvegardes ;
- bubblewrap ou Podman pour l'isolation ;
- Repomix et Tree-sitter pour le contexte ;
- GitHub CLI lorsque les PR/CI sont utilisées.

### Agents locaux avec modèles distants

- Codex CLI ;
- Claude Code ;
- Mistral Vibe ;
- Gemini CLI ;
- Qwen Code ;
- Aider ;
- OpenCode ;
- mini-SWE-agent.

### Veille expérimentale hors MVP

- Ollama ;
- llama.cpp ;
- LocalAI ;
- modèles locaux sur Pi.

Ils sont détectables pour la recherche, mais ne sont ni requis ni installés automatiquement.

## Principes de sécurité

- aucun faux compte ou contournement de quota ;
- aucune fusion automatique sur la branche protégée ;
- aucun secret transmis silencieusement ;
- API payantes désactivées par défaut ;
- worktrees pour l'isolation Git ;
- sandbox séparée pour l'isolation système ;
- approbations par type d'action ;
- événements et artefacts auditables ;
- arrêt d'urgence et reprise après coupure.

## État actuel — v0.3

- catalogue et diagnostic multi-fournisseurs ;
- registre des outils locaux ;
- configuration avec API désactivées ;
- scanner Git et commandes de validation ;
- missions `TASK-XXXX` ;
- branches et worktrees ;
- console Matrix ;
- tests du flux `scan → mission → worktree` ;
- étude détaillée des concurrents, agents, protocoles et mémoire ;
- architecture Pi control-plane-only ;
- catalogue de recherche machine-lisible.

Le détail de ce qui est livré, testé, conçu ou encore absent est maintenu dans [docs/STATUS.md](docs/STATUS.md).

## Recherche concurrentielle

Super IA est comparé notamment à :

- Shep ;
- Mozzie ;
- Agetor ;
- Agent of Empires ;
- Claude Squad ;
- Squad ;
- The Pair ;
- Mission Control ;
- OpenHands Agent Canvas ;
- Agent Orchestrator.

Le projet récupère les mécanismes éprouvés sans recopier leur lourdeur : SQLite, worktrees, DAG, ACP, reprise, revue indépendante, receipts et sécurité.

## Développement

```bash
npm install
npm test
npm run matrix
```

## Documentation

### Projet

- [État vérifié](docs/STATUS.md)
- [Vision](docs/PROJECT_VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Fournisseurs](docs/PROVIDERS.md)
- [Sécurité](docs/SECURITY.md)
- [Feuille de route](docs/ROADMAP.md)

### Recherche approfondie

- [Index de recherche](docs/research/README.md)
- [Architecture de référence](docs/research/REFERENCE_ARCHITECTURE.md)
- [Paysage concurrentiel 2026](docs/research/COMPETITOR_LANDSCAPE_2026.md)
- [Protocoles et interopérabilité](docs/research/PROTOCOLS_RUNTIME_AND_INTEROP.md)
- [Rôles des IA](docs/research/AI_ROLES_MATRIX.md)
- [Agents et outils](docs/research/AGENT_TOOLING_SURVEY.md)
- [Architecture Raspberry Pi 5](docs/research/PI5_LOCAL_FIRST_ARCHITECTURE.md)
- [Git et mémoire de contexte](docs/research/GIT_CONTEXT_MEMORY.md)
- [Architecture multi-agent](docs/research/MULTI_AGENT_DESIGN.md)
- [Benchmark](docs/research/BENCHMARK_PROTOCOL.md)
- [Catalogue JSON](docs/research/RESEARCH_CATALOG.json)

## Licence

MIT.

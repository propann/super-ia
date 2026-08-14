# Super IA

**Un centre de commandement local, multi-fournisseurs et économique pour piloter plusieurs agents de développement sans dépendre d'une API d'orchestration payante.**

Super IA suit les dépôts, conserve les missions, prépare l'isolation Git et maintient désormais un état global durable pour plusieurs projets.

## État vérifié — v0.4.0

La CI GitHub valide actuellement :

- compilation TypeScript réussie ;
- 12 tests réussis, 0 échec ;
- SQLite en mode WAL ;
- registre global multi-projets ;
- import des missions JSON existantes ;
- runs avec heartbeat ;
- récupération des runs abandonnés ;
- journal d'événements SQLite + miroir JSONL ;
- flux Git `scan → mission → worktree` toujours fonctionnel.

Le détail exact est conservé dans [docs/STATUS.md](docs/STATUS.md).

## Décision matérielle

Le Raspberry Pi 5 est la **tour de contrôle permanente** : Git, SQLite, missions, contexte, console, tests et sauvegardes. Aucun modèle IA local n'est requis dans le MVP.

Les CLI Codex, Mistral Vibe, Claude Code, Gemini CLI et autres pourront s'exécuter sur le Pi tout en utilisant les services officiels de leurs fournisseurs. Un Pi 4/5 pourra servir plus tard de laboratoire séparé pour un petit modèle uniquement si un benchmark démontre son utilité.

## Plan de contrôle global

Par défaut :

```text
~/.superia/
├── control.sqlite
├── events/events.jsonl
└── backups/
```

Un autre emplacement peut être choisi :

```bash
export SUPERIA_HOME=/srv/superia
```

Commandes principales :

```bash
superia control status --json

superia project add /chemin/du/depot
superia project sync /chemin/du/depot
superia project list
superia project show <PROJECT-ID>

superia run start codex-cli TASK-0001
superia run list
superia run heartbeat <RUN-ID>
superia run finish <RUN-ID> completed

superia events --limit 50
superia recover --stale-minutes 5
```

Voir [Plan de contrôle durable](docs/CONTROL_PLANE.md).

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

## Commandes du dépôt courant

```bash
superia scan
superia init
superia task create "Ajouter une authentification"
superia task list
superia task show TASK-0001
superia worktree TASK-0001
superia worktree TASK-0001 --dry-run
```

`superia init`, `task create` et la création réelle d'un worktree resynchronisent automatiquement le dépôt avec le registre global.

## Architecture actuelle

```text
Raspberry Pi 5 + NVMe
├── dépôts Git et worktrees
├── SQLite WAL global
│   ├── projets
│   ├── missions synchronisées
│   ├── runs et heartbeats
│   └── événements
├── journal JSONL append-only
├── console Matrix
├── tests et politiques de coût
└── futurs adaptateurs agents
        ├── Codex CLI
        ├── Mistral Vibe
        ├── Claude Code
        ├── Gemini CLI
        ├── Qwen Code
        └── agents ouverts et web assisté légitime
```

## Principes de sécurité

- aucun faux compte ou contournement de quota ;
- aucune fusion automatique sur la branche protégée ;
- aucun secret transmis silencieusement ;
- API payantes désactivées par défaut ;
- worktrees pour l'isolation Git ;
- sandbox séparée prévue pour l'isolation système ;
- événements auditables ;
- récupération explicite après interruption.

## Limites actuelles

Super IA ne lance pas encore réellement Codex, Mistral ou un autre agent. Le plan de contrôle est prêt, mais les éléments suivants restent à construire :

- runner de processus et arrêt des descendants ;
- contexte Git ciblé et scan Gitleaks ;
- leases, idempotence et checkpoints ;
- adaptateurs IA non interactifs ;
- routeur coût/capacité/qualité ;
- reviewer indépendant et receipts ;
- sauvegarde automatisée et service systemd pour le Pi.

## Développement

```bash
npm install
npm test
npm run control
npm run matrix
```

Node.js 22.5 ou supérieur est requis pour `node:sqlite`.

## Documentation

### Projet

- [État vérifié](docs/STATUS.md)
- [Plan de contrôle durable](docs/CONTROL_PLANE.md)
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

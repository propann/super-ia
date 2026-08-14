# Super IA

**Centre de commandement local, multi-projets et multi-fournisseurs pour piloter des agents de développement avec contrôle des coûts, sécurité, reprise, suivi et preuves.**

Le Raspberry Pi 5 sert de tour de contrôle permanente. Les modèles restent chez leurs fournisseurs officiels ; aucun modèle IA local n'est requis.

## État vérifié — v0.11.0

La CI GitHub valide actuellement :

- Ubuntu 24.04 ;
- Node.js 22.23.2 et npm 10.9.8 ;
- compilation TypeScript réussie ;
- **26 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- scripts Pi valides ;
- aucune commande `sudo` dans le paquet Pi.

Fonctions principales :

- SQLite WAL multi-projets ;
- missions, priorités, blocages, dépendances et tableau de suivi ;
- Git branches et worktrees ;
- contexte ciblé avec SHA-256 ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- adaptateurs Codex et Mistral Vibe ;
- **Gitleaks obligatoire avant tout run réel Codex/Vibe** ;
- receipts vérifiables ;
- sauvegardes cohérentes ;
- daemon et service systemd utilisateur ;
- console Matrix globale ;
- roadmap machine-lisible contrôlée par la CI.

Voir [l'état vérifié](docs/STATUS.md).

## Installation de développement

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
npm install
npm test
npm link
```

Node.js **22.5 ou supérieur** est requis.

## Installation Raspberry Pi

```bash
bash install/pi/install.sh
```

L'installateur compile, teste, initialise `~/.superia`, installe `superia`, crée un service systemd utilisateur durci et vérifie la première sauvegarde. Il n'utilise pas `sudo`.

## Flux principal

```bash
superia init
superia task create "Ajouter une authentification locale"

superia task update TASK-0001 \
  --priority high \
  --owner max \
  --provider codex-cli \
  --due 2026-08-20 \
  --tag security \
  --accept "tests réussis"

superia task board
superia worktree TASK-0001
superia context build TASK-0001 --max-bytes 300000
superia agent run codex TASK-0001 --mode plan
superia validate
superia receipt create <RUN-ID>
```

## Préflight de sécurité

Chaque run réel Codex ou Vibe déclenche automatiquement Gitleaks :

```text
Gitleaks absent  → agent refusé
finding détecté  → agent refusé
scan propre      → agent autorisé
```

Le rapport, les logs et le run Gitleaks sont conservés. L'état du préflight apparaît dans le résultat de l'agent.

Une dérogation exceptionnelle doit être explicite :

```bash
superia agent run codex TASK-0001 \
  --mode plan \
  --allow-without-gitleaks
```

Cette dérogation produit l'état `waived` et un événement durable `security.preflight.waived`.

Le mode `--dry-run` ne lance ni fournisseur distant ni Gitleaks :

```bash
superia agent run codex TASK-0001 --mode plan --dry-run
```

## Suivi des tâches

```bash
superia task list
superia task show TASK-0001
superia task board
superia task note TASK-0001 "Accès au Pi nécessaire."
superia task update TASK-0001 --status blocked --priority critical
superia task update TASK-0002 --depends TASK-0001
```

Une mission conserve statut, priorité, responsable, fournisseur, échéance, tags, dépendances, critères d'acceptation et notes.

Documentation de pilotage :

- [Feuille de route](docs/ROADMAP.md)
- [Registre JSON](docs/ROADMAP_TRACKER.json)
- [Suivi opérationnel](docs/TASK_TRACKER.md)

## Agents

### Codex

- plan/review en sandbox `read-only` ;
- build en `workspace-write` uniquement dans un worktree ;
- prompt par stdin ;
- sortie JSONL ;
- contournement de sandbox interdit.

### Mistral Vibe

- plan/review avec le profil `plan` ;
- build avec `accept-edits` ;
- aucun shell ;
- prix, tokens et tours plafonnés ;
- prompt absent d'`argv`.

## Contrôle global

```bash
superia control status --json
superia project add /chemin/du/depot
superia project list
superia run list
superia events --limit 100
superia daemon --once
superia matrix
```

Données principales :

```text
~/.superia/
├── control.sqlite
├── events/events.jsonl
├── runs/
├── security/
├── backups/
└── daemon-status.json
```

## Sauvegardes et receipts

```bash
superia backup create
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS

superia receipt create <RUN-ID>
superia receipt verify ~/.superia/runs/<RUN-ID>/RECEIPT.json
```

L'approbation humaine reste obligatoire. Super IA ne fusionne jamais automatiquement.

## Prochaines priorités

1. Bubblewrap, HOME temporaire et contrôle réseau ;
2. contrôle des fichiers modifiés après chaque agent ;
3. installation et tests de reprise/restauration sur le Pi 5 ;
4. tests réels Codex et Vibe ;
5. reviewer indépendant et pipeline complet ;
6. Restic ;
7. routeur coût/qualité mesuré.

## Limites actuelles

- installation matérielle Pi non encore validée ;
- fournisseurs réels non encore testés dans ce dépôt ;
- sandbox commune Bubblewrap/Podman manquante ;
- contrôle post-run des chemins modifiés manquant ;
- reviewer, DAG, routeur et interface web non livrés ;
- restauration automatisée et Restic non livrés.

## Documentation

- [État vérifié](docs/STATUS.md)
- [Feuille de route](docs/ROADMAP.md)
- [Suivi des tâches](docs/TASK_TRACKER.md)
- [Plan de contrôle](docs/CONTROL_PLANE.md)
- [Adaptateurs](docs/AGENT_ADAPTERS.md)
- [Receipts](docs/RECEIPTS.md)
- [Installation Pi](docs/PI_INSTALL.md)
- [Sécurité](docs/SECURITY.md)

## Licence

MIT.

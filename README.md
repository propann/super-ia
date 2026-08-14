# Super IA

**Centre de commandement local, multi-projets et multi-fournisseurs pour piloter des agents de développement avec contrôle des coûts, sécurité, reprise, suivi et preuves.**

Le Raspberry Pi 5 sert de tour de contrôle permanente. Les modèles restent chez leurs fournisseurs officiels ; aucun modèle IA local n'est requis.

## État vérifié — v0.12.0

La CI GitHub valide actuellement :

- Ubuntu 24.04 ;
- Node.js 22.23.2 et npm 10.9.8 ;
- compilation TypeScript réussie ;
- **28 tests réussis, 0 échec** ;
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
- Gitleaks obligatoire avant tout run réel Codex/Vibe ;
- **sandbox Bubblewrap obligatoire sous Linux avant tout run réel Codex/Vibe** ;
- HOME jetable et accès au workspace limité selon le mode ;
- autotest Bubblewrap destiné au Pi ;
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

L'installateur :

- compile et teste le projet ;
- initialise `~/.superia` ;
- installe la commande `superia` ;
- crée un service systemd utilisateur durci ;
- vérifie la première sauvegarde ;
- détecte Gitleaks et Bubblewrap ;
- exécute l'autotest Bubblewrap lorsqu'il est présent ;
- écrit `~/.superia/sandbox-status.json` ;
- n'utilise pas `sudo`.

Le centre de contrôle reste installable sans Gitleaks ou Bubblewrap, mais les agents distants restent alors bloqués par défaut.

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
superia security scan --required
superia security sandbox-check
superia agent run codex TASK-0001 --mode plan
superia validate
superia receipt create <RUN-ID>
```

## Deux préflights obligatoires

Chaque run réel Codex ou Vibe vérifie :

```text
Gitleaks absent     → agent refusé
finding détecté     → agent refusé
Bubblewrap absent   → agent refusé
préflights propres  → agent autorisé
```

Les résultats apparaissent dans les métadonnées et dans `AGENT_RESULT.json`.

Dérogations exceptionnelles :

```bash
superia agent run codex TASK-0001 \
  --mode plan \
  --allow-without-gitleaks \
  --allow-without-bwrap
```

Elles produisent un état `waived` et des événements durables. Une dérogation ne vaut jamais validation.

Le mode `--dry-run` ne lance aucun fournisseur ni scanner :

```bash
superia agent run codex TASK-0001 --mode plan --dry-run
```

## Sandbox Bubblewrap

Politique actuelle :

- vrai HOME non monté ;
- HOME jetable `/home/superia` ;
- système et exécutables en lecture seule ;
- plan/review : dépôt ou worktree en lecture seule ;
- build : worktree en lecture-écriture ;
- sortie Codex montée individuellement en écriture ;
- état fournisseur limité à `~/.superia/providers/` ;
- capacités supprimées ;
- namespaces utilisateur, PID, IPC, UTS et cgroup demandés ;
- réseau isolable pour les tâches qui n'ont pas besoin d'Internet.

Codex et Vibe gardent actuellement le réseau de l'hôte pour joindre leurs services officiels.

```bash
superia security sandbox-check
superia security sandbox-check --json
```

La CI vérifie la politique avec des mocks. Le test noyau réel reste à exécuter sur le Pi 5. Voir [Sandbox Bubblewrap](docs/SANDBOX.md).

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

- sandbox native conservée ;
- sandbox externe Bubblewrap ;
- plan/review en lecture seule ;
- build uniquement dans un worktree ;
- prompt par stdin ;
- sortie JSONL ;
- contournement de sandbox interdit.

### Mistral Vibe

- sandbox externe Bubblewrap ;
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
├── providers/
├── backups/
├── sandbox-status.json
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

1. terminer l'autotest Bubblewrap réel sur le Pi ;
2. contrôler les fichiers modifiés après chaque agent ;
3. installer v0.12 et tester reprise/restauration sur le Pi 5 ;
4. tester Codex et Vibe réels sous Bubblewrap ;
5. construire un reviewer indépendant et le pipeline complet ;
6. intégrer Restic ;
7. construire le routeur coût/qualité mesuré.

## Limites actuelles

- installation matérielle Pi non encore validée ;
- fournisseurs réels non encore testés dans ce dépôt ;
- politique Bubblewrap testée en CI avec mocks, frontière noyau réelle non encore prouvée ;
- réseau distant non filtré par domaine ;
- contrôle post-run des chemins modifiés manquant ;
- reviewer, DAG, routeur et interface web non livrés ;
- restauration automatisée et Restic non livrés.

## Documentation

- [État vérifié](docs/STATUS.md)
- [Feuille de route](docs/ROADMAP.md)
- [Suivi des tâches](docs/TASK_TRACKER.md)
- [Plan de contrôle](docs/CONTROL_PLANE.md)
- [Adaptateurs](docs/AGENT_ADAPTERS.md)
- [Sandbox Bubblewrap](docs/SANDBOX.md)
- [Receipts](docs/RECEIPTS.md)
- [Installation Pi](docs/PI_INSTALL.md)
- [Sécurité](docs/SECURITY.md)

## Licence

MIT.

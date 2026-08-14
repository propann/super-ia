# Super IA

**Un centre de commandement local, multi-projets et multi-fournisseurs pour piloter des agents de développement avec contrôle des coûts, reprise, suivi et preuves.**

Super IA garde Git, les missions, les contextes, les runs, les logs et les sauvegardes sous contrôle local. Le Raspberry Pi 5 sert de tour de contrôle permanente ; aucun modèle IA local n'est requis.

## État vérifié — v0.10.0

La dernière CI GitHub valide :

- Ubuntu 24.04 ;
- Node.js 22.23.2 et npm 10.9.8 ;
- compilation TypeScript réussie ;
- **25 tests réussis, 0 échec** ;
- 0 vulnérabilité signalée par l'audit npm du job ;
- syntaxe des scripts Pi valide ;
- aucune commande `sudo` dans le paquet Pi.

Fonctions couvertes :

- SQLite WAL, projets, missions, runs, événements et reprise ;
- contextes Git ciblés avec SHA-256 et première barrière anti-secrets ;
- runner avec logs, heartbeat, timeout et arrêt du groupe de processus ;
- leases anti-double-lancement ;
- adaptateurs Codex et Mistral Vibe simulés de bout en bout ;
- sauvegarde cohérente et détection de corruption ;
- daemon et console Matrix globale ;
- receipts vérifiables et détection de falsification ;
- suivi enrichi des tâches et dépendances ;
- registre de roadmap validé par la CI ;
- intégration Gitleaks avec rapport JSON expurgé.

Les tests d'adaptateurs utilisent des faux exécutables locaux et ne consomment aucun quota. L'authentification et une mission réelle avec Codex/Vibe doivent encore être validées sur le Pi.

Voir [l'état vérifié détaillé](docs/STATUS.md).

## Architecture

```text
Raspberry Pi 5 + NVMe
├── dépôts Git et worktrees
├── ~/.superia/
│   ├── control.sqlite          SQLite WAL
│   ├── events/events.jsonl     journal append-only
│   ├── runs/<RUN-ID>/          logs et receipts
│   ├── security/               rapports Gitleaks
│   ├── backups/                snapshots vérifiables
│   └── daemon-status.json
├── console Matrix multi-projets
├── suivi de missions et roadmap
├── contexte Git ciblé + SHA-256
├── runner de processus contrôlé
├── Codex CLI
├── Mistral Vibe CLI
└── futurs adaptateurs
```

## Installation de développement

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
npm install
npm test
npm link
```

Node.js **22.5 ou supérieur** est requis pour `node:sqlite`.

## Installation Raspberry Pi

```bash
bash install/pi/install.sh
```

L'installateur utilisateur compile, teste, initialise `~/.superia`, installe la commande, crée un service systemd utilisateur durci et vérifie la première sauvegarde. Il n'utilise pas `sudo` et n'installe aucun modèle local.

Voir [Installation Raspberry Pi](docs/PI_INSTALL.md).

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
superia agent run codex TASK-0001 --mode plan --dry-run
superia validate
superia receipt create <RUN-ID>
```

## Suivi des tâches

Une mission peut maintenant conserver :

- un statut, dont `blocked` ;
- une priorité ;
- un responsable ;
- un fournisseur ;
- une échéance ;
- des tags ;
- des dépendances ;
- des critères d'acceptation ;
- des notes horodatées.

Commandes principales :

```bash
superia task list
superia task show TASK-0001
superia task board
superia task note TASK-0001 "Accès au Pi nécessaire."
superia task update TASK-0001 --status blocked --priority critical
superia task update TASK-0002 --depends TASK-0001
```

La feuille de route possède une source machine-lisible contrôlée par la CI :

- [Feuille de route](docs/ROADMAP.md)
- [Registre JSON](docs/ROADMAP_TRACKER.json)
- [Suivi opérationnel](docs/TASK_TRACKER.md)

## Sécurité Gitleaks

```bash
superia doctor
superia security scan
superia security scan --required
superia security scan --mode git --required
```

Le scan :

- utilise Gitleaks lorsqu'il est installé ;
- produit un rapport JSON expurgé ;
- conserve le run et les logs ;
- passe en mode bloquant avec `--required` ;
- échoue lorsqu'un finding est détecté.

L'étape suivante consiste à rendre ce préflight obligatoire avant tout envoi distant.

## Agents

### Codex

- plan/review en sandbox `read-only` ;
- build en `workspace-write` seulement dans un worktree ;
- prompt transmis par stdin ;
- sortie JSONL ;
- options de contournement de sandbox interdites.

### Mistral Vibe

- plan/review avec le profil `plan` ;
- build avec `accept-edits` ;
- aucun shell accordé à Vibe ;
- prix, tokens et tours plafonnés ;
- prompt transmis par stdin et absent d'`argv`.

Voir [Adaptateurs d'agents](docs/AGENT_ADAPTERS.md).

## Contrôle multi-projets

```bash
superia control status --json
superia project add /chemin/du/depot
superia project sync /chemin/du/depot
superia project list
superia project show <PROJECT-ID>
superia run list
superia events --limit 100
superia recover --stale-minutes 5
superia daemon --once
superia matrix
```

## Sauvegardes et receipts

```bash
superia backup create
superia backup list
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS

superia receipt create <RUN-ID>
superia receipt verify ~/.superia/runs/<RUN-ID>/RECEIPT.json
```

Une sauvegarde contient une image SQLite cohérente, le journal JSONL et un manifeste SHA-256. Un receipt rassemble le run, les commits, le contexte, les logs, les validations et les artefacts. L'approbation humaine reste obligatoire.

## Limites actuelles

- pas encore de test réel sur le Raspberry Pi 5 ;
- pas encore de mission réelle authentifiée Codex/Vibe dans cette CI ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22 ;
- Gitleaks intégré, mais pas encore imposé automatiquement avant chaque agent ;
- pas encore de sandbox Bubblewrap/Podman commune ;
- pas encore de contrôle post-run des chemins modifiés ;
- pas encore de reviewer indépendant ni pipeline multi-agent complet ;
- pas encore de DAG ni routeur coût/qualité ;
- sauvegardes locales vérifiées, mais restauration et Restic à ajouter ;
- aucune interface web locale pour l'instant ;
- aucune fusion automatique.

## Documentation

- [État vérifié](docs/STATUS.md)
- [Feuille de route](docs/ROADMAP.md)
- [Suivi des tâches](docs/TASK_TRACKER.md)
- [Plan de contrôle](docs/CONTROL_PLANE.md)
- [Adaptateurs Codex et Vibe](docs/AGENT_ADAPTERS.md)
- [Receipts](docs/RECEIPTS.md)
- [Installation Pi](docs/PI_INSTALL.md)
- [Sécurité](docs/SECURITY.md)
- [Recherche approfondie](docs/research/README.md)

## Licence

MIT.

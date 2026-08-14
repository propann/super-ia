# Super IA

**Un centre de commandement local, multi-projets et multi-fournisseurs pour piloter des agents de développement avec contrôle des coûts, reprise et preuves.**

Super IA garde Git, les missions, les contextes, les runs, les logs et les sauvegardes sous contrôle local. Le Raspberry Pi 5 sert de tour de contrôle permanente ; aucun modèle IA local n'est requis.

## État vérifié — v0.9.0

La dernière CI GitHub valide :

- Ubuntu 24.04 ;
- Node.js 22.23.2 et npm 10.9.8 ;
- compilation TypeScript réussie ;
- **22 tests réussis, 0 échec** ;
- 0 vulnérabilité signalée par l'audit npm du job ;
- syntaxe des scripts Pi valide ;
- aucune commande `sudo` dans le paquet Pi.

Fonctions couvertes par les tests :

- SQLite WAL, projets, missions, runs, événements et reprise ;
- contextes Git ciblés avec SHA-256 et blocage de secrets ;
- runner avec logs, heartbeat, timeout et arrêt du groupe de processus ;
- leases anti-double-lancement ;
- adaptateurs Codex et Mistral Vibe simulés de bout en bout ;
- sauvegarde cohérente et détection de corruption ;
- daemon de synchronisation/récupération ;
- console Matrix globale ;
- receipts vérifiables et détection de falsification.

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
│   ├── backups/                snapshots vérifiables
│   └── daemon-status.json
├── console Matrix multi-projets
├── contexte Git ciblé + manifestes SHA-256
├── runner de processus contrôlé
├── Codex CLI
├── Mistral Vibe CLI
└── futurs adaptateurs
```

Le Pi coordonne. Les modèles restent chez leurs fournisseurs officiels ou sur une autre machine. Un laboratoire de petit modèle local pourra être étudié plus tard, sans dépendance fonctionnelle.

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

L'installateur utilisateur :

- compile et lance tous les tests ;
- initialise `~/.superia` ;
- installe `~/.local/bin/superia` ;
- crée un service systemd utilisateur durci ;
- lance un tick du daemon ;
- crée puis vérifie la première sauvegarde ;
- n'utilise pas `sudo` ;
- n'installe aucun modèle local.

Voir [Installation Raspberry Pi](docs/PI_INSTALL.md).

## Flux principal

```bash
# Enregistrer le dépôt
superia init

# Créer la mission
superia task create "Ajouter une authentification locale"

# Préparer le worktree d'écriture
superia worktree TASK-0001 --dry-run
superia worktree TASK-0001

# Contrôler le contexte avant envoi
superia context build TASK-0001 --max-bytes 300000

# Prévisualiser un agent sans le lancer
superia agent run codex TASK-0001 --mode plan --dry-run
superia agent run vibe TASK-0001 --mode plan --dry-run

# Lancer une analyse réelle après installation/authentification de la CLI
superia agent run codex TASK-0001 --mode plan

# Pour Vibe, plafonner explicitement les ressources
superia agent run vibe TASK-0001 \
  --mode plan \
  --max-turns 8 \
  --max-tokens 50000 \
  --max-price 0.25

# Exécuter les checks du dépôt dans le runner
superia validate

# Créer et vérifier la preuve du run
superia receipt create <RUN-ID>
superia receipt verify ~/.superia/runs/<RUN-ID>/RECEIPT.json
```

## Politique des agents

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
- vrais tests exécutés ensuite par Super IA ;
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

La console Matrix affiche SQLite/WAL, projets globaux, missions, runs actifs, fournisseurs, outils et politique de coût.

## Sauvegardes

```bash
superia backup create
superia backup list
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS
```

Une sauvegarde contient une image SQLite créée avec `VACUUM INTO`, le journal JSONL et un manifeste de tailles/SHA-256. Restic et la restauration automatisée restent à intégrer.

## Receipts

Un receipt rassemble le run, le projet, la mission, les commits, le contexte, les logs, les validations et les empreintes des artefacts.

Il distingue :

- agent terminé ou non ;
- contexte vérifié ou non ;
- validations absentes, réussies ou échouées ;
- artefacts intacts ou modifiés.

Il impose toujours :

```json
{
  "humanApprovalRequired": true
}
```

Voir [Receipts de preuve](docs/RECEIPTS.md).

## Sécurité

- aucun faux compte ou contournement de quota ;
- API génériques désactivées par défaut ;
- aucune fusion automatique ;
- worktree obligatoire pour écrire ;
- lease exclusif par mission ;
- environnement transmis aux processus réduit ;
- fichiers sensibles et secrets à haute confiance exclus du contexte ;
- Codex garde sa sandbox officielle ;
- Vibe ne reçoit aucun shell ;
- service Pi non privilégié et durci ;
- receipts et sauvegardes vérifiables.

## Limites actuelles

- pas encore de test réel sur le Raspberry Pi 5 ;
- pas encore de mission réelle authentifiée Codex/Vibe dans cette CI ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22 ;
- scanner interne de secrets présent, mais Gitleaks externe pas encore intégré ;
- pas encore de sandbox bubblewrap/Podman commune aux futurs agents ;
- pas encore de routeur automatique coût/qualité ;
- pas encore de reviewer indépendant ni DAG de tâches ;
- sauvegardes locales vérifiées, mais restauration et Restic à ajouter ;
- aucune interface web locale pour l'instant.

## Documentation

- [État vérifié](docs/STATUS.md)
- [Plan de contrôle](docs/CONTROL_PLANE.md)
- [Adaptateurs Codex et Vibe](docs/AGENT_ADAPTERS.md)
- [Receipts](docs/RECEIPTS.md)
- [Installation Pi](docs/PI_INSTALL.md)
- [Sécurité](docs/SECURITY.md)
- [Feuille de route](docs/ROADMAP.md)
- [Recherche approfondie](docs/research/README.md)

## Licence

MIT.

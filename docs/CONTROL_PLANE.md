# Plan de contrôle durable

Super IA 0.9 conserve l'état global indépendamment des terminaux et des dépôts individuels.

## Emplacement

```text
~/.superia/
├── control.sqlite
├── events/events.jsonl
├── runs/<RUN-ID>/
│   ├── stdout.log
│   ├── stderr.log
│   └── RECEIPT.json
├── backups/backup-.../
│   ├── control.sqlite
│   ├── events.jsonl
│   └── MANIFEST.json
└── daemon-status.json
```

Autre emplacement :

```bash
export SUPERIA_HOME=/srv/superia
```

## SQLite

Réglages :

- WAL ;
- clés étrangères ;
- `busy_timeout=5000` ;
- `synchronous=NORMAL` ;
- migrations versionnées.

Données :

- projets ;
- missions synchronisées depuis `.superia/tasks/*.json` ;
- runs et métadonnées ;
- PID, heartbeats et dates ;
- événements auditables ;
- leases d'exécution.

Les JSON par dépôt restent la projection lisible. SQLite coordonne plusieurs projets et processus.

## Runs

Un run peut être :

```text
queued
running
completed
failed
cancelled
interrupted
```

Le runner enregistre le PID et actualise le heartbeat. Un timeout envoie `SIGTERM`, puis `SIGKILL` au groupe si nécessaire.

```bash
superia run list
superia recover --stale-minutes 5
```

La récupération marque un run inactif `interrupted`. Elle ne relance pas automatiquement un agent.

## Leases

Une exécution d'agent prend un lease :

```text
agent:<project-id>:<task-id>
```

Un second worker ne peut pas prendre la mission avant libération ou expiration. Les leases évitent les doubles modifications concurrentes ; les clés d'idempotence métier restent à ajouter.

## Journal JSONL

Chaque événement SQLite est recopié dans :

```text
~/.superia/events/events.jsonl
```

L'événement est d'abord durable en base avec `journaled=0`. En cas d'échec d'écriture, il reste en attente et sera rejoué à la prochaine ouverture.

## Artefacts

Chaque processus géré possède :

```text
~/.superia/runs/<RUN-ID>/stdout.log
~/.superia/runs/<RUN-ID>/stderr.log
```

Les contextes d'agents restent près de leur dépôt ou worktree :

```text
<repo>/.superia/contexts/CTX-.../
```

Un receipt peut ensuite relier les deux ensembles.

## Daemon

```bash
superia daemon --once
superia daemon --interval-seconds 30 --stale-minutes 5
```

À chaque tick :

1. récupération des runs inactifs ;
2. lecture des projets actifs ;
3. nouveau scan Git ;
4. synchronisation des missions ;
5. événement d'erreur par projet ;
6. écriture de `daemon-status.json`.

Le daemon ne lance aucun agent IA.

## Sauvegardes

```bash
superia backup create
superia backup list
superia backup verify <dossier>
```

La base est copiée avec `VACUUM INTO`, puis le journal JSONL est ajouté. Le manifeste contient taille et SHA-256 de chaque fichier.

La restauration automatique et Restic restent à construire.

## Commandes globales

```bash
superia control status --json

superia project add /chemin/du/depot
superia project sync /chemin/du/depot
superia project list
superia project show <PROJECT-ID>

superia run list
superia events --limit 100
superia recover --stale-minutes 5

superia backup create
superia daemon --once
superia matrix
```

## Intégration avec les agents

Codex et Vibe utilisent le même plan de contrôle :

- synchronisation du projet ;
- construction du contexte ;
- acquisition du lease ;
- création du run ;
- lancement par le runner ;
- logs, événements et résultat ;
- libération du lease ;
- receipt facultatif mais recommandé.

Voir [Adaptateurs](AGENT_ADAPTERS.md) et [Receipts](RECEIPTS.md).

## Limites

- test matériel Pi non effectué ;
- `node:sqlite` encore signalé expérimental sous Node 22 ;
- pas de checkpoint intermédiaire d'agent ;
- pas de reprise de session automatique ;
- pas de DAG ;
- pas de relation de pipeline explicite entre runs ;
- pas de serveur web ;
- pas de restauration automatisée.

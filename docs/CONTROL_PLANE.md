# Plan de contrôle durable

Super IA 0.4 introduit un état global et multi-projets indépendant des terminaux et des dépôts individuels.

## Emplacement

Par défaut :

```text
~/.superia/
├── control.sqlite
├── events/events.jsonl
└── backups/
```

L'emplacement peut être remplacé sans modifier les dépôts :

```bash
export SUPERIA_HOME=/srv/superia
```

## SQLite

La base utilise :

- le mode WAL ;
- les clés étrangères ;
- un délai d'attente de 5 secondes en cas de verrou ;
- `synchronous=NORMAL` ;
- des migrations versionnées.

Le schéma initial conserve :

- les projets ;
- les missions importées depuis `.superia/tasks/*.json` ;
- les runs d'agents ;
- les heartbeats ;
- les événements auditables.

Les fichiers JSON par dépôt restent la représentation lisible et compatible de la v0.3. `superia project sync` les importe ou les met à jour dans le registre global.

## Journal JSONL

Chaque événement SQLite possède un miroir append-only dans :

```text
~/.superia/events/events.jsonl
```

Un événement est d'abord persisté dans SQLite avec l'état `journaled=0`, puis recopié dans le journal. Si l'écriture du fichier échoue, l'événement reste en attente et sera rejoué à la prochaine ouverture du plan de contrôle.

## Reprise

Un run contient un heartbeat. La commande suivante marque les runs trop anciens comme `interrupted` :

```bash
superia recover --stale-minutes 5
```

Cette étape ne relance aucun agent toute seule. Elle rétablit un état fiable avant une future décision de reprise ou de réexécution.

## Commandes

```bash
superia control init
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

`superia init`, `superia task create` et la création réelle d'un worktree resynchronisent automatiquement le dépôt courant avec le registre global.

## Limites de ce lot

Le plan de contrôle ne lance pas encore Codex, Mistral Vibe ou un autre agent. Il fournit la persistance et la reprise nécessaires au futur runner générique.

Les éléments suivants restent à construire :

- leases et clés d'idempotence ;
- checkpoints ;
- graphe de dépendances ;
- runner de processus ;
- sandbox ;
- adaptateurs IA ;
- receipts de validation ;
- sauvegarde automatisée.

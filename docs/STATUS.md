# État vérifié du projet

Date du contrôle : **14 août 2026**  
Branche contrôlée : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

Ce document distingue strictement ce qui est présent dans Git, ce qui a été validé par la CI et ce qui reste à construire.

## Résultat du contrôle v0.4.0

| Élément | Résultat |
|---|---|
| Version du paquet | `0.4.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | 12 réussis, 0 échec |
| Audit npm du job CI | 0 vulnérabilité signalée |
| Environnement CI | Ubuntu 24.04, Node 22.23.2, npm 10.9.8 |

Commande complète exécutée :

```bash
npm test
```

## Livré et vérifié

### Socle Git

- détection de la racine, de la branche, du remote et de l'état Git ;
- détection de la stack et des commandes de validation ;
- missions lisibles `TASK-XXXX` dans `.superia/tasks` ;
- branche et worktree dédiés par mission ;
- mode `--dry-run`.

### Plan de contrôle global

- répertoire global `SUPERIA_HOME` ou `~/.superia` ;
- base `control.sqlite` ;
- SQLite en mode WAL ;
- clés étrangères, `busy_timeout=5000` et `synchronous=NORMAL` ;
- première migration de schéma versionnée ;
- registre multi-projets ;
- identifiant de projet stable dérivé de son chemin ;
- synchronisation des missions JSON existantes ;
- persistance des runs et de leurs heartbeats ;
- états `running`, `completed`, `failed`, `cancelled` et `interrupted` ;
- récupération des runs devenus inactifs ;
- événements SQLite auditables ;
- miroir append-only `events/events.jsonl` ;
- reprise des événements non encore recopiés dans le journal.

### Commandes ajoutées

```bash
superia control init
superia control status --json
superia status --json

superia project add [path]
superia project sync [path]
superia project list
superia project show <PROJECT-ID>

superia run start <provider> [TASK-ID]
superia run list
superia run heartbeat <RUN-ID>
superia run finish <RUN-ID> completed|failed|cancelled

superia events --limit 100
superia recover --stale-minutes 5
```

`superia init`, `task create` et la création réelle d'un worktree resynchronisent le dépôt courant dans le registre global.

### Tests ajoutés

1. SQLite utilise réellement le mode WAL ;
2. deux projets restent présents après fermeture et réouverture ;
3. les anciennes missions JSON sont importées ;
4. les événements sont entièrement recopiés dans JSONL ;
5. un run sans heartbeat récent devient `interrupted` ;
6. tous les anciens tests Git, Matrix, catalogues et sécurité restent verts.

## Limites connues

### Node SQLite

`node:sqlite` est encore signalé comme expérimental par Node 22. Le projet fixe donc actuellement Node `>=22.5` et conserve l'accès SQLite derrière le module `control-plane` afin de pouvoir changer de backend si nécessaire.

### Exécution d'agents

Les runs sont persistants, mais aucun processus Codex, Mistral, Claude ou Gemini n'est encore lancé par Super IA. La commande `run start` ouvre seulement l'enregistrement durable qui sera utilisé par le futur runner.

### Sécurité système

Le worktree reste une isolation Git, pas une sandbox. Bubblewrap ou Podman doivent être ajoutés avant d'autoriser une exécution autonome de commandes non fiables.

### Contexte et secrets

Le constructeur de contexte, les manifestes de fichiers et le scan Gitleaks ne sont pas encore codés. Aucun envoi distant automatique ne doit être activé avant cette étape.

## Prochain lot recommandé

1. runner de processus avec timeout et arrêt du groupe de processus ;
2. leases et clés d'idempotence ;
3. contexte Git ciblé et manifestes SHA-256 ;
4. Gitleaks avant tout contexte distant ;
5. adaptateur générique CLI ;
6. adaptateur Codex non interactif avec sortie JSONL ;
7. validations et receipt minimal ;
8. sauvegarde/restauration ;
9. paquet systemd et test réel sur Raspberry Pi 5.

## Critères avant installation permanente sur le Pi

- reprise après arrêt brutal testée sur la machine ;
- sauvegarde et restauration testées ;
- secrets absents de tous les paquets distants ;
- agent confiné au worktree et à une sandbox ;
- arrêt d'urgence fonctionnel ;
- service systemd non privilégié ;
- au moins un adaptateur IA testé de bout en bout ;
- documentation d'installation reproductible.

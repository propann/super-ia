# Super IA

**Centre de commandement local, multi-projets et multi-fournisseurs pour piloter des agents de développement avec contrôle des coûts, sécurité, reprise, suivi et preuves.**

Le Raspberry Pi 5 sert de tour de contrôle permanente. Les modèles restent chez leurs fournisseurs officiels ; aucun modèle IA local n'est requis.

## État vérifié — v0.13.0

La CI GitHub valide :

- Ubuntu 24.04 ;
- Node.js 22.23.2 et npm 10.9.8 ;
- compilation TypeScript réussie ;
- **39 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- scripts Pi valides ;
- aucune commande `sudo` dans le paquet Pi.

Fonctions principales :

- SQLite WAL multi-projets ;
- missions, priorités, blocages, dépendances et suivi ;
- Git branches et worktrees ;
- contexte ciblé avec SHA-256 ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- Codex et Mistral Vibe ;
- Gitleaks obligatoire ;
- Bubblewrap obligatoire sous Linux ;
- contrôle des fichiers modifiés après chaque agent ;
- reviewer indépendant et structuré ;
- pipeline builder → validation → review → receipt ;
- checkpoints atomiques et reprise contrôlée ;
- receipts vérifiables ;
- sauvegardes cohérentes ;
- daemon, service systemd utilisateur et console Matrix ;
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

L'installateur compile, teste, initialise `~/.superia`, installe la commande et le service utilisateur, vérifie une sauvegarde et lance l'autotest Bubblewrap lorsqu'il est disponible. Il n'utilise pas `sudo`.

Sans Gitleaks ou Bubblewrap, le centre de contrôle reste installable mais les agents réels sont bloqués par défaut.

## Flux recommandé

```bash
superia init
superia task create "Modifier le module d'authentification"

superia task update TASK-0001 \
  --priority high \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "tests réussis" \
  --accept "review indépendante approuvée"

superia worktree TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe
```

Le sens inverse est pris en charge :

```bash
superia pipeline run TASK-0001 \
  --builder vibe \
  --reviewer codex \
  --max-price 0.25
```

## Pipeline contrôlé

```text
builder
  ↓
Gitleaks + Bubblewrap
  ↓
change guard
  ↓
validations locales
  ↓
reviewer différent et read-only
  ↓
REVIEW.json
  ↓
receipt SHA-256
  ↓
approbation humaine
```

Le reviewer ne démarre pas si le builder, le périmètre Git ou les validations échouent.

### Suivre et reprendre

```bash
superia pipeline status TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

État durable :

```text
.superia/pipelines/TASK-0001.json
```

Une reprise ne relance pas une étape déjà terminée. Super IA refuse de relancer silencieusement un builder si aucun checkpoint builder complet n'existe.

Voir [Pipeline multi-agent](docs/PIPELINE.md).

## Quatre barrières autour d'un agent

### 1. Gitleaks

```text
Gitleaks absent  → agent refusé
finding          → agent refusé
scan propre      → préflight validé
```

### 2. Bubblewrap

- vrai HOME non monté ;
- HOME jetable `/home/superia` ;
- système en lecture seule ;
- plan/review en lecture seule ;
- build limité au worktree ;
- état fournisseur limité ;
- réseau isolable ;
- dérogation explicite et journalisée.

```bash
superia security sandbox-check --json
```

La CI valide la politique avec des mocks. Le test noyau réel reste à exécuter sur le Pi.

### 3. Change guard

Un build exige au moins un `--allow-path`. Après le run, Super IA produit :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Une modification hors périmètre fait échouer le run, même lorsque l'agent renvoie le code 0.

Voir [Contrôle des modifications](docs/CHANGE_GUARD.md).

### 4. Reviewer indépendant

- fournisseur différent du builder ;
- lecture seule ;
- JSON structuré obligatoire ;
- sévérité, preuve et recommandation pour chaque finding ;
- réponse invalide transformée en `blocked` ;
- approbation incohérente transformée en `changes-requested`.

## Dérogations exceptionnelles

```bash
superia agent run codex TASK-0001 \
  --mode plan \
  --allow-without-gitleaks \
  --allow-without-bwrap
```

Elles produisent un état `waived` et des événements durables. Une dérogation ne vaut jamais validation.

## Suivi des tâches

```bash
superia task list
superia task show TASK-0001
superia task board
superia task note TASK-0001 "Accès au Pi nécessaire."
superia task update TASK-0001 --status blocked --priority critical
superia task update TASK-0002 --depends TASK-0001
```

Une mission conserve : statut, priorité, responsable, fournisseur, échéance, tags, dépendances, critères d'acceptation, chemins autorisés et notes.

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

## Sauvegardes et receipts

```bash
superia backup create
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS

superia receipt create <RUN-ID>
superia receipt verify ~/.superia/runs/<RUN-ID>/RECEIPT.json
```

Les receipts incluent les logs, le contexte, le change guard, le patch, les validations et la review indépendante. L'approbation humaine reste obligatoire. Super IA ne fusionne jamais automatiquement.

## État de la feuille de route

| État | Nombre |
|---|---:|
| Terminé | 10 |
| En cours | 1 |
| Planifié | 10 |
| Bloqué | 2 |

`SIA-301` et `SIA-302` sont terminés. `SIA-203` — Bubblewrap — attend encore la preuve noyau réelle du Pi.

## Prochaines priorités

1. limiter les retries et détecter les boucles ;
2. lancer l'autotest Bubblewrap réel sur le Pi ;
3. installer v0.13 sur le Pi 5 ;
4. tester reprise et restauration matérielles ;
5. tester Codex et Vibe réels ;
6. intégrer Restic ;
7. construire le routeur coût/qualité ;
8. construire le DAG de missions.

## Documentation

- [État vérifié](docs/STATUS.md)
- [Feuille de route](docs/ROADMAP.md)
- [Registre JSON](docs/ROADMAP_TRACKER.json)
- [Suivi des tâches](docs/TASK_TRACKER.md)
- [Pipeline multi-agent](docs/PIPELINE.md)
- [Plan de contrôle](docs/CONTROL_PLANE.md)
- [Adaptateurs](docs/AGENT_ADAPTERS.md)
- [Sandbox Bubblewrap](docs/SANDBOX.md)
- [Contrôle des modifications](docs/CHANGE_GUARD.md)
- [Receipts](docs/RECEIPTS.md)
- [Installation Pi](docs/PI_INSTALL.md)
- [Sécurité](docs/SECURITY.md)

## Licence

MIT.

# Super IA

**Centre de commandement local, multi-projets et multi-fournisseurs pour piloter des agents de développement avec contrôle des coûts, sécurité, reprise, suivi et preuves.**

Le Raspberry Pi 5 sert de tour de contrôle permanente. Les modèles restent chez leurs fournisseurs officiels ; aucun modèle IA local n'est requis.

## État vérifié — v0.14.0

La CI GitHub valide :

- Ubuntu 24.04 ;
- Node.js 22.23.2 et npm 10.9.8 ;
- compilation TypeScript réussie ;
- **48 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- scripts Pi valides ;
- aucune commande `sudo` dans le paquet Pi.

Fonctions principales :

- SQLite WAL multi-projets ;
- missions, priorités, dépendances, blocages et suivi ;
- Git branches et worktrees ;
- contexte ciblé avec SHA-256 ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- Codex et Mistral Vibe ;
- Gitleaks et Bubblewrap obligatoires avant les agents réels ;
- contrôle des fichiers modifiés, chemins critiques et taille des diffs ;
- reviewer indépendant et structuré ;
- pipeline builder → validation → review → receipt ;
- checkpoints atomiques et reprise contrôlée ;
- corrections explicites, bornées et protégées contre les boucles ;
- receipts vérifiables ;
- sauvegardes cohérentes ;
- daemon, service systemd utilisateur et console Matrix ;
- roadmap machine-lisible contrôlée par la CI.

Voir [l'état vérifié](docs/STATUS.md).

## Installation

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
npm install
npm test
npm link
```

Node.js **22.5 ou supérieur** est requis.

Sur Raspberry Pi 5 :

```bash
bash install/pi/install.sh
```

L'installateur n'utilise pas `sudo`. Sans Gitleaks ou Bubblewrap, le plan de contrôle reste installable mais les agents réels sont bloqués.

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
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Le sens inverse est pris en charge : Vibe builder et Codex reviewer.

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

### Reprise

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

Une étape terminée n'est pas relancée.

### Correction bornée

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --retry
```

Le retry exige une review `changes-requested`. La review précédente est transmise au builder par fichier et n'apparaît pas dans `argv`.

Les plafonds sont figés au premier lancement :

```text
maxAttempts
maxTotalPriceUsd
reservedPerAttemptUsd
```

Chaque builder terminé consomme une tentative. Chaque patch reçoit une empreinte SHA-256. Un patch déjà vu arrête la boucle avant une nouvelle validation ou review.

Causes d'arrêt :

```text
approved
changes-requested
review-blocked
retry-limit
price-limit
loop-detected
technical-failure
```

Le prix affiché est un **plafond Vibe réservé**, pas une dépense réelle supposée.

Voir [Pipeline multi-agent](docs/PIPELINE.md).

## Barrières de sécurité

### Gitleaks

```text
Gitleaks absent  → agent refusé
finding          → agent refusé
scan propre      → préflight validé
```

### Bubblewrap

- HOME jetable ;
- système en lecture seule ;
- plan/review en lecture seule ;
- build limité au worktree ;
- réseau isolable ;
- dérogation explicite et journalisée.

```bash
superia security sandbox-check --json
```

La frontière noyau réelle reste à vérifier sur le Pi cible.

### Change guard

Un build exige au moins un `--allow-path`. Après le run :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Le garde refuse :

- un fichier hors périmètre ;
- `.env`, `.npmrc`, `.pypirc`, clés privées et `.git-credentials` ;
- plus de 50 fichiers modifiés ;
- plus de 1 000 000 octets effectifs.

Le volume compte aussi le contenu complet des fichiers non suivis. Même un glob `**` ne peut pas autoriser les chemins critiques.

Voir [Contrôle des modifications](docs/CHANGE_GUARD.md).

### Reviewer indépendant

- fournisseur différent du builder ;
- lecture seule ;
- JSON structuré obligatoire ;
- sévérité, preuve et recommandation ;
- réponse invalide → `blocked` ;
- approbation incohérente → `changes-requested`.

## Suivi des tâches

```bash
superia task list
superia task show TASK-0001
superia task board
superia task note TASK-0001 "Accès au Pi nécessaire."
superia task update TASK-0001 --status blocked --priority critical
superia task update TASK-0002 --depends TASK-0001
```

Une mission conserve statut, priorité, responsable, fournisseur, échéance, tags, dépendances, critères d'acceptation, chemins autorisés et notes.

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

## Sauvegardes et preuves

```bash
superia backup create
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS

superia receipt create <RUN-ID>
superia receipt verify ~/.superia/runs/<RUN-ID>/RECEIPT.json
```

L'approbation humaine reste obligatoire. Super IA ne fusionne jamais automatiquement.

## État de la feuille de route

| État | Nombre |
|---|---:|
| Terminé | 12 |
| En cours | 1 |
| Planifié | 9 |
| Bloqué | 2 |
| **Total** | **24** |

Le pipeline multi-agent et le durcissement des diffs sont terminés. Bubblewrap attend encore la preuve noyau réelle du Pi.

## Prochaines priorités

1. lancer l'autotest Bubblewrap réel sur le Pi ;
2. installer v0.14 sur le Pi 5 ;
3. tester reprise et restauration matérielles ;
4. tester Codex et Vibe réels ;
5. intégrer Restic ;
6. construire le routeur coût/qualité ;
7. construire le DAG de missions ;
8. ajouter l'interface web locale et les notifications.

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

# État vérifié du projet

Date du contrôle : **15 août 2026**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat v0.14.0

| Élément | Résultat |
|---|---|
| Version | `0.14.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **48 réussis, 0 échec** |
| Audit npm du job | 0 vulnérabilité signalée |
| Système CI | Ubuntu 24.04 |
| Node / npm | 22.23.2 / 10.9.8 |
| Scripts Pi | syntaxe valide |
| Commande `sudo` dans `install/pi` | aucune |

## Socle livré

- SQLite WAL et migrations ;
- registre multi-projets ;
- missions, runs, heartbeats, événements et reprise ;
- leases exclusifs ;
- scanner Git, branches et worktrees ;
- contexte ciblé et manifestes SHA-256 ;
- runner sans shell implicite avec logs, timeout et arrêt des descendants ;
- Codex et Mistral Vibe ;
- Gitleaks obligatoire avant les agents réels ;
- Bubblewrap obligatoire sous Linux avant les agents réels ;
- contrôle des fichiers modifiés avec limites et chemins critiques interdits ;
- reviewer indépendant ;
- pipeline builder → validations → review → receipt ;
- checkpoints et reprise ;
- retries explicites et bornés ;
- détection de patch identique ;
- plafond de prix Vibe réservé ;
- receipts vérifiables ;
- sauvegardes cohérentes ;
- daemon, service Pi utilisateur et console Matrix ;
- roadmap et suivi de tâches contrôlés par la CI.

## Pipeline contrôlé

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Ordre déterministe :

```text
builder
  ↓
change guard
  ↓
validations locales
  ↓
reviewer indépendant
  ↓
REVIEW.json
  ↓
receipt SHA-256
  ↓
approbation humaine
```

Le reviewer ne démarre pas si le builder, le garde Git ou les validations échouent. Aucune fusion automatique n'est possible.

## Reviewer indépendant

- fournisseur différent du builder ;
- mode read-only ;
- JSON structuré obligatoire ;
- preuve et recommandation pour chaque finding ;
- sortie invalide transformée en `blocked` ;
- `approve` avec finding moyen ou supérieur transformé en `changes-requested`.

## Checkpoints et reprise

État atomique :

```text
.superia/pipelines/TASK-XXXX.json
```

Étapes :

```text
initialized
builder-completed
validation-completed
review-completed
receipt-created
```

```bash
superia pipeline status TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

Les tests prouvent la reprise après le builder et après la review sans relancer les étapes terminées.

## Retries et détection de boucle

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --retry
```

Règles :

- retry autorisé seulement après `changes-requested` ;
- review précédente injectée au builder par fichier, pas dans `argv` ;
- plafonds d'essais et de prix figés au premier lancement ;
- chaque builder terminé consomme une tentative ;
- chaque patch est empreinté en SHA-256 ;
- un patch déjà produit arrête la boucle avant une nouvelle validation/review ;
- causes d'arrêt persistées.

Le prix réservé est le plafond maximal autorisé pour Vibe, pas une dépense réelle inventée.

## Contrôle des modifications renforcé

Chaque mission déclare son périmètre :

```bash
superia task update TASK-0001 \
  --allow-path "src/**" \
  --allow-path "tests/**"
```

Un build sans chemin autorisé est refusé. Une modification hors périmètre transforme le run en `failed`.

Limites sûres par défaut :

```text
50 fichiers modifiés maximum
1 000 000 octets effectifs maximum
```

Le calcul inclut le diff binaire Git et le contenu complet des fichiers non suivis.

Toujours interdits, même avec `allowedPaths: ["**"]` :

```text
.env et variantes
.npmrc
.pypirc
clés *.pem et *.key
id_rsa et id_ed25519
.git-credentials
```

Artefacts :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Le rapport distingue :

- `outOfScopeFiles` ;
- `forbiddenFiles` ;
- `limitViolations` ;
- nombre de fichiers ;
- nombre d'octets effectifs.

## Receipts

Les receipts incluent contexte, logs, résultat agent, patch, change guard, validations, review, identité du reviewer, verdict, findings et `humanApprovalRequired: true`.

Toute modification ultérieure d'un artefact invalide la preuve SHA-256.

## Couverture des 48 tests

La suite couvre notamment :

- sauvegarde et corruption ;
- SQLite WAL, projets, tâches, runs et événements ;
- reprise des runs et leases ;
- contexte ciblé et exclusion de secrets ;
- Gitleaks et dérogations ;
- Bubblewrap et HOME jetable ;
- Codex et Vibe simulés ;
- runner, logs, timeout et descendants ;
- périmètre Git et patch archivé ;
- chemin `.env` interdit malgré un glob large ;
- dépassement du nombre de fichiers ;
- dépassement d'octets avec fichier non suivi ;
- limite invalide bloquante ;
- reviewer structuré ;
- pipeline complet ;
- checkpoints et reprise ;
- budget de retries immuable ;
- injection de feedback et boucle identique ;
- receipts et falsification ;
- roadmap et scripts Pi.

## État de la roadmap

| État | Nombre |
|---|---:|
| Terminé | 12 |
| En cours | 1 |
| Planifié | 9 |
| Bloqué | 2 |
| Total | 24 |

`SIA-206` — limites de diff et chemins critiques — est terminé. `SIA-203` reste en cours jusqu'à la validation Bubblewrap réelle sur le Pi.

## Encore à prouver sur le Pi

- installation complète de v0.14 ;
- espaces de noms Bubblewrap réellement fonctionnels ;
- compatibilité Bubblewrap + sandbox native Codex ;
- Codex et Vibe authentifiés ;
- reprise après coupure ;
- restauration d'une sauvegarde ;
- service disponible après déconnexion.

## Limites actuelles

- prix réel Codex/Vibe non encore extrait des événements ;
- correction automatique sans intervention humaine non activée ;
- réseau Codex/Vibe nécessaire pour joindre leurs services ;
- filtrage réseau par domaine non livré ;
- limites de diff globales, non encore personnalisables par projet ;
- DAG, routeur coût/qualité et interface web non livrés ;
- Restic et restauration automatisée non livrés ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22 ;
- aucune fusion automatique.

## Suite prioritaire

1. `SIA-203` — autotest Bubblewrap réel sur le Pi ;
2. `SIA-101` — installer v0.14 sur le Pi 5 ;
3. `SIA-102` / `SIA-103` — reprise et restauration ;
4. `SIA-104` / `SIA-105` — Codex et Vibe réels ;
5. `SIA-205` — Restic ;
6. `SIA-401` — routeur coût/qualité mesuré ;
7. `SIA-402` — DAG de missions.

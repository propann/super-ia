# État vérifié du projet

Date du contrôle : **15 août 2026**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat v0.13.0

| Élément | Résultat |
|---|---|
| Version | `0.13.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **39 réussis, 0 échec** |
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
- contrôle des fichiers modifiés ;
- reviewer indépendant ;
- pipeline builder → validations → review → receipt ;
- checkpoints et reprise du pipeline ;
- receipts vérifiables ;
- sauvegardes cohérentes ;
- daemon, service Pi utilisateur et console Matrix ;
- roadmap et suivi de tâches contrôlés par la CI.

## Contrôle des modifications

Chaque mission déclare son périmètre d'écriture :

```bash
superia task update TASK-0001 \
  --allow-path "src/**" \
  --allow-path "tests/**"
```

Un build sans chemin autorisé est refusé. Après le run, Super IA archive :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Une modification hors périmètre transforme le run en `failed`, même si l'agent retourne le code 0.

Voir [`CHANGE_GUARD.md`](CHANGE_GUARD.md).

## Reviewer indépendant

Le reviewer doit utiliser un fournisseur différent du builder :

```text
Codex builder → Vibe reviewer
Vibe builder  → Codex reviewer
```

Le mode review est strictement en lecture seule. Le reviewer doit produire un JSON structuré :

```json
{
  "verdict": "approve | changes-requested | blocked",
  "findings": [
    {
      "severity": "critical | high | medium | low",
      "category": "security",
      "summary": "...",
      "evidence": "...",
      "recommendation": "...",
      "file": "src/example.ts",
      "line": 42
    }
  ],
  "residualRisks": []
}
```

Une réponse non structurée est automatiquement bloquée. Un verdict `approve` contenant un finding `medium`, `high` ou `critical` est automatiquement transformé en `changes-requested`.

## Pipeline contrôlé

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe
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

Le reviewer n'est pas lancé si le builder, le garde Git ou les validations échouent. Aucune fusion automatique n'est possible.

## Checkpoints et reprise

Chaque mission possède un état atomique :

```text
.superia/pipelines/TASK-XXXX.json
```

Étapes enregistrées :

```text
initialized
builder-completed
validation-completed
review-completed
receipt-created
```

Commandes :

```bash
superia pipeline status TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

La reprise ne relance jamais un builder sans checkpoint complet. Les tests prouvent :

- reprise après interruption juste après le builder ;
- reprise après la review en ne recréant que le receipt ;
- absence de double exécution des étapes déjà terminées.

## Receipts enrichis

Les receipts incluent désormais :

- `CHANGE_GUARD.json` ;
- `AGENT_CHANGES.patch` ;
- `REVIEW.json` ;
- l'identité du reviewer ;
- le verdict de review ;
- le nombre de findings ;
- l'état des validations ;
- `humanApprovalRequired: true`.

Toute modification ultérieure d'un artefact invalide sa preuve SHA-256.

## Sécurité Bubblewrap

La politique validée en CI comprend :

- HOME jetable `/home/superia` ;
- système et exécutables en lecture seule ;
- plan/review en lecture seule ;
- build limité au worktree ;
- sorties individuelles autorisées ;
- capacités supprimées ;
- namespaces utilisateur, PID, IPC, UTS et cgroup ;
- réseau isolable ;
- dérogation explicite et journalisée.

La frontière noyau réelle reste à confirmer sur le Pi :

```bash
superia security sandbox-check --json
```

## Couverture des 39 tests

La suite couvre notamment :

- sauvegarde et détection de corruption ;
- SQLite WAL, projets, tâches, runs et événements ;
- reprise des runs et leases ;
- contexte ciblé et exclusion de secrets ;
- Gitleaks propre, finding bloquant et dérogation ;
- politique Bubblewrap et HOME jetable ;
- Codex et Vibe simulés avec les préflights ;
- runner, logs, timeout et arrêt du groupe ;
- garde Git et refus des fichiers hors périmètre ;
- reviewer distinct et format structuré ;
- correction des approbations incohérentes ;
- pipeline complet sans appel IA réel ;
- reprise après builder et après review ;
- receipts et falsification ;
- roadmap et suivi des tâches ;
- scripts d'installation Pi et absence de `sudo`.

## État de la roadmap

| État | Nombre |
|---|---:|
| Terminé | 10 |
| En cours | 1 |
| Planifié | 10 |
| Bloqué | 2 |
| Total | 23 |

`SIA-301` et `SIA-302` sont terminés. `SIA-203` reste en cours jusqu'à la validation Bubblewrap réelle sur le Pi.

## Encore à prouver sur le Pi

- installation complète de v0.13 ;
- espaces de noms Bubblewrap réellement fonctionnels ;
- compatibilité Bubblewrap + sandbox native Codex ;
- Codex et Vibe authentifiés ;
- reprise après coupure ;
- restauration d'une sauvegarde ;
- service disponible après déconnexion.

## Limites actuelles

- réseau Codex/Vibe nécessaire pour joindre leurs services ;
- filtrage réseau par domaine non livré ;
- retries limités et détection de boucle non livrés ;
- correction automatique après review non livrée ;
- DAG, routeur coût/qualité et interface web non livrés ;
- Restic et restauration automatisée non livrés ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22 ;
- aucune fusion automatique.

## Suite prioritaire

1. `SIA-303` — budget de retries et détection de boucle ;
2. `SIA-203` — exécuter l'autotest Bubblewrap réel sur le Pi ;
3. `SIA-101` — installer v0.13 sur le Pi 5 ;
4. `SIA-102` / `SIA-103` — reprise et restauration ;
5. `SIA-104` / `SIA-105` — Codex et Vibe réels ;
6. `SIA-205` — Restic ;
7. `SIA-401` — routeur coût/qualité mesuré ;
8. `SIA-402` — DAG de missions.

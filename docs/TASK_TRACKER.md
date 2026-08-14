# Suivi opérationnel des tâches

Source de vérité machine-lisible : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json).

Dernière mise à jour : **15 août 2026**  
Version suivie : **0.14.0**

## État global

| État | Nombre |
|---|---:|
| Terminé | 12 |
| En cours | 1 |
| Planifié | 9 |
| Bloqué | 2 |
| Différé | 0 |
| **Total** | **24** |

## Sécurité d'exécution

| ID | État | Tâche | Résultat ou reste à faire |
|---|---|---|---|
| `SIA-201` | terminé | Gitleaks intégré | scans dir/git, rapport expurgé et finding bloquant |
| `SIA-202` | terminé | Gitleaks obligatoire | absence ou finding bloque les agents réels |
| `SIA-203` | en cours | Bubblewrap commun | politique validée ; autotest noyau réel attendu sur le Pi |
| `SIA-204` | terminé | Contrôle des fichiers modifiés | périmètre obligatoire, diff et hors-scope bloquant |
| `SIA-206` | terminé | Limites de diff et chemins critiques | 50 fichiers, 1 Mo effectif, credentials et clés toujours interdits |
| `SIA-205` | planifié | Restic | attend la restauration réelle sur le Pi |

## Pipeline qualité — milestone M3 terminé

| ID | État | Tâche | Résultat |
|---|---|---|---|
| `SIA-301` | terminé | Reviewer indépendant | fournisseur différent, lecture seule, findings structurés |
| `SIA-302` | terminé | Pipeline complet | builder → validation → review → receipt, checkpoints et reprise |
| `SIA-303` | terminé | Retries et boucle | plafonds immuables, feedback injecté, patch identique bloquant |

## Bloqué ou dépendant du Raspberry Pi

| ID | État | Tâche | Sortie attendue |
|---|---|---|---|
| `SIA-101` | bloqué | Installer v0.14 sur le Pi 5 | service, base, sauvegarde et rapport sandbox |
| `SIA-102` | planifié | Tester coupure et reprise | run interrompu détecté, aucun doublon |
| `SIA-103` | planifié | Tester restauration | copie restaurée et état relisible |
| `SIA-104` | planifié | Tester Codex réel | plan sous Bubblewrap et receipt valide |
| `SIA-105` | planifié | Tester Vibe réel | budget respecté, shell absent, receipt valide |

## Orchestration future

| ID | État | Tâche |
|---|---|---|
| `SIA-401` | planifié | Routeur coût/capacité/qualité mesurée |
| `SIA-402` | planifié | DAG de missions et détection de cycles |
| `SIA-403` | planifié | Interface web locale |
| `SIA-404` | planifié | Notifications sans doublon |
| `SIA-501` | bloqué | Passer la PR en prête pour revue |

## Terminé dans v0.14

### Corrections bornées — `SIA-303`

- retry uniquement après `changes-requested` ;
- correction explicite avec `--retry` ;
- review précédente transmise par fichier ;
- nombre maximal d'essais figé ;
- plafond total de prix réservé figé ;
- chaque builder terminé comptabilisé ;
- empreinte SHA-256 de chaque patch ;
- patch identique = `loop-detected` ;
- reviewer non relancé après boucle ;
- causes d'arrêt persistées.

### Durcissement des changements — `SIA-206`

- chemin autorisé ne neutralise jamais les chemins critiques ;
- `.env`, `.npmrc`, `.pypirc`, clés privées et `.git-credentials` bloqués ;
- 50 fichiers modifiés maximum ;
- 1 000 000 octets effectifs maximum ;
- contenu des fichiers non suivis compté ;
- limite invalide = fail-closed ;
- rapport `CHANGE_GUARD.json` enrichi ;
- **48 tests réussis, 0 échec**.

## Utilisation

Préparer :

```bash
superia task create "Modifier le module d'authentification"

superia task update TASK-0001 \
  --priority high \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "tests réussis" \
  --accept "review indépendante approuvée"

superia worktree TASK-0001
```

Lancer :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Suivre :

```bash
superia pipeline status TASK-0001
superia task board
```

Reprendre une interruption :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

Corriger une review :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --retry
```

## Règles de suivi

1. Une tâche ne passe à `done` qu'avec une preuve citée.
2. Une tâche `blocked` possède une cause explicite.
3. Une tâche critique possède des critères d'acceptation.
4. Une dépendance doit exister et ne peut pas pointer vers elle-même.
5. Un build exige un worktree et un périmètre autorisé.
6. Les chemins critiques restent interdits, même sous un glob large.
7. Tout dépassement de taille ou de nombre de fichiers bloque le run.
8. Builder et reviewer utilisent deux fournisseurs différents.
9. Une review non structurée est bloquante.
10. Une reprise ne relance pas une étape terminée.
11. Une correction exige `--retry` et une review `changes-requested`.
12. Un patch déjà vu arrête la boucle.
13. Les plafonds ne peuvent pas augmenter après le premier lancement.
14. Toute dérogation est explicite et journalisée.
15. Une validation simulée ne remplace pas une preuve matérielle.
16. La PR reste en brouillon tant que `SIA-501` est bloquée.
17. Aucune tâche ne supprime l'approbation humaine avant fusion.

# Suivi opérationnel des tâches

Source de vérité machine-lisible : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json).

Dernière mise à jour : **15 août 2026**  
Version suivie : **0.14.0**

## État global

| État | Nombre |
|---|---:|
| Terminé | 11 |
| En cours | 1 |
| Planifié | 9 |
| Bloqué | 2 |
| Différé | 0 |
| **Total** | **23** |

## Pipeline qualité — milestone M3 terminé

| ID | État | Tâche | Résultat |
|---|---|---|---|
| `SIA-301` | terminé | Reviewer indépendant | fournisseur différent, lecture seule, findings structurés et verdict bloquant |
| `SIA-302` | terminé | Pipeline builder → validation → review → receipt | étapes déterministes, checkpoints et reprise testée |
| `SIA-303` | terminé | Budget de retries et détection de boucle | essais et prix réservés bornés, feedback injecté, patch identique bloquant |

## Priorité immédiate

### Sécurité et Raspberry Pi

| ID | État | Tâche | Reste à faire |
|---|---|---|---|
| `SIA-203` | en cours | Sandbox Bubblewrap commune | autotest noyau et runs Codex/Vibe réels sur le Pi 5 |
| `SIA-101` | bloqué | Installer v0.14 sur le Pi 5 cible | accès terminal au Pi, service actif, sauvegarde et rapport sandbox |
| `SIA-102` | planifié | Tester coupure brutale et reprise | dépend de l'installation Pi |
| `SIA-103` | planifié | Tester sauvegarde et restauration | dépend de l'installation Pi |
| `SIA-104` | planifié | Tester Codex réel sous Bubblewrap | dépend du Pi et de l'authentification |
| `SIA-105` | planifié | Tester Vibe réel sous Bubblewrap | dépend du Pi et de l'authentification |

### Exploitation et orchestration

| ID | État | Tâche |
|---|---|---|
| `SIA-205` | planifié | Restic et politique de rétention |
| `SIA-401` | planifié | Routeur coût/capacité/qualité mesurée |
| `SIA-402` | planifié | DAG de missions et détection de cycles |
| `SIA-403` | planifié | Interface web locale |
| `SIA-404` | planifié | Notifications de blocage et fin de run |
| `SIA-501` | bloqué | Passer la PR en prête pour revue |

## Terminé dans v0.14 — `SIA-303`

- retry uniquement après une review `changes-requested` ;
- correction déclenchée explicitement avec `--retry` ;
- review précédente transmise au builder par fichier ;
- prompt de correction absent de la ligne de commande ;
- nombre maximal d'essais figé au premier lancement ;
- plafond total de prix réservé figé au premier lancement ;
- chaque builder terminé consomme une tentative ;
- empreinte SHA-256 de chaque patch ;
- patch identique détecté comme boucle ;
- reviewer non relancé après détection de boucle ;
- causes d'arrêt persistées ;
- coût présenté comme plafond réservé, jamais comme dépense réelle supposée.

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

## Lancer un pipeline borné

```bash
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

Voir l'état :

```bash
superia pipeline status TASK-0001
superia pipeline status TASK-0001 --json
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

Les plafonds du premier lancement restent ceux du pipeline ; une nouvelle commande ne peut pas les augmenter discrètement.

## Contrôles quotidiens

```bash
superia task board
superia pipeline status TASK-0001
superia security scan --required
superia security sandbox-check
superia run list
superia events --limit 100
```

## Règles de suivi

1. Une tâche ne passe à `done` qu'avec une preuve citée.
2. Une tâche `blocked` possède une cause explicite.
3. Une tâche critique possède des critères d'acceptation.
4. Une dépendance doit exister et ne peut pas pointer vers elle-même.
5. Un build exige un worktree et au moins un chemin autorisé.
6. Toute modification hors périmètre fait échouer le run.
7. Builder et reviewer utilisent deux fournisseurs différents.
8. Une review non structurée est bloquante.
9. Une reprise ne relance pas un builder sans checkpoint complet.
10. Une correction exige `--retry` et une review `changes-requested`.
11. Un patch déjà vu arrête la boucle.
12. Les plafonds de retry ne peuvent pas augmenter après le premier lancement.
13. Toute dérogation de sécurité est explicite et journalisée.
14. Une validation simulée ne remplace pas un test matériel requis.
15. La PR reste en brouillon tant que `SIA-501` est bloquée.
16. Aucune tâche ne supprime l'approbation humaine avant fusion.

# Suivi opérationnel des tâches

Source de vérité machine-lisible : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json).

Dernière mise à jour : **14 août 2026**  
Version suivie : **0.13.0**

## État global

| État | Nombre |
|---|---:|
| Terminé | 8 |
| En cours | 1 |
| Planifié | 12 |
| Bloqué | 2 |
| Différé | 0 |
| **Total** | **23** |

## Priorité immédiate

### Sécurité

| ID | État | Tâche | Reste à faire |
|---|---|---|---|
| `SIA-203` | en cours | Sandbox Bubblewrap commune | autotest noyau et runs Codex/Vibe réels sur le Pi 5 |
| `SIA-204` | terminé | Contrôle des fichiers modifiés | périmètre obligatoire, diff archivé et hors-scope bloquant |

### Bloqué par une action sur le Raspberry Pi

| ID | Tâche | Sortie attendue |
|---|---|---|
| `SIA-101` | Installer v0.13 sur le Pi 5 cible | service actif, sauvegarde vérifiée, `sandbox-status.json` produit |
| `SIA-102` | Tester coupure brutale et reprise | run interrompu détecté, aucun doublon, SQLite intact |
| `SIA-103` | Tester sauvegarde et restauration | restauration dans un nouvel emplacement et état relisible |
| `SIA-104` | Tester Codex réel sous Bubblewrap | plan terminé, receipt valide, aucun changement non autorisé |
| `SIA-105` | Tester Mistral Vibe réel sous Bubblewrap | budget respecté, shell absent, receipt valide |

### Prochain lot logiciel

| ID | Priorité | Tâche | Dépendances |
|---|---|---|---|
| `SIA-301` | critique | Reviewer indépendant | `SIA-202`, `SIA-204` — satisfaites |
| `SIA-302` | critique | Pipeline builder → validation → review → receipt | `SIA-301` |
| `SIA-303` | haute | Budget de retries et détection de boucle | `SIA-302` |
| `SIA-205` | haute | Restic et politique de rétention | `SIA-103` |

## Terminé dans v0.13

`SIA-204` apporte :

- champ de mission `allowedPaths` ;
- option répétable `--allow-path <glob>` ;
- refus d'un build sans périmètre déclaré ;
- snapshot Git avant et après l'agent ;
- comparaison des statuts et empreintes ;
- détection des fichiers hors périmètre ;
- `AGENT_CHANGES.patch` ;
- `CHANGE_GUARD.json` ;
- résultat ajouté à `AGENT_RESULT.json` ;
- run SQLite transformé en `failed` en cas de violation ;
- comportement fail-closed si le contrôleur lui-même échoue ;
- test de bout en bout avec faux build Codex.

Documentation : [`CHANGE_GUARD.md`](CHANGE_GUARD.md).

## Préparer un build

```bash
superia task create "Modifier le module d'authentification"

superia task update TASK-0001 \
  --priority high \
  --provider codex-cli \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --allow-path "package.json" \
  --accept "tests réussis"

superia worktree TASK-0001
superia agent run codex TASK-0001 --mode build
```

Une modification de `README.md`, par exemple, ferait échouer ce run puisqu'elle n'est pas autorisée.

## Contrôles quotidiens

```bash
superia task board
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
5. Un build autonome exige un worktree et au moins un chemin autorisé.
6. Toute modification hors périmètre fait échouer le run.
7. Toute dérogation de sécurité est explicite et journalisée.
8. Une validation simulée ne remplace pas un test matériel requis.
9. La PR reste en brouillon tant que `SIA-501` est bloquée.
10. Aucune tâche ne supprime l'approbation humaine avant fusion.

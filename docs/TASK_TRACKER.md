# Suivi opérationnel des tâches

Source de vérité machine-lisible : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json).

Dernière mise à jour : **15 août 2026**  
Version suivie : **0.13.0**

## État global

| État | Nombre |
|---|---:|
| Terminé | 10 |
| En cours | 1 |
| Planifié | 10 |
| Bloqué | 2 |
| Différé | 0 |
| **Total** | **23** |

## Priorité immédiate

### Pipeline qualité

| ID | État | Tâche | Résultat |
|---|---|---|---|
| `SIA-301` | terminé | Reviewer indépendant | fournisseur différent, lecture seule, findings structurés et verdict bloquant |
| `SIA-302` | terminé | Pipeline builder → validation → review → receipt | étapes déterministes, checkpoints et reprise testée |
| `SIA-303` | planifié | Budget de retries et détection de boucle | plafond d'essais, empreinte de tentative et cause d'arrêt |

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

## Terminé dans v0.13

### Contrôle des changements — `SIA-204`

- champ de mission `allowedPaths` ;
- option répétable `--allow-path <glob>` ;
- refus d'un build sans périmètre déclaré ;
- snapshot Git avant et après l'agent ;
- détection des fichiers hors périmètre ;
- `AGENT_CHANGES.patch` et `CHANGE_GUARD.json` ;
- run marqué `failed` en cas de violation.

### Reviewer indépendant — `SIA-301`

- builder et reviewer obligatoirement différents ;
- review strictement en lecture seule ;
- JSON structuré obligatoire ;
- findings avec sévérité, preuve et recommandation ;
- sortie invalide transformée en verdict `blocked` ;
- `approve` incompatible avec un finding moyen ou supérieur ;
- rapport durable `REVIEW.json`.

### Pipeline et reprise — `SIA-302`

- ordre builder → garde Git → validations → reviewer → receipt ;
- arrêt avant reviewer si une étape précédente échoue ;
- receipt enrichi avec garde, diff et review ;
- état atomique `.superia/pipelines/TASK-XXXX.json` ;
- commande `superia pipeline status` ;
- reprise avec `--resume` ;
- reprise testée après builder et après review ;
- aucune étape terminée relancée silencieusement ;
- aucune fusion automatique.

## Préparer et lancer un pipeline

```bash
superia task create "Modifier le module d'authentification"

superia task update TASK-0001 \
  --priority high \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --allow-path "package.json" \
  --accept "tests réussis" \
  --accept "review indépendante approuvée"

superia worktree TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe
```

Suivre ou reprendre :

```bash
superia pipeline status TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

Le sens inverse est également pris en charge :

```bash
superia pipeline run TASK-0001 \
  --builder vibe \
  --reviewer codex \
  --max-price 0.25
```

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
5. Un build autonome exige un worktree et au moins un chemin autorisé.
6. Toute modification hors périmètre fait échouer le run.
7. Builder et reviewer utilisent deux fournisseurs différents.
8. Une review non structurée est bloquante.
9. Une reprise ne relance pas un builder sans checkpoint complet.
10. Toute dérogation de sécurité est explicite et journalisée.
11. Une validation simulée ne remplace pas un test matériel requis.
12. La PR reste en brouillon tant que `SIA-501` est bloquée.
13. Aucune tâche ne supprime l'approbation humaine avant fusion.

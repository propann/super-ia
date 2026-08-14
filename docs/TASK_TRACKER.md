# Suivi opérationnel des tâches

Source de vérité machine-lisible : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json).

Dernière mise à jour : **14 août 2026**  
Version suivie : **0.11.0**

## État global

| État | Nombre |
|---|---:|
| Terminé | 7 |
| En cours | 0 |
| Planifié | 14 |
| Bloqué | 2 |
| Différé | 0 |
| **Total** | **23** |

## Priorité immédiate

### Bloqué par une action sur le Raspberry Pi

| ID | Tâche | Sortie attendue |
|---|---|---|
| `SIA-101` | Installer v0.11 sur le Pi 5 cible | service actif, base valide, première sauvegarde vérifiée |
| `SIA-102` | Tester coupure brutale et reprise | run interrompu détecté, aucun doublon, SQLite intact |
| `SIA-103` | Tester sauvegarde et restauration | restauration dans un nouvel emplacement et état relisible |
| `SIA-104` | Tester Codex réel | plan terminé, receipt valide, aucune écriture en lecture seule |
| `SIA-105` | Tester Mistral Vibe réel | budget respecté, shell absent, receipt valide |

### Sécurité à intégrer ensuite

| ID | Priorité | Tâche | Dépendances |
|---|---|---|---|
| `SIA-203` | critique | Ajouter la sandbox Bubblewrap commune | `SIA-002` |
| `SIA-204` | haute | Contrôler les fichiers modifiés par un agent | `SIA-003` |
| `SIA-205` | haute | Ajouter Restic et la politique de rétention | `SIA-103` |

### Pipeline multi-agent

| ID | Priorité | Tâche | Dépendances |
|---|---|---|---|
| `SIA-301` | critique | Reviewer indépendant | `SIA-202`, `SIA-204` |
| `SIA-302` | critique | Pipeline builder → validation → review → receipt | `SIA-301` |
| `SIA-303` | haute | Budget de retries et détection de boucle | `SIA-302` |

## Terminé dans v0.10

- `SIA-005` : suivi enrichi des missions ;
- `SIA-201` : intégration Gitleaks avec rapport JSON expurgé ;
- commandes `superia task board`, `task update`, `task note` ;
- statut `blocked` ;
- priorité, responsable, échéance, tags, dépendances et critères d'acceptation ;
- commande `superia security scan` et mode `--required`.

## Terminé dans v0.11

- `SIA-202` : Gitleaks obligatoire avant tout run réel Codex ou Vibe ;
- absence de Gitleaks = agent refusé ;
- finding Gitleaks = agent refusé avant lancement ;
- rapport et run Gitleaks liés au préflight ;
- état du préflight inclus dans les métadonnées et `AGENT_RESULT.json` ;
- dérogation possible uniquement avec `--allow-without-gitleaks` ;
- événement durable `security.preflight.waived` ;
- tests prouvant qu'un Codex bloqué n'est jamais démarré.

## Utilisation quotidienne

Créer et piloter une mission :

```bash
superia task create "Ajouter la sandbox Bubblewrap"

superia task update TASK-0001 \
  --status planned \
  --priority critical \
  --owner max \
  --provider codex-cli \
  --due 2026-08-20 \
  --tag security \
  --tag pi \
  --accept "écriture limitée au worktree" \
  --accept "réseau désactivé par défaut"
```

Ajouter une dépendance ou un blocage :

```bash
superia task update TASK-0002 --depends TASK-0001
superia task update TASK-0002 --status blocked
superia task note TASK-0002 "Accès au Pi nécessaire pour continuer."
```

Voir le tableau :

```bash
superia task board
superia task board --json
```

Lancer un agent avec le préflight normal :

```bash
superia agent run codex TASK-0001 --mode plan
superia agent run vibe TASK-0001 --mode plan --max-price 0.25
```

Dérogation exceptionnelle et journalisée :

```bash
superia agent run codex TASK-0001 \
  --mode plan \
  --allow-without-gitleaks
```

## Règles de suivi

1. Une tâche ne passe à `done` qu'avec une preuve citée.
2. Une tâche `blocked` doit posséder une cause ou une note expliquant le blocage.
3. Une tâche critique doit avoir des critères d'acceptation explicites.
4. Une dépendance doit exister et ne peut pas pointer vers elle-même.
5. La PR reste en brouillon tant que `SIA-501` est bloquée.
6. Toute dérogation de sécurité est explicite et journalisée.
7. Aucune tâche ne supprime l'approbation humaine avant fusion.

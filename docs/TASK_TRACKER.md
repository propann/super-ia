# Suivi opérationnel des tâches

Source de vérité machine-lisible : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json).

Dernière mise à jour : **14 août 2026**  
Version suivie : **0.10.0**

## État global

| État | Nombre |
|---|---:|
| Terminé | 7 |
| En cours | 0 |
| Planifié | 12 |
| Bloqué | 3 |
| Différé | 0 |

## Priorité immédiate

### Bloqué par une action sur le Raspberry Pi

| ID | Tâche | Sortie attendue |
|---|---|---|
| `SIA-101` | Installer v0.10 sur le Pi 5 cible | service actif, base valide, première sauvegarde vérifiée |
| `SIA-102` | Tester coupure brutale et reprise | run interrompu détecté, aucun doublon, SQLite intact |
| `SIA-103` | Tester sauvegarde et restauration | restauration dans un nouvel emplacement et état relisible |
| `SIA-104` | Tester Codex réel | plan terminé, receipt valide, aucune écriture en lecture seule |
| `SIA-105` | Tester Mistral Vibe réel | budget respecté, shell absent, receipt valide |

### Sécurité à intégrer ensuite

| ID | Priorité | Tâche | Dépendances |
|---|---|---|---|
| `SIA-202` | critique | Rendre Gitleaks obligatoire avant envoi distant | `SIA-201` |
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
- commande `superia task board` ;
- commande `superia task update` ;
- commande `superia task note` ;
- statut `blocked` ;
- priorité, responsable, échéance, tags, dépendances et critères d'acceptation ;
- commande `superia security scan` ;
- mode `--required` pour rendre Gitleaks bloquant ;
- tests d'un scan propre et d'un scan contenant un finding.

## Utilisation quotidienne

Créer une mission :

```bash
superia task create "Ajouter la sandbox Bubblewrap"
```

Définir son pilotage :

```bash
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

Ajouter une dépendance :

```bash
superia task update TASK-0002 --depends TASK-0001
```

Marquer un blocage :

```bash
superia task update TASK-0002 --status blocked
superia task note TASK-0002 "Accès au Pi nécessaire pour continuer."
```

Voir le tableau :

```bash
superia task board
superia task board --json
```

Scanner les secrets :

```bash
superia security scan
superia security scan --required
```

## Règles de suivi

1. Une tâche ne passe à `done` qu'avec une preuve citée.
2. Une tâche `blocked` doit posséder une note expliquant le blocage.
3. Une tâche critique doit avoir des critères d'acceptation explicites.
4. Une dépendance doit exister et ne peut pas pointer vers elle-même.
5. La PR reste en brouillon tant que `SIA-501` est bloquée.
6. Aucune tâche ne supprime l'approbation humaine avant fusion.

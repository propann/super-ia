# Suivi opérationnel des tâches

Source de vérité machine-lisible : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json).

Dernière mise à jour : **14 août 2026**  
Version suivie : **0.12.0**

## État global

| État | Nombre |
|---|---:|
| Terminé | 7 |
| En cours | 1 |
| Planifié | 13 |
| Bloqué | 2 |
| Différé | 0 |
| **Total** | **23** |

## Priorité immédiate

### Sécurité en cours

| ID | État | Tâche | Reste à prouver |
|---|---|---|---|
| `SIA-203` | en cours | Sandbox Bubblewrap commune | exécuter l'autotest noyau et Codex/Vibe réels sur le Pi 5 |
| `SIA-204` | planifié | Contrôler les fichiers modifiés par un agent | diff archivé et hors-périmètre bloqué |

### Bloqué par une action sur le Raspberry Pi

| ID | Tâche | Sortie attendue |
|---|---|---|
| `SIA-101` | Installer v0.12 sur le Pi 5 cible | service actif, sauvegarde vérifiée, `sandbox-status.json` produit |
| `SIA-102` | Tester coupure brutale et reprise | run interrompu détecté, aucun doublon, SQLite intact |
| `SIA-103` | Tester sauvegarde et restauration | restauration dans un nouvel emplacement et état relisible |
| `SIA-104` | Tester Codex réel sous Bubblewrap | plan terminé, receipt valide, aucune écriture hors sortie autorisée |
| `SIA-105` | Tester Mistral Vibe réel sous Bubblewrap | budget respecté, shell absent, receipt valide |

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
- absence de Gitleaks ou finding = agent refusé avant lancement ;
- rapport et run Gitleaks liés au préflight ;
- dérogation possible uniquement avec `--allow-without-gitleaks` ;
- événement durable `security.preflight.waived`.

## Livré dans v0.12 — validation matérielle restante

- constructeur d'invocation Bubblewrap commun ;
- HOME jetable supprimé après le run ;
- système et exécutables montés en lecture seule ;
- dépôt en lecture seule pour plan/review ;
- worktree en lecture-écriture pour build ;
- fichier de réponse Codex monté individuellement en écriture ;
- état fournisseur persistant limité à `~/.superia/providers/` ;
- namespaces utilisateur, PID, IPC, UTS et cgroup demandés ;
- capacités supprimées et nouvelle session ;
- réseau isolable avec `--unshare-net` ;
- Bubblewrap obligatoire pour un run réel ;
- dérogation `--allow-without-bwrap` journalisée ;
- commande `superia security sandbox-check` ;
- rapport Pi `~/.superia/sandbox-status.json` ;
- tests de politique Codex, Vibe et sandbox.

`SIA-203` reste en cours jusqu'à réussite de l'autotest réel sur le Pi et d'un run fournisseur réel.

## Utilisation quotidienne

Voir le tableau :

```bash
superia task board
superia task board --json
```

Vérifier la sécurité locale :

```bash
superia security scan --required
superia security sandbox-check
```

Lancer un agent avec les deux préflights obligatoires :

```bash
superia agent run codex TASK-0001 --mode plan
superia agent run vibe TASK-0001 --mode plan --max-price 0.25
```

Dérogations exceptionnelles et journalisées :

```bash
superia agent run codex TASK-0001 \
  --mode plan \
  --allow-without-gitleaks \
  --allow-without-bwrap
```

Une dérogation ne constitue jamais une preuve de validation.

## Règles de suivi

1. Une tâche ne passe à `done` qu'avec une preuve citée.
2. Une tâche `blocked` doit posséder une cause ou une note expliquant le blocage.
3. Une tâche critique doit avoir des critères d'acceptation explicites.
4. Une dépendance doit exister et ne peut pas pointer vers elle-même.
5. La PR reste en brouillon tant que `SIA-501` est bloquée.
6. Toute dérogation de sécurité est explicite et journalisée.
7. Une validation simulée ne remplace pas un test matériel requis.
8. Aucune tâche ne supprime l'approbation humaine avant fusion.

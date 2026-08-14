# Suivi opérationnel des tâches

Sources de vérité :

- projet logiciel : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json) ;
- préparation de la machine : [`MACHINE_TRACKER.json`](MACHINE_TRACKER.json).

Dernière mise à jour : **15 août 2026**  
Version suivie : **0.14.0**

## Projet logiciel

| État | Nombre |
|---|---:|
| Terminé | 12 |
| En cours | 1 |
| Planifié | 9 |
| Bloqué | 2 |
| **Total** | **24** |

## Préparation machine

| État | Nombre |
|---|---:|
| Terminé | 9 |
| Planifié | 3 |
| Bloqué | 3 |
| **Total** | **15** |

Les tâches bloquées demandent le Pi réel ou une authentification interactive. Elles ne sont pas déclarées terminées par les tests simulés.

## Pipeline qualité — milestone terminé

| ID | État | Tâche | Résultat |
|---|---|---|---|
| `SIA-301` | terminé | Reviewer indépendant | fournisseur différent, lecture seule et verdict structuré |
| `SIA-302` | terminé | Pipeline complet | builder → validation → review → receipt, checkpoints et reprise |
| `SIA-303` | terminé | Retries et boucles | essais/prix bornés, feedback injecté et patch identique bloqué |
| `SIA-206` | terminé | Garde Git renforcé | chemins critiques, 50 fichiers et 1 Mo maximum |

## Machine préparée dans Git

| ID | État | Tâche |
|---|---|---|
| `MCH-001` | terminé | Profils Core, Standard et Full |
| `MCH-002` | terminé | Dépendances système explicites |
| `MCH-003` | terminé | CLI installables sans root |
| `MCH-004` | terminé | Vérification SHA-256 de Node et Gitleaks |
| `MCH-005` | terminé | Rapport privé de toolchain |
| `MCH-006` | terminé | Matrice universelle de connexions |
| `MCH-007` | terminé | Registre privé sans valeur de secret |
| `MCH-008` | terminé | Connection Matrix |
| `MCH-009` | terminé | Détection des coffres de secrets |

## Bloqué par le Pi ou les comptes

| ID | État | Tâche | Preuve attendue |
|---|---|---|---|
| `MCH-010` | bloqué | Installer le profil Standard | `toolchain-status.json` et diagnostic |
| `MCH-011` | bloqué | Valider Bubblewrap | `sandbox-status.json` |
| `MCH-012` | bloqué | Authentifier les CLI | plan réel et receipt sans secret |
| `SIA-102` | planifié | Coupure et reprise | journal et aucun doublon |
| `SIA-103` | planifié | Sauvegarde et restauration | hashes avant/après |
| `SIA-104` | planifié | Codex réel | receipt validé |
| `SIA-105` | planifié | Vibe réel | budget et receipt validés |

## À tester après remise en ligne

1. installation Standard ;
2. choix du coffre Age ou systemd credentials ;
3. Bubblewrap noyau ;
4. authentification Codex, Vibe et autres CLI retenues ;
5. API et identités cloud avec budgets bornés ;
6. MCP, ACP, A2A et worker SSH ;
7. pipeline réel ;
8. benchmark coût/qualité ;
9. Restic hors machine ;
10. DAG et interface locale.

## Commandes

```bash
bash install/tools/prepare-machine.sh --phase plan --profile standard
bash install/tools/prepare-machine.sh --phase verify --profile standard

superia connection init
superia connection dashboard
superia connection doctor
superia connection secret-backends

superia task board
superia pipeline status TASK-0001
```

## Barrières de publication

La PR reste en brouillon tant que :

- le Pi réel n'est pas installé ;
- Bubblewrap n'est pas validé sur son noyau ;
- la restauration n'est pas prouvée ;
- Codex et Vibe réels n'ont pas produit de receipts ;
- une revue humaine n'autorise pas la fusion.

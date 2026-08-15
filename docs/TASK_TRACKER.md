# Suivi opérationnel des tâches

Sources de vérité :

- projet logiciel : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json) ;
- préparation de la machine : [`MACHINE_TRACKER.json`](MACHINE_TRACKER.json).

Dernière mise à jour : **15 août 2026**  
Version suivie : **0.18.0**

## Projet logiciel

| État | Nombre |
|---|---:|
| Terminé | 20 |
| En cours | 2 |
| Planifié | 5 |
| Bloqué | 2 |
| **Total** | **29** |

## Préparation machine

| État | Nombre |
|---|---:|
| Terminé | 9 |
| Planifié | 3 |
| Bloqué | 3 |
| **Total** | **15** |

Les tâches bloquées demandent le Pi réel ou une authentification interactive. Elles ne sont pas déclarées terminées par les tests simulés.

## Dernier lot terminé — sécurité et exploitation

| ID | État | Tâche | Résultat |
|---|---|---|---|
| `SIA-403` | terminé | Interface web locale | lecture seule, loopback, token privé, état safety visible |
| `SIA-404` | terminé | Notifications locales | reçus expurgés, dédupliqués, intégrés au daemon |
| `SIA-405` | terminé | Readiness hors ligne | distinction contrôle local / agents réels |
| `SIA-406` | terminé | Arrêt d'urgence global | blocage des runs, SIGTERM/SIGKILL contrôlé, audit et sauvegarde |

## Sécurité d’exécution encore en cours

| ID | État | Tâche | Reste à prouver |
|---|---|---|---|
| `SIA-203` | en cours | Sandbox Bubblewrap | fonctionnement réel sur le noyau du Pi 5 |
| `SIA-205` | en cours | Restic | dépôt réel, sauvegarde et restauration sur copie |

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
| `SIA-101` | bloqué | Installer la v0.18 sur le Pi | service, web, notifications, safety et sauvegarde |
| `MCH-010` | bloqué | Installer le profil Standard | `toolchain-status.json` et diagnostic |
| `MCH-011` | bloqué | Valider Bubblewrap | `sandbox-status.json` |
| `MCH-012` | bloqué | Authentifier les CLI | plan réel et receipt sans secret |
| `SIA-102` | planifié | Coupure et reprise | journal et aucun doublon |
| `SIA-103` | planifié | Sauvegarde et restauration | hashes et état safety restauré |
| `SIA-104` | planifié | Codex réel | receipt validé |
| `SIA-105` | planifié | Vibe réel | budget et receipt validés |

## Ordre de travail restant

1. installer le profil Standard sur le Pi ;
2. vérifier `SUPERIA_HOME`, systemd et le linger ;
3. tester Bubblewrap sur le noyau réel ;
4. tester l’arrêt d’urgence avec un run géré ;
5. vérifier web et notifications après déconnexion ;
6. choisir le coffre de secrets ;
7. restaurer une sauvegarde sur copie ;
8. authentifier Codex et Vibe ;
9. exécuter un pipeline réel borné ;
10. tester MCP, ACP, A2A et SSH ;
11. mesurer coût, qualité et latence ;
12. construire le routeur mesuré.

## Commandes de contrôle

```bash
superia safety status
superia readiness
superia notify status
superia control status --json
superia backup create
superia backup list
superia matrix --once
superia web
```

## Barrières de publication

La PR est prête pour revue du code mais la fusion reste bloquée tant que :

- le Pi réel n'est pas installé ;
- Bubblewrap n'est pas validé sur son noyau ;
- la restauration n'est pas prouvée ;
- Codex et Vibe réels n'ont pas produit de receipts ;
- le service et l’arrêt d’urgence ne sont pas validés sur la machine cible ;
- une revue humaine n'autorise pas la fusion.

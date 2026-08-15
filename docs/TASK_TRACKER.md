# Suivi opérationnel des tâches

Sources de vérité :

- projet logiciel : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json) ;
- préparation de la machine : [`MACHINE_TRACKER.json`](MACHINE_TRACKER.json).

Dernière mise à jour : **15 août 2026**  
Version suivie : **0.19.0**

## Projet logiciel

| État | Nombre |
|---|---:|
| Terminé | 20 |
| En cours | 4 |
| Planifié | 3 |
| Bloqué | 2 |
| **Total** | **29** |

## Préparation machine

| État | Nombre |
|---|---:|
| Terminé | 9 |
| Planifié | 3 |
| Bloqué | 3 |
| **Total** | **15** |

Les tâches bloquées demandent le Pi réel ou une authentification interactive. Elles ne sont pas déclarées terminées par les tests de CI.

## Lot v0.19 livré dans le code

| Tâche | État | Résultat logiciel | Reste à prouver |
|---|---|---|---|
| `SIA-103` | en cours | restauration atomique, reçu privé, intégrité SQLite/JSONL, drill isolé | stockage réel du Pi et restauration Restic |
| `SIA-401` | en cours | routeur explicable par capacités, disponibilité, coût et préférences | benchmarks réels coût/qualité/latence |
| `SIA-101` | bloqué | préflight SD/HDD/SSD/NVMe/SSH en lecture seule | exécution ARM64 après boot HDD et SSH |

## Sécurité et exploitation terminées

| ID | État | Tâche | Résultat |
|---|---|---|---|
| `SIA-403` | terminé | Interface web locale | lecture seule, loopback, token privé, état safety visible |
| `SIA-404` | terminé | Notifications locales | reçus expurgés, dédupliqués, intégrés au daemon |
| `SIA-405` | terminé | Readiness hors ligne | distinction contrôle local / agents réels |
| `SIA-406` | terminé | Arrêt d'urgence global | blocage des runs, SIGTERM/SIGKILL contrôlé, audit et sauvegarde |

## Travaux en cours

| ID | Tâche | État logiciel | Blocage restant |
|---|---|---|---|
| `SIA-103` | Sauvegarde et restauration | code et CI validés | restauration sur Pi et depuis Restic |
| `SIA-203` | Sandbox Bubblewrap | politique et CI validées | fonctionnement sur le noyau du Pi 5 |
| `SIA-205` | Restic | plans et contrôles validés | dépôt réel, sauvegarde et restauration |
| `SIA-401` | Routeur fournisseurs | sélection statique explicable validée | mesures réelles et fallback testé |

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

Le préflight `install/pi/preflight.sh` complète cette préparation sans modifier le tracker matériel tant qu’il n’a pas été exécuté sur la machine cible.

## Bloqué par le Pi ou les comptes

| ID | État | Tâche | Preuve attendue |
|---|---|---|---|
| `SIA-101` | bloqué | Installer la v0.19 sur le Pi | boot HDD/SSD, préflight, service, web, notifications, safety et drill |
| `MCH-010` | bloqué | Installer le profil Standard | `toolchain-status.json` et diagnostic |
| `MCH-011` | bloqué | Valider Bubblewrap | `sandbox-status.json` |
| `MCH-012` | bloqué | Authentifier les CLI | plan réel et receipt sans secret |
| `SIA-102` | planifié | Coupure et reprise | journal et aucun doublon |
| `SIA-104` | planifié | Codex réel | receipt validé |
| `SIA-105` | planifié | Vibe réel | budget et receipt validés |

## Ordre de travail matériel

1. démarrer sur la SD ;
2. installer ou migrer vers le HDD/SSD ;
3. confirmer avec `findmnt /` que la racine n’est plus sur la SD ;
4. activer et tester SSH ;
5. cloner le dépôt ;
6. exécuter `sh install/pi/preflight.sh --strict` ;
7. installer le profil Standard ;
8. vérifier `SUPERIA_HOME`, systemd et le linger ;
9. tester Bubblewrap ;
10. exécuter `superia backup drill` ;
11. tester l’arrêt d’urgence avec un run géré ;
12. vérifier web et notifications après déconnexion ;
13. choisir le coffre de secrets ;
14. authentifier Codex et Vibe ;
15. exécuter un pipeline réel borné ;
16. mesurer coût, qualité et latence ;
17. enrichir le routeur avec les mesures.

## Commandes de contrôle

```bash
sh install/pi/preflight.sh
superia safety status
superia readiness
superia route --mode plan --budget zero
superia notify status
superia control status --json
superia backup create
superia backup drill
superia matrix --once
superia web
```

## Barrières de publication

La PR est prête pour revue du code mais la fusion reste bloquée tant que :

- le Pi réel ne boote pas sur le stockage cible ;
- la v0.19 et le profil Standard ne sont pas installés sur ARM64 ;
- Bubblewrap n'est pas validé sur son noyau ;
- la restauration locale et Restic ne sont pas prouvées sur la machine ;
- Codex et Vibe réels n'ont pas produit de receipts ;
- le service et l’arrêt d’urgence ne sont pas validés sur la machine cible ;
- une revue humaine n'autorise pas la fusion.

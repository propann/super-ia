# État vérifié du projet

Date du contrôle : **14 août 2026**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat v0.13.0

| Élément | Résultat |
|---|---|
| Version | `0.13.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **32 réussis, 0 échec** |
| Audit npm du job | 0 vulnérabilité signalée |
| Système CI | Ubuntu 24.04 |
| Node / npm | 22.23.2 / 10.9.8 |
| Scripts Pi | syntaxe valide |
| Commande `sudo` dans `install/pi` | aucune |

## Socle livré

- SQLite WAL et migrations ;
- registre multi-projets ;
- missions, runs, heartbeats, événements et reprise ;
- leases exclusifs ;
- scanner Git, branches et worktrees ;
- contexte ciblé et manifestes SHA-256 ;
- runner sans shell implicite avec logs, timeout et arrêt des descendants ;
- Codex et Mistral Vibe ;
- Gitleaks obligatoire avant les agents réels ;
- Bubblewrap obligatoire sous Linux avant les agents réels ;
- receipts vérifiables ;
- sauvegardes cohérentes ;
- daemon, service Pi utilisateur et console Matrix ;
- roadmap et suivi de tâches contrôlés par la CI.

## Nouveau dans v0.13 — contrôle des modifications

Chaque mission peut déclarer son périmètre d'écriture :

```bash
superia task update TASK-0001 \
  --allow-path "src/**" \
  --allow-path "tests/**"
```

Un build sans chemin autorisé est refusé avant lancement.

Pour chaque run Codex ou Vibe, Super IA :

1. capture l'état Git avant l'agent ;
2. exécute l'agent dans son worktree ;
3. capture l'état Git après ;
4. compare statuts et empreintes ;
5. contrôle chaque fichier par rapport aux motifs autorisés ;
6. archive le diff ;
7. fait échouer le run si un fichier sort du périmètre.

Artefacts produits :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Une violation transforme le statut SQLite du run en `failed`, même si l'agent a renvoyé le code 0. Une erreur du change guard est également bloquante.

Le test de bout en bout fait modifier à un faux Codex `src/app.ts` autorisé et `README.md` interdit. Il vérifie le rapport, le patch, `AGENT_RESULT.json` et le statut durable du run.

Voir [`CHANGE_GUARD.md`](CHANGE_GUARD.md).

## Sécurité Bubblewrap

La politique validée en CI comprend :

- HOME jetable `/home/superia` ;
- système et exécutables en lecture seule ;
- plan/review en lecture seule ;
- build limité au worktree ;
- sortie Codex montée individuellement ;
- état fournisseur limité à `~/.superia/providers/` ;
- capacités supprimées ;
- namespaces utilisateur, PID, IPC, UTS et cgroup ;
- réseau isolable ;
- dérogation explicite et journalisée.

La frontière noyau réelle reste à confirmer sur le Pi :

```bash
superia security sandbox-check --json
```

L'installateur conservera le résultat dans `~/.superia/sandbox-status.json`.

## Couverture des 32 tests

La suite couvre notamment :

- sauvegarde et détection de corruption ;
- SQLite WAL, projets, tâches, runs et événements ;
- reprise des runs et leases ;
- contexte ciblé et exclusion de secrets ;
- Gitleaks propre, finding bloquant et dérogation ;
- politique Bubblewrap, HOME jetable et refus sans `bwrap` ;
- Codex et Vibe simulés avec les deux préflights ;
- runner, logs, timeout et arrêt du groupe ;
- receipts et falsification ;
- roadmap et suivi des tâches ;
- change guard unitaire ;
- build Codex hors périmètre de bout en bout ;
- refus d'un build sans `--allow-path` ;
- scripts d'installation Pi et absence de `sudo`.

## État de la roadmap

| État | Nombre |
|---|---:|
| Terminé | 8 |
| En cours | 1 |
| Planifié | 12 |
| Bloqué | 2 |
| Total | 23 |

`SIA-204` est terminé. `SIA-203` reste en cours jusqu'à la validation Bubblewrap réelle sur le Pi.

## Encore à prouver sur le Pi

- installation complète de v0.13 ;
- espaces de noms Bubblewrap réellement fonctionnels ;
- compatibilité Bubblewrap + sandbox native Codex ;
- Codex et Vibe authentifiés ;
- reprise après coupure ;
- restauration d'une sauvegarde ;
- service disponible après déconnexion.

## Limites actuelles

- réseau Codex/Vibe autorisé pour joindre leurs services ;
- filtrage réseau par domaine non livré ;
- reviewer indépendant non livré ;
- pipeline builder → validation → review → receipt non livré ;
- DAG, routeur coût/qualité et interface web non livrés ;
- Restic et restauration automatisée non livrés ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22 ;
- aucune fusion automatique.

## Suite prioritaire

1. `SIA-203` — exécuter l'autotest Bubblewrap réel sur le Pi ;
2. `SIA-101` — installer v0.13 sur le Pi 5 ;
3. `SIA-301` — reviewer indépendant ;
4. `SIA-302` — pipeline complet ;
5. `SIA-102` / `SIA-103` — reprise et restauration ;
6. `SIA-104` / `SIA-105` — Codex et Vibe réels ;
7. `SIA-205` — Restic ;
8. `SIA-401` — routeur coût/qualité mesuré.

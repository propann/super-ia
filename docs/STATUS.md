# État vérifié du projet

Date du contrôle : **14 août 2026**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat v0.12.0

| Élément | Résultat |
|---|---|
| Version | `0.12.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **28 réussis, 0 échec** |
| Audit npm du job | 0 vulnérabilité signalée |
| Système CI | Ubuntu 24.04 |
| Node / npm | 22.23.2 / 10.9.8 |
| Scripts Pi | syntaxe valide |
| Commande `sudo` dans `install/pi` | aucune |

## Livré et vérifié

### Plan de contrôle et Git

- SQLite WAL et migrations ;
- registre multi-projets ;
- runs, heartbeats, événements et récupération ;
- journal JSONL append-only ;
- leases exclusifs ;
- scanner Git, missions, branches et worktrees ;
- console Matrix multi-projets.

### Suivi des tâches

- statuts, priorités, responsable, fournisseur et échéance ;
- tags, dépendances et critères d'acceptation ;
- notes horodatées ;
- tableau `superia task board` ;
- registre `SIA-XXX` contrôlé par la CI.

### Contexte, runner et preuves

- contexte Git ciblé ;
- manifestes et empreintes SHA-256 ;
- première barrière interne anti-secrets ;
- runner sans shell implicite ;
- environnement réduit ;
- logs persistants ;
- heartbeat, timeout et arrêt du groupe de processus ;
- validations du dépôt ;
- receipts vérifiables et détection de falsification ;
- approbation humaine obligatoire.

### Préflight Gitleaks obligatoire

Avant tout run réel Codex ou Vibe :

1. Gitleaks doit être disponible ;
2. son scan doit réussir sans finding ;
3. le rapport et le run de sécurité sont enregistrés ;
4. l'état est inclus dans les métadonnées et `AGENT_RESULT.json`.

La dérogation `--allow-without-gitleaks` produit l'état `waived` et l'événement durable `security.preflight.waived`.

### Sandbox Bubblewrap commune

La v0.12 ajoute :

- préflight Bubblewrap obligatoire pour Codex et Vibe réels sous Linux ;
- refus avant lancement si `bwrap` est absent ;
- dérogation explicite `--allow-without-bwrap` ;
- événement durable `sandbox.preflight.waived` ;
- HOME jetable `/home/superia` ;
- système et exécutables montés en lecture seule ;
- dépôt/worktree en lecture seule pour plan et review ;
- worktree en lecture-écriture pour build ;
- fichier de réponse Codex monté individuellement en écriture ;
- état fournisseur limité à `~/.superia/providers/<provider>/` ;
- namespaces utilisateur, PID, IPC, UTS et cgroup demandés ;
- capacités supprimées ;
- réseau isolable avec `--unshare-net` ;
- configuration effective inscrite dans les métadonnées du run.

La CI valide la construction de la politique et son passage aux agents avec de faux exécutables. Elle ne prouve pas encore la frontière noyau réelle de Bubblewrap sur le Pi.

### Autotest matériel

```bash
superia security sandbox-check
superia security sandbox-check --json
```

L'autotest vérifie le démarrage de Bubblewrap, le HOME jetable, l'invisibilité d'un fichier extérieur, les droits du workspace, l'état autorisé et la demande d'un namespace réseau isolé.

L'installateur Pi conserve le résultat dans :

```text
~/.superia/sandbox-status.json
```

### Sauvegarde et Raspberry Pi

- sauvegarde SQLite cohérente avec `VACUUM INTO` ;
- manifeste SHA-256 ;
- détection de corruption ;
- daemon de synchronisation/récupération ;
- service systemd utilisateur durci ;
- installateur sans privilèges ;
- détection de Gitleaks et Bubblewrap ;
- autotest Bubblewrap lancé lorsqu'il est présent ;
- aucune installation de modèle local.

## Liste des 28 tests

1. sauvegarde cohérente et vérifiable ;
2. unicité des fournisseurs ;
3. API distantes désactivées ;
4. transports déclarés ;
5. Codex avec Gitleaks et politique Bubblewrap ;
6. contexte ciblé et secret exclu ;
7. SQLite WAL et persistance multi-projets ;
8. récupération des runs et journal JSONL ;
9. flux Git mission/worktree ;
10. daemon synchronisation/récupération ;
11. Gitleaks propre et finding bloquant ;
12. lease exclusif ;
13. reprise d'un lease expiré ;
14. unicité des outils locaux ;
15. légèreté des outils requis ;
16. exécutables candidats déclarés ;
17. Matrix locale et globale ;
18. runner réussi avec logs ;
19. runner timeout et arrêt du groupe ;
20. receipt et détection de falsification ;
21. catalogue de recherche valide ;
22. surface de décision des projets étudiés ;
23. registre de roadmap valide ;
24. politique Bubblewrap et HOME jetable ;
25. refus sans Bubblewrap et dérogation journalisée ;
26. dérogation Gitleaks visible et journalisée ;
27. suivi des tâches et progression ;
28. Vibe avec Gitleaks et politique Bubblewrap.

## Distinction de preuve

### Prouvé par la CI

- génération des arguments Bubblewrap ;
- choix lecture seule/lecture-écriture ;
- montage d'une sortie individuelle ;
- HOME remplacé ;
- refus sans `bwrap` ;
- dérogations journalisées ;
- branchement Codex/Vibe ;
- compilation et non-régression du reste du système.

### Encore à prouver sur le Pi

- fonctionnement des espaces de noms utilisateur du noyau ;
- refus réel d'une écriture extérieure ;
- compatibilité Bubblewrap + sandbox native Codex ;
- authentification via les dossiers fournisseur limités ;
- stabilité d'un run réel Codex et Vibe ;
- comportement après redémarrage.

## Limites actuelles

- installation Pi réelle non testée ;
- comptes Codex/Vibe réels non testés ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22 ;
- réseau Codex/Vibe autorisé parce que les services sont distants ;
- pas encore de filtrage réseau par domaine ;
- pas de contrôle post-run des chemins modifiés ;
- pas de reviewer indépendant ni pipeline complet ;
- pas de DAG ou routeur automatique coût/qualité ;
- pas de Restic ni de restauration automatisée ;
- pas d'interface web locale ;
- aucune fusion automatique.

## Suite prioritaire

1. terminer `SIA-203` par l'autotest Bubblewrap réel sur le Pi ;
2. `SIA-204` — contrôler et archiver les fichiers modifiés ;
3. `SIA-101` — installer v0.12 sur le Pi 5 réel ;
4. `SIA-102` / `SIA-103` — reprise et restauration ;
5. `SIA-104` / `SIA-105` — Codex et Vibe réels sous Bubblewrap ;
6. `SIA-301` / `SIA-302` — reviewer indépendant et pipeline ;
7. `SIA-205` — Restic ;
8. `SIA-401` — routeur coût/qualité mesuré.

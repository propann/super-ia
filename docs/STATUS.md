# État vérifié du projet

Date du contrôle : **14 août 2026**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat v0.11.0

| Élément | Résultat |
|---|---|
| Version | `0.11.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **26 réussis, 0 échec** |
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

- statuts, dont `blocked` ;
- priorités ;
- responsable, fournisseur et échéance ;
- tags, dépendances et critères d'acceptation ;
- notes horodatées ;
- tableau `superia task board` ;
- validation des dépendances ;
- registre de roadmap `SIA-XXX` contrôlé par la CI.

### Contexte, runner et preuves

- contexte Git ciblé ;
- manifestes et empreintes SHA-256 ;
- première barrière interne anti-secrets ;
- runner sans shell implicite ;
- environnement réduit ;
- logs persistants ;
- heartbeat, timeout et arrêt du groupe de processus ;
- validations du dépôt ;
- receipts vérifiables ;
- détection de falsification ;
- approbation humaine obligatoire.

### Codex et Mistral Vibe

- modes plan/review en lecture seule ;
- build refusé sans worktree ;
- Codex conserve sa sandbox officielle ;
- Vibe n'obtient aucun shell ;
- prompt transmis par stdin ;
- sorties structurées archivées ;
- plafonds prix/tokens/tours pour Vibe ;
- options dangereuses refusées.

### Préflight Gitleaks obligatoire

Avant tout run réel Codex ou Vibe :

1. Super IA exécute Gitleaks en mode `dir` ;
2. l'absence de Gitleaks bloque l'agent ;
3. un finding ou un scan en échec bloque l'agent ;
4. le rapport et le run de sécurité sont enregistrés ;
5. l'état du préflight est inclus dans les métadonnées et `AGENT_RESULT.json`.

Une dérogation n'est possible qu'avec :

```bash
--allow-without-gitleaks
```

Elle produit l'état `waived` et l'événement durable `security.preflight.waived`. Le test Codex vérifie qu'après un finding l'exécutable de l'agent n'est jamais lancé.

### Sauvegarde et Raspberry Pi

- sauvegarde SQLite cohérente avec `VACUUM INTO` ;
- manifeste SHA-256 ;
- détection de corruption ;
- daemon de synchronisation/récupération ;
- service systemd utilisateur durci ;
- installateur sans `sudo` ;
- aucune installation de modèle local.

## Liste des 26 tests

1. sauvegarde cohérente et vérifiable ;
2. unicité des fournisseurs ;
3. API distantes désactivées ;
4. transports déclarés ;
5. Codex avec préflight propre et blocage avant lancement ;
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
24. dérogation Gitleaks visible et journalisée ;
25. suivi des tâches et progression ;
26. Vibe après préflight propre.

## Limites actuelles

- installation Pi réelle non testée ;
- comptes Codex/Vibe réels non testés ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22 ;
- préflight obligatoire pour Codex/Vibe, mais les futurs transports web/API devront réutiliser le même mécanisme ;
- sandbox Bubblewrap/Podman commune non intégrée ;
- pas de contrôle post-run des chemins modifiés ;
- pas de reviewer indépendant ni pipeline complet ;
- pas de DAG ou routeur automatique coût/qualité ;
- pas de Restic ni de restauration automatisée ;
- pas d'interface web locale ;
- aucune fusion automatique.

## Suite prioritaire

1. `SIA-203` — Bubblewrap, HOME temporaire et contrôle réseau ;
2. `SIA-204` — contrôle des fichiers modifiés ;
3. `SIA-101` — installation sur le Pi 5 réel ;
4. `SIA-102` / `SIA-103` — reprise et restauration ;
5. `SIA-104` / `SIA-105` — Codex et Vibe réels ;
6. `SIA-301` / `SIA-302` — reviewer indépendant et pipeline ;
7. `SIA-205` — Restic ;
8. `SIA-401` — routeur coût/qualité mesuré.

# État vérifié du projet

Date du contrôle : **14 août 2026**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

Ce document distingue ce qui est réellement livré, ce qui est validé sans fournisseur externe et ce qui reste à vérifier sur le Raspberry Pi réel.

## Résultat v0.10.0

| Élément | Résultat |
|---|---|
| Version | `0.10.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **25 réussis, 0 échec** |
| Audit npm du job | 0 vulnérabilité signalée |
| Système CI | Ubuntu 24.04 |
| Node / npm | 22.23.2 / 10.9.8 |
| Scripts Pi | syntaxe valide |
| Commande `sudo` dans `install/pi` | aucune |

La CI exécute :

```bash
npm install
npm test
bash -n install/pi/install.sh
bash -n install/pi/uninstall.sh
```

## Livré et vérifié

### Git, missions et suivi

- scanner Git, stack et checks ;
- missions `TASK-XXXX` lisibles par dépôt ;
- branches dédiées et worktrees ;
- mode `--dry-run` ;
- synchronisation avec le registre global ;
- statuts `planned`, `ready`, `running`, `blocked`, `review`, `done`, `failed`, `cancelled` ;
- priorités `low`, `normal`, `high`, `critical` ;
- responsable, fournisseur et échéance ;
- tags, dépendances et critères d'acceptation ;
- notes horodatées ;
- tableau `superia task board` avec progression ;
- validation des dépendances inconnues et auto-dépendances.

### Feuille de route contrôlée

- registre machine-lisible `docs/ROADMAP_TRACKER.json` ;
- identifiants stables `SIA-XXX` ;
- milestones, statuts, priorités, dépendances, critères de sortie et preuves ;
- vue humaine `docs/TASK_TRACKER.md` ;
- test CI de cohérence du registre ;
- PR maintenue en brouillon tant que la tâche de release `SIA-501` est bloquée.

### Plan de contrôle global

- `SUPERIA_HOME` ou `~/.superia` ;
- SQLite WAL ;
- migrations versionnées ;
- projets et missions ;
- runs, PID, heartbeats et statuts ;
- récupération des runs abandonnés ;
- événements SQLite ;
- miroir JSONL append-only ;
- leases exclusifs avec expiration ;
- console Matrix multi-projets.

### Contexte sécurisé

- sélection depuis les fichiers suivis par Git ;
- instructions et manifests prioritaires ;
- fichiers modifiés, cités et trouvés par mots-clés ;
- budget maximal en octets ;
- SHA-256 de chaque fichier et empreinte globale ;
- `MISSION.md`, `CONTEXT.md` et `MANIFEST.json` ;
- exclusion des chemins sensibles et binaires ;
- blocage de formats de secrets à haute confiance.

### Gitleaks externe

- outil détecté par `superia doctor` ;
- commande `superia security scan` ;
- modes `dir` et `git` ;
- rapport JSON avec secrets expurgés ;
- exécution dans le runner durable ;
- mode optionnel lorsque Gitleaks est absent ;
- mode bloquant `--required` ;
- finding ou code de sortie non nul marque le scan en échec ;
- tests avec faux scanner propre et faux scanner contenant un finding.

Gitleaks n'est pas encore automatiquement imposé avant chaque agent distant. Cette intégration est suivie par `SIA-202`.

### Runner

- aucun shell implicite ;
- dossier de travail limité au projet ou à son worktree ;
- environnement réduit ;
- stdin contrôlé ;
- logs stdout/stderr persistants ;
- limite de sortie ;
- heartbeat ;
- timeout ;
- `SIGTERM`, puis `SIGKILL` sur le groupe de processus ;
- validations du dépôt via `superia validate`.

### Adaptateur Codex

- mode plan/review en lecture seule ;
- mode build refusé sans worktree ;
- sandbox officielle `read-only` ou `workspace-write` ;
- prompt via stdin ;
- sortie JSONL ;
- dernière réponse enregistrée ;
- options dangereuses explicitement refusées ;
- lease exclusif par mission.

### Adaptateur Mistral Vibe

- mode programmatique forcé ;
- prompt via stdin, absent de la liste des processus ;
- plan/review avec profil `plan` ;
- build avec `accept-edits` ;
- `auto-approve` interdit ;
- shell explicitement désactivé ;
- outils de fichiers limités ;
- plafonds de prix, tokens et tours ;
- sortie streaming JSON archivée ;
- lease exclusif par mission.

### Nature des tests d'agents

Les tests Codex et Vibe utilisent de faux exécutables locaux. Ils valident la plomberie, la sécurité, les budgets, le parsing, les logs et les états SQLite. Ils ne prouvent pas encore l'authentification réelle, la disponibilité d'un compte, la qualité d'un modèle ni le coût observé.

### Sauvegarde, daemon et Raspberry Pi

- image SQLite cohérente avec `VACUUM INTO` ;
- copie du journal JSONL ;
- manifeste avec tailles et SHA-256 ;
- vérification et détection de corruption ;
- daemon one-shot ou permanent ;
- resynchronisation des projets ;
- récupération des runs ;
- état `daemon-status.json` ;
- installateur utilisateur ;
- désinstallateur conservant les données ;
- wrapper `~/.local/bin/superia` ;
- service systemd utilisateur durci ;
- aucune commande `sudo` ;
- aucun modèle IA local.

La CI vérifie le paquet, mais l'installation matérielle complète n'a pas encore été exécutée sur le Pi 5 cible.

### Receipts

- création par run ;
- projet, mission, provider et mode ;
- commits et état Git ;
- contexte et manifeste ;
- logs et artefacts ;
- validations associées ;
- verdict structuré ;
- SHA-256 du receipt ;
- vérification des artefacts ;
- falsification d'un log détectée par test ;
- approbation humaine toujours obligatoire.

## Liste des 25 tests

1. sauvegarde cohérente et vérifiable ;
2. unicité des fournisseurs ;
3. API distantes désactivées ;
4. transports déclarés ;
5. adaptateur Codex simulé ;
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
22. surface de décision de chaque projet étudié ;
23. registre de roadmap valide ;
24. suivi des tâches, blocages et progression ;
25. adaptateur Vibe simulé.

## Limites et risques

- `node:sqlite` affiche un avertissement expérimental avec Node 22 ;
- installation Pi réelle non testée ;
- comptes Codex/Vibe réels non testés par la CI ;
- Gitleaks intégré mais pas encore obligatoire dans le préflight des agents ;
- sandbox Bubblewrap/Podman commune non intégrée ;
- métadonnées enrichies des tâches conservées dans les fichiers JSON du dépôt, mais pas encore toutes projetées dans les colonnes SQLite globales ;
- pas de contrôle post-run des chemins modifiés ;
- pas de reviewer indépendant ;
- pas de pipeline builder/validator/reviewer ;
- pas de DAG ou de sous-missions ;
- pas de routeur automatique coût/qualité ;
- pas de Restic ni de test automatique de restauration ;
- pas d'interface web locale ;
- aucune fusion automatique.

## Suite prioritaire

1. `SIA-202` — imposer Gitleaks avant tout envoi distant ;
2. `SIA-203` — ajouter Bubblewrap, HOME temporaire et contrôle réseau ;
3. `SIA-204` — contrôler les fichiers modifiés par les agents ;
4. `SIA-101` — installer la branche sur le Pi 5 réel ;
5. `SIA-102` / `SIA-103` — tester reprise et restauration ;
6. `SIA-104` / `SIA-105` — tester Codex et Vibe réels ;
7. `SIA-301` / `SIA-302` — reviewer indépendant et pipeline complet ;
8. `SIA-205` — Restic ;
9. `SIA-401` — routeur coût/qualité fondé sur des mesures.

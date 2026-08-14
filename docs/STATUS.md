# État vérifié du projet

Date du contrôle : **14 août 2026**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

Ce document distingue ce qui est réellement livré, ce qui est validé sans fournisseur externe et ce qui reste à vérifier sur le Raspberry Pi réel.

## Résultat v0.9.0

| Élément | Résultat |
|---|---|
| Version | `0.9.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **22 réussis, 0 échec** |
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

### Git et missions

- scanner Git, stack et checks ;
- missions `TASK-XXXX` lisibles par dépôt ;
- branches dédiées ;
- worktrees ;
- mode `--dry-run` ;
- synchronisation automatique avec le registre global.

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
- prise en compte des fichiers modifiés, cités et trouvés par mots-clés ;
- budget maximal en octets ;
- SHA-256 de chaque fichier ;
- empreinte globale du contexte ;
- `MISSION.md`, `CONTEXT.md` et `MANIFEST.json` ;
- exclusion des chemins sensibles ;
- exclusion des binaires ;
- blocage de formats de secrets à haute confiance.

Le scanner intégré n'est pas encore Gitleaks. Il constitue une première barrière et reste couvert par un test avec faux jeton.

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
- prompt via stdin, pas dans la liste des processus ;
- plan/review avec profil `plan` ;
- build avec `accept-edits` ;
- `auto-approve` interdit ;
- shell explicitement désactivé ;
- outils de fichiers limités par mode ;
- plafonds de prix, tokens et tours ;
- sortie streaming JSON archivée ;
- lease exclusif par mission.

### Nature des tests d'agents

Les tests Codex et Vibe utilisent de faux exécutables locaux. Ils valident :

- le contexte réellement transmis par stdin ;
- les arguments de sécurité ;
- les budgets ;
- le parsing JSONL ;
- les logs et réponses ;
- les états SQLite ;
- le refus du build sans worktree.

Ils ne prouvent pas encore l'authentification réelle, la disponibilité d'un compte, la qualité d'un modèle ni le coût observé.

### Sauvegarde et daemon

- image SQLite cohérente avec `VACUUM INTO` ;
- copie du journal JSONL ;
- manifeste avec tailles et SHA-256 ;
- vérification et détection de corruption ;
- daemon one-shot ou permanent ;
- resynchronisation des projets ;
- récupération des runs ;
- état `daemon-status.json` ;
- événement d'échec par projet.

### Raspberry Pi

Le paquet comprend :

- installateur utilisateur ;
- désinstallateur conservant les données ;
- wrapper `~/.local/bin/superia` ;
- service systemd utilisateur ;
- durcissement `NoNewPrivileges`, `ProtectSystem`, `ProtectHome` et protections du noyau ;
- test, daemon initial, création et vérification de sauvegarde ;
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

## Liste des 22 tests

1. sauvegarde cohérente et vérifiable ;
2. unicité des fournisseurs ;
3. API distantes désactivées ;
4. transports déclarés ;
5. adaptateur Codex de bout en bout simulé ;
6. contexte ciblé et secret exclu ;
7. SQLite WAL et persistance multi-projets ;
8. récupération des runs et journal JSONL ;
9. flux Git mission/worktree ;
10. daemon synchronisation/récupération ;
11. lease exclusif ;
12. reprise d'un lease expiré ;
13. unicité des outils locaux ;
14. légèreté des outils requis ;
15. exécutables candidats déclarés ;
16. Matrix locale et globale ;
17. runner réussi avec logs ;
18. runner timeout et arrêt du groupe ;
19. receipt et détection de falsification ;
20. catalogue de recherche valide ;
21. surface de décision de chaque projet étudié ;
22. adaptateur Vibe de bout en bout simulé.

## Limites et risques

- `node:sqlite` affiche un avertissement expérimental avec Node 22 ;
- installation Pi réelle non testée ;
- comptes Codex/Vibe réels non testés par la CI ;
- Gitleaks externe non intégré ;
- sandbox bubblewrap/Podman commune non intégrée ;
- pas de signature cryptographique d'identité des receipts ;
- pas de relation de pipeline explicite entre builder, validator et reviewer ;
- pas de reviewer indépendant ;
- pas de DAG ou de sous-missions ;
- pas de routeur automatique coût/qualité ;
- pas de Restic ni de test automatique de restauration ;
- pas d'interface web locale ;
- aucune fusion automatique.

## Prochain lot recommandé

1. exécuter `install/pi/install.sh` sur le Pi 5 réel ;
2. vérifier le service, l'arrêt brutal et la restauration ;
3. installer/authentifier Codex et Vibe officiellement ;
4. lancer les mêmes missions de benchmark en mode plan ;
5. enregistrer durée, erreurs et consommation observée ;
6. intégrer Gitleaks ;
7. créer un reviewer indépendant ;
8. relier builder → validations → review → receipt ;
9. ajouter Restic et un test de restauration ;
10. construire ensuite le routeur coût/qualité.

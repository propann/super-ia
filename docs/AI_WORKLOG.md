# Journal de travail IA

## 14 août 2026 — fondation

- Branche : `agent/bootstrap-universal-cli`.
- CLI TypeScript, catalogue multi-fournisseurs, scanner Git, missions et worktrees.
- API désactivées par défaut, aucun contournement de quota, aucune fusion automatique.

## Recherche et architecture

- Étude des agents de code, orchestrateurs multi-agents, mémoire, contexte, ACP/MCP/A2A et concurrents GitHub.
- Décision : Raspberry Pi 5 comme plan de contrôle ; aucun modèle local obligatoire.
- Documentation de recherche et catalogue machine-lisible.

## V0.3 — audit initial

- Vérification stricte de ce qui existait réellement dans Git.
- 10 tests verts ; missions JSON par dépôt ; aucune exécution d'agent.
- Création de `docs/STATUS.md`.

## V0.4 — plan de contrôle durable

- `SUPERIA_HOME` global ;
- SQLite WAL et migrations ;
- projets, missions, runs, heartbeats et événements ;
- journal JSONL ;
- récupération des runs abandonnés.

Validation : 12 tests.

## V0.5 — contexte et runner

- contexte Git ciblé ;
- manifestes SHA-256 ;
- exclusions de secrets et binaires ;
- runner sans shell implicite ;
- logs, heartbeat, timeout et arrêt des descendants ;
- validations locales.

Validation : 15 tests.

## V0.6 — Codex et leases

- lease exclusif par mission ;
- Codex `exec` avec prompt par stdin ;
- plan/review en lecture seule ;
- build uniquement dans un worktree ;
- sandbox officielle conservée ;
- JSONL et dernière réponse archivés.

Validation : 18 tests.

## V0.7 — exploitation Pi

- sauvegarde SQLite cohérente ;
- manifeste SHA-256 et corruption détectable ;
- daemon ;
- console Matrix multi-projets ;
- service systemd utilisateur ;
- installateur sans `sudo`.

Validation : 20 tests.

## V0.8 — Mistral Vibe

- mode programmatique forcé ;
- prompt par stdin ;
- plan/review avec profil plan ;
- build avec `accept-edits` ;
- shell désactivé ;
- prix, tokens et tours plafonnés.

Validation : 21 tests.

## V0.9 — receipts

- receipt par run ;
- contexte, Git, logs, événements et validations ;
- empreinte globale et empreinte de chaque artefact ;
- détection de falsification ;
- approbation humaine obligatoire.

Validation : 22 tests.

## V0.10 et V0.11 — suivi et Gitleaks

- priorité, responsable, échéance, tags, dépendances et critères d'acceptation ;
- tableau `task board` ;
- roadmap JSON contrôlée par la CI ;
- Gitleaks intégré puis rendu obligatoire ;
- absence, erreur ou finding bloquants ;
- dérogation explicite et journalisée.

Validation : 26 tests.

## V0.12 — Bubblewrap

- HOME jetable ;
- système en lecture seule ;
- worktree monté selon le mode ;
- état fournisseur limité ;
- namespaces et capacités réduites ;
- autotest et rapport Pi ;
- dérogation explicite et journalisée.

La politique est validée en CI avec des mocks. Le noyau réel reste à tester sur le Pi.

## V0.13 — garde Git, reviewer et pipeline

### Contrôle des changements

- chemins autorisés par mission ;
- build refusé sans périmètre ;
- snapshot Git avant/après ;
- patch et rapport archivés ;
- run en échec si hors périmètre ;
- parseur Git porcelain v2.

### Reviewer indépendant

- fournisseur différent du builder ;
- review strictement en lecture seule ;
- JSON structuré obligatoire ;
- findings avec sévérité, preuve et recommandation ;
- sortie invalide → `blocked` ;
- approbation incohérente → `changes-requested`.

### Pipeline et reprise

- builder → garde Git → validations → reviewer → receipt ;
- checkpoints atomiques ;
- `pipeline status` ;
- `--resume` ;
- reprise après builder et après review sans double exécution.

Validation : 39 tests.

## V0.14 — corrections bornées

- nouvelle tentative uniquement avec `--retry` ;
- retry après `changes-requested` seulement ;
- `--resume` et `--retry` incompatibles ;
- review précédente injectée par fichier, jamais dans `argv` ;
- nombre maximal d'essais figé ;
- plafond total de prix Vibe réservé figé ;
- chaque builder terminé consomme une tentative ;
- empreinte SHA-256 de chaque patch ;
- patch déjà vu → `loop-detected` avant une nouvelle review ;
- causes d'arrêt persistées.

Le test de boucle vérifie que la seconde correction reçoit la review, consomme une tentative, porte le plafond réservé à 0,50 USD et ne relance pas le reviewer.

## V0.14 — durcissement final du change guard

- 50 fichiers modifiés maximum ;
- 1 000 000 octets effectifs maximum ;
- contenu des fichiers non suivis compté ;
- `.env` et variantes interdits ;
- `.npmrc` et `.pypirc` interdits ;
- clés `.pem`, `.key`, `id_rsa`, `id_ed25519` interdites ;
- `.git-credentials` interdit ;
- chemin interdit prioritaire sur un glob autorisé ;
- limite non positive = fail-closed ;
- rapport enrichi avec `forbiddenFiles`, `limits` et `limitViolations`.

Validation GitHub finale :

- Ubuntu 24.04 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- **48 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- scripts Pi valides ;
- aucune commande `sudo` dans `install/pi`.

## État honnête des adaptateurs

Les faux exécutables et runners simulés prouvent la plomberie Super IA, pas encore :

- l'authentification réelle ;
- la disponibilité du compte ;
- la qualité des modèles ;
- le coût réellement facturé ;
- le fonctionnement sur le Pi cible.

## Prochaine phase

1. installer v0.14 sur le Pi 5 ;
2. lancer l'autotest Bubblewrap réel ;
3. tester service, coupure et restauration ;
4. authentifier Codex et Vibe ;
5. exécuter un benchmark commun ;
6. intégrer Restic ;
7. construire le routeur coût/qualité ;
8. construire le DAG de missions ;
9. ajouter interface web et notifications.

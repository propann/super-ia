# Feuille de route Super IA

Version courante : **0.13.0**  
Registre détaillé validé par la CI : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json)  
Vue de travail : [`TASK_TRACKER.md`](TASK_TRACKER.md)

## Lecture rapide

### Livré

- plan de contrôle SQLite WAL multi-projets ;
- scanner Git, missions et worktrees ;
- contexte ciblé avec SHA-256 et barrière anti-secrets ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- adaptateurs Codex et Mistral Vibe ;
- Gitleaks obligatoire ;
- politique Bubblewrap commune avec HOME jetable ;
- receipts et sauvegardes vérifiables ;
- daemon, service Pi et console Matrix ;
- suivi enrichi des tâches ;
- périmètre d'écriture par mission ;
- snapshot Git avant/après ;
- diff et rapport de changement archivés ;
- échec automatique en cas de modification hors périmètre ;
- reviewer indépendant et structuré ;
- pipeline builder → validation → review → receipt ;
- checkpoints atomiques et reprise contrôlée.

### Bloqué par le matériel ou les comptes

- autotest Bubblewrap réel sur le Pi ;
- installation sur le Pi 5 réel ;
- test de coupure brutale ;
- test de restauration ;
- authentification Codex réelle ;
- authentification Vibe réelle ;
- benchmark commun Codex/Vibe.

### Prochain chantier logiciel

1. budget de retries et détection de boucle ;
2. taille maximale des diffs et chemins toujours interdits ;
3. Restic après le test de restauration ;
4. routeur coût/qualité à partir des benchmarks réels ;
5. DAG de missions.

## V0.1 à V0.9 — fondations terminées

- [x] CLI TypeScript, catalogue et diagnostic ;
- [x] scanner Git, missions, branches et worktrees ;
- [x] SQLite WAL, migrations, runs, événements et reprise ;
- [x] leases exclusifs ;
- [x] contexte Git ciblé et manifestes SHA-256 ;
- [x] runner contrôlé ;
- [x] Codex CLI et Mistral Vibe ;
- [x] receipts et détection de falsification ;
- [x] sauvegardes, daemon et paquet Pi non privilégié.

## V0.10 — suivi et sécurité externe

- [x] statut `blocked` et priorités ;
- [x] responsable, fournisseur et échéance ;
- [x] tags, dépendances et critères d'acceptation ;
- [x] notes horodatées ;
- [x] tableau `superia task board` ;
- [x] registre de roadmap JSON validé par la CI ;
- [x] Gitleaks avec rapport JSON expurgé.

## V0.11 — préflight Gitleaks

- [x] Gitleaks exécuté avant Codex/Vibe réels ;
- [x] run refusé si Gitleaks est absent ou détecte un finding ;
- [x] rapport et run de scan enregistrés ;
- [x] préflight inclus dans les métadonnées ;
- [x] dérogation explicite et journalisée ;
- [x] test prouvant que l'agent bloqué ne démarre pas.

## V0.12 — sandbox commune

- [x] constructeur Bubblewrap sur Linux ;
- [x] préflight obligatoire avant Codex/Vibe réels ;
- [x] HOME temporaire par run ;
- [x] système et outils montés en lecture seule ;
- [x] plan/review limités en lecture seule ;
- [x] build limité au worktree en écriture ;
- [x] sortie Codex individuelle en écriture ;
- [x] état fournisseur limité ;
- [x] réseau désactivable ;
- [x] dérogation Bubblewrap explicite et journalisée ;
- [x] autotest `superia security sandbox-check` ;
- [x] rapport `sandbox-status.json` pendant l'installation Pi ;
- [x] tests de politique avec mocks ;
- [ ] autotest noyau réussi sur le Pi réel ;
- [ ] compatibilité réelle Bubblewrap + Codex ;
- [ ] compatibilité réelle Bubblewrap + Vibe ;
- [ ] Podman optionnel pour les tâches à risque élevé ;
- [ ] filtrage réseau plus fin pour les agents distants.

## V0.13 — contrôle, review et pipeline

### Contrôle des modifications

- [x] champ `allowedPaths` dans les missions ;
- [x] option répétable `--allow-path <glob>` ;
- [x] build refusé sans périmètre ;
- [x] état Git capturé avant/après ;
- [x] empreintes des fichiers modifiés ;
- [x] comparaison aux chemins autorisés ;
- [x] plan/review avec zéro modification autorisée ;
- [x] `AGENT_CHANGES.patch` archivé ;
- [x] `CHANGE_GUARD.json` archivé ;
- [x] run durable marqué `failed` en cas de violation ;
- [x] comportement fail-closed ;
- [x] tests de bout en bout.

### Reviewer indépendant

- [x] reviewer différent du builder ;
- [x] review en lecture seule ;
- [x] findings structurés par sévérité ;
- [x] preuve et recommandation obligatoires ;
- [x] sortie non structurée bloquante ;
- [x] approbation incohérente corrigée automatiquement ;
- [x] rapport `REVIEW.json` archivé ;
- [x] validation humaine conservée.

### Pipeline qualité

- [x] builder → garde Git → validations → reviewer → receipt ;
- [x] échec bloquant à chaque étape ;
- [x] receipt enrichi avec garde, patch et review ;
- [x] checkpoints atomiques ;
- [x] commande de statut ;
- [x] reprise avec `--resume` ;
- [x] reprise après builder sans double exécution ;
- [x] reprise après review en ne recréant que le receipt ;
- [x] aucune fusion automatique ;
- [x] **39 tests réussis**.

## V0.14 — maîtrise des boucles et coûts

- [ ] nombre maximal d'essais ;
- [ ] budget cumulé par pipeline ;
- [ ] empreinte de tentative ;
- [ ] détection d'une correction identique ;
- [ ] cause d'arrêt enregistrée ;
- [ ] taille maximale des diffs ;
- [ ] liste de fichiers toujours interdits ;
- [ ] correction automatique bornée après review.

## V0.15 — validation Raspberry Pi

- [ ] installation complète sur le Pi 5 ;
- [ ] service disponible après déconnexion ;
- [ ] test de coupure et reprise ;
- [ ] test de sauvegarde/restauration ;
- [ ] rapport matériel et consommation ;
- [ ] Codex réel sous Bubblewrap ;
- [ ] Vibe réel sous Bubblewrap ;
- [ ] benchmark identique ;
- [ ] Restic et politique de rétention ;
- [ ] copie hors machine.

## V0.16 — orchestration multi-agent

- [ ] DAG avec détection de cycles ;
- [ ] claim/ack/complete/requeue atomiques ;
- [ ] déblocage automatique des dépendances ;
- [ ] détection des conflits de fichiers ;
- [ ] comparaison de plans et audit croisé ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] arrêt d'urgence global ;
- [ ] interface web locale et notifications.

## V1.0 — publication stable

La PR ne passe en prête pour revue que lorsque :

- [ ] le Pi réel est validé ;
- [ ] la restauration est prouvée ;
- [ ] Codex et Vibe réels ont produit un receipt valide ;
- [x] Gitleaks est obligatoire ;
- [x] les modifications hors périmètre sont bloquées ;
- [x] le reviewer indépendant est livré ;
- [x] le pipeline reprend depuis ses checkpoints ;
- [ ] la sandbox commune est validée sur le noyau du Pi ;
- [ ] la CI est verte sur le head final ;
- [ ] les limites restantes sont documentées ;
- [ ] une revue humaine autorise la fusion.

## Hors périmètre par défaut

- Kubernetes ;
- Redis ou PostgreSQL dans le MVP ;
- modèle local obligatoire ;
- base vectorielle obligatoire ;
- fusion automatique ;
- contournement de quotas ;
- scraping interdit ;
- conversation libre infinie entre agents.

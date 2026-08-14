# Feuille de route Super IA

Version courante : **0.12.0**  
Registre détaillé validé par la CI : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json)  
Vue de travail : [`TASK_TRACKER.md`](TASK_TRACKER.md)

## Lecture rapide

### Livré

- plan de contrôle SQLite WAL multi-projets ;
- scanner Git, missions et worktrees ;
- contexte ciblé avec SHA-256 et barrière anti-secrets ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- adaptateurs Codex et Mistral Vibe ;
- receipts vérifiables ;
- sauvegardes cohérentes ;
- daemon et service systemd utilisateur pour le Pi ;
- console Matrix globale ;
- suivi enrichi des tâches ;
- Gitleaks avec rapport JSON expurgé ;
- préflight Gitleaks obligatoire ;
- politique Bubblewrap commune ;
- HOME jetable ;
- accès au workspace limité par mode ;
- sortie Codex montée individuellement ;
- dérogations de sécurité explicites et journalisées ;
- autotest Bubblewrap destiné au Pi.

### Bloqué par le matériel ou les comptes

- exécution noyau réelle de l'autotest Bubblewrap sur le Pi ;
- installation sur le Pi 5 réel ;
- test de coupure brutale ;
- test de restauration ;
- authentification Codex réelle ;
- authentification Vibe réelle ;
- benchmark commun Codex/Vibe.

### Prochain chantier logiciel

1. contrôler les fichiers réellement modifiés par chaque agent ;
2. intégrer un reviewer indépendant ;
3. construire le pipeline builder → validation → review → receipt ;
4. ajouter Restic après le test de restauration local ;
5. construire le routeur coût/qualité à partir des benchmarks réels.

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
- [x] réseau désactivable pour les tâches sans Internet ;
- [x] dérogation Bubblewrap explicite et journalisée ;
- [x] autotest `superia security sandbox-check` ;
- [x] rapport `sandbox-status.json` pendant l'installation Pi ;
- [x] tests de politique avec mocks ;
- [ ] autotest noyau réussi sur le Pi réel ;
- [ ] compatibilité réelle Bubblewrap + Codex ;
- [ ] compatibilité réelle Bubblewrap + Vibe ;
- [ ] Podman optionnel pour les tâches à risque élevé ;
- [ ] filtrage réseau plus fin pour les agents distants.

## V0.13 — contrôle des modifications et qualité

- [ ] capturer l'état Git avant/après ;
- [ ] comparer les fichiers modifiés à une liste autorisée ;
- [ ] échouer sur modification hors périmètre ;
- [ ] archiver le diff dans le receipt ;
- [ ] reviewer différent du builder ;
- [ ] findings structurés par sévérité ;
- [ ] pipeline déterministe builder → validation → review → receipt ;
- [ ] checkpoints, retries limités et détection de boucle ;
- [ ] aucune fusion automatique.

## V0.14 — validation Raspberry Pi

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

## V0.15 — orchestration multi-agent

- [ ] DAG avec détection de cycles ;
- [ ] claim/ack/complete/requeue atomiques ;
- [ ] déblocage automatique des dépendances ;
- [ ] détection des conflits de fichiers ;
- [ ] comparaison de plans et audit croisé ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] arrêt d'urgence global ;
- [ ] reprise automatique contrôlée ;
- [ ] interface web locale et notifications.

## V1.0 — publication stable

La PR ne passe en prête pour revue que lorsque :

- [ ] le Pi réel est validé ;
- [ ] la restauration est prouvée ;
- [ ] Codex et Vibe réels ont produit un receipt valide ;
- [x] Gitleaks est obligatoire avant les agents distants intégrés ;
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

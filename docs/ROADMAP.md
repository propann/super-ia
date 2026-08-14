# Feuille de route Super IA

Version courante : **0.11.0**  
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
- **préflight Gitleaks obligatoire avant Codex et Vibe réels** ;
- dérogation de sécurité explicite et journalisée.

### Bloqué par le matériel ou les comptes

- installation sur le Pi 5 réel ;
- test de coupure brutale ;
- test de restauration ;
- authentification Codex réelle ;
- authentification Vibe réelle ;
- benchmark commun Codex/Vibe.

### Prochain chantier logiciel

1. ajouter Bubblewrap avec HOME temporaire et réseau contrôlé ;
2. vérifier les chemins réellement modifiés par chaque agent ;
3. intégrer un reviewer indépendant ;
4. construire le pipeline builder → validation → review → receipt ;
5. ajouter Restic après le test de restauration local ;
6. construire le routeur coût/qualité à partir des benchmarks réels.

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
- [x] `superia security scan` ;
- [x] Gitleaks avec rapport JSON expurgé ;
- [x] mode manuel `--required`.

## V0.11 — préflight de sécurité

- [x] Gitleaks exécuté avant Codex/Vibe réels ;
- [x] run refusé si Gitleaks est absent ;
- [x] run refusé lorsqu'un finding est présent ;
- [x] rapport et run de scan enregistrés ;
- [x] préflight inclus dans les métadonnées de l'agent ;
- [x] dérogation `--allow-without-gitleaks` ;
- [x] dérogation journalisée par événement durable ;
- [x] test prouvant que l'agent bloqué ne démarre pas.

## V0.12 — sandbox commune

- [ ] Bubblewrap sur Linux ;
- [ ] HOME temporaire par run ;
- [ ] écriture limitée au worktree et aux artefacts ;
- [ ] réseau désactivé par défaut pour les agents génériques ;
- [ ] liste d'exceptions réseau explicite ;
- [ ] Podman optionnel pour les tâches à risque élevé ;
- [ ] tests d'accès hors périmètre.

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
- [ ] Codex réel ;
- [ ] Vibe réel ;
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
- [ ] la sandbox commune est validée ;
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

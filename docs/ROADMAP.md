# Feuille de route Super IA

Version courante : **0.10.0**  
Registre détaillé et validé par la CI : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json)  
Vue de travail : [`TASK_TRACKER.md`](TASK_TRACKER.md)

## Lecture rapide

### Livré

- plan de contrôle SQLite WAL multi-projets ;
- scanner Git, missions et worktrees ;
- contexte ciblé avec SHA-256 et première barrière anti-secrets ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- adaptateurs Codex et Mistral Vibe ;
- receipts vérifiables ;
- sauvegardes cohérentes ;
- daemon et service systemd utilisateur pour le Pi ;
- console Matrix globale ;
- suivi enrichi des tâches ;
- Gitleaks optionnel avec mode bloquant `--required`.

### Bloqué par le matériel ou les comptes

- installation sur le Pi 5 réel ;
- test de coupure brutale ;
- test de restauration ;
- authentification Codex réelle ;
- authentification Vibe réelle ;
- benchmark commun Codex/Vibe.

### Prochain chantier logiciel

1. rendre Gitleaks obligatoire dans le préflight des agents distants ;
2. ajouter Bubblewrap avec HOME temporaire et réseau contrôlé ;
3. vérifier les chemins réellement modifiés par chaque agent ;
4. intégrer un reviewer indépendant ;
5. construire le pipeline builder → validation → review → receipt ;
6. ajouter Restic après le test de restauration local ;
7. construire le routeur coût/qualité à partir des benchmarks réels.

## V0.1 à V0.9 — fondations terminées

- [x] CLI TypeScript ;
- [x] catalogue multi-fournisseurs et diagnostic ;
- [x] API génériques désactivées par défaut ;
- [x] scanner Git ;
- [x] missions `TASK-XXXX` ;
- [x] branches et worktrees ;
- [x] console Matrix ;
- [x] SQLite WAL et migrations ;
- [x] registre multi-projets ;
- [x] runs, heartbeats, événements et reprise ;
- [x] leases exclusifs ;
- [x] contexte Git ciblé et manifestes SHA-256 ;
- [x] runner contrôlé ;
- [x] Codex CLI ;
- [x] Mistral Vibe ;
- [x] receipts et détection de falsification ;
- [x] sauvegardes cohérentes ;
- [x] daemon et paquet Pi non privilégié.

## V0.10 — suivi et sécurité externe

- [x] statut `blocked` ;
- [x] priorités `low`, `normal`, `high`, `critical` ;
- [x] responsable, fournisseur et échéance ;
- [x] tags et critères d'acceptation ;
- [x] dépendances vérifiées ;
- [x] notes horodatées ;
- [x] tableau `superia task board` ;
- [x] registre de roadmap JSON validé par la CI ;
- [x] Gitleaks enregistré dans `superia doctor` ;
- [x] `superia security scan` ;
- [x] rapport JSON expurgé ;
- [x] mode `--required` ;
- [x] tests scan propre et finding bloquant.

## V0.11 — préflight de sécurité

- [ ] exécuter Gitleaks avant Codex/Vibe et tout envoi web/API ;
- [ ] refuser le run si Gitleaks est absent en politique stricte ;
- [ ] refuser le run lorsqu'un finding est présent ;
- [ ] journaliser toute dérogation locale ;
- [ ] conserver le rapport dans le receipt ;
- [ ] contrôler les fichiers modifiés après le run ;
- [ ] échouer si un fichier hors périmètre est touché.

## V0.12 — sandbox commune

- [ ] Bubblewrap sur Linux ;
- [ ] HOME temporaire par run ;
- [ ] écriture limitée au worktree et aux artefacts du run ;
- [ ] réseau désactivé par défaut pour les agents génériques ;
- [ ] liste d'exceptions réseau explicite ;
- [ ] Podman optionnel pour les tâches à risque élevé ;
- [ ] tests d'accès hors périmètre.

## V0.13 — pipeline de qualité

- [ ] reviewer différent du builder ;
- [ ] findings structurés par sévérité ;
- [ ] relation builder/validator/reviewer ;
- [ ] pipeline déterministe ;
- [ ] checkpoints reprenables ;
- [ ] budgets de retries ;
- [ ] détection de boucle ;
- [ ] receipt final regroupant toutes les preuves ;
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
- [ ] comparaison de plans ;
- [ ] audit croisé ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] arrêt d'urgence global ;
- [ ] reprise automatique contrôlée.

## V1.0 — publication stable

La PR ne passe en prête pour revue que lorsque :

- [ ] le Pi réel est validé ;
- [ ] la restauration est prouvée ;
- [ ] Codex et Vibe réels ont produit un receipt valide ;
- [ ] Gitleaks est obligatoire avant envoi distant ;
- [ ] la sandbox commune est validée ;
- [ ] la CI est verte ;
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

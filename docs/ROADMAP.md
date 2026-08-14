# Feuille de route Super IA

Version courante : **0.14.0**  
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
- périmètre d'écriture, snapshot Git et diff archivé ;
- reviewer indépendant et structuré ;
- pipeline builder → validation → review → receipt ;
- checkpoints atomiques et reprise contrôlée ;
- retries explicites et bornés ;
- feedback de review injecté au builder ;
- plafonds de tentatives et de prix réservés immuables ;
- détection de patch identique avant nouvelle review ;
- receipts et sauvegardes vérifiables ;
- daemon, service Pi et console Matrix ;
- suivi enrichi des tâches et roadmap machine-lisible.

### Bloqué par le matériel ou les comptes

- autotest Bubblewrap réel sur le Pi ;
- installation sur le Pi 5 réel ;
- test de coupure brutale ;
- test de restauration ;
- authentification Codex réelle ;
- authentification Vibe réelle ;
- benchmark commun Codex/Vibe.

### Prochain chantier logiciel

1. limites de taille du diff et fichiers toujours interdits ;
2. Restic après le test de restauration ;
3. routeur coût/qualité après benchmarks réels ;
4. DAG de missions ;
5. interface web locale et notifications.

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

- [x] statut `blocked`, priorités, responsable et échéance ;
- [x] tags, dépendances et critères d'acceptation ;
- [x] notes horodatées et tableau `task board` ;
- [x] registre de roadmap JSON validé par la CI ;
- [x] Gitleaks avec rapport JSON expurgé.

## V0.11 — préflight Gitleaks

- [x] Gitleaks exécuté avant Codex/Vibe réels ;
- [x] run refusé si absent, en erreur ou avec finding ;
- [x] rapport et run de scan enregistrés ;
- [x] dérogation explicite et journalisée.

## V0.12 — sandbox commune

- [x] constructeur Bubblewrap sur Linux ;
- [x] HOME temporaire ;
- [x] système et outils en lecture seule ;
- [x] plan/review en lecture seule ;
- [x] build limité au worktree ;
- [x] état fournisseur limité ;
- [x] réseau désactivable ;
- [x] dérogation explicite et journalisée ;
- [x] autotest `security sandbox-check` ;
- [x] tests de politique avec mocks ;
- [ ] autotest noyau réussi sur le Pi réel ;
- [ ] compatibilité réelle Bubblewrap + Codex ;
- [ ] compatibilité réelle Bubblewrap + Vibe ;
- [ ] Podman optionnel pour les tâches à risque élevé ;
- [ ] filtrage réseau plus fin.

## V0.13 — contrôle, review et pipeline

### Contrôle des modifications

- [x] `allowedPaths` par mission ;
- [x] build refusé sans périmètre ;
- [x] état Git avant/après ;
- [x] empreinte des fichiers et patch archivé ;
- [x] plan/review avec zéro modification autorisée ;
- [x] hors-périmètre bloquant ;
- [x] comportement fail-closed ;
- [x] tests de bout en bout.

### Reviewer indépendant

- [x] reviewer différent du builder ;
- [x] lecture seule ;
- [x] findings structurés ;
- [x] preuve et recommandation obligatoires ;
- [x] sortie non structurée bloquante ;
- [x] approbation incohérente corrigée ;
- [x] rapport `REVIEW.json`.

### Pipeline qualité

- [x] builder → garde Git → validations → reviewer → receipt ;
- [x] échec bloquant à chaque étape ;
- [x] receipt enrichi avec garde, patch et review ;
- [x] checkpoints atomiques ;
- [x] commande de statut ;
- [x] reprise avec `--resume` ;
- [x] aucune étape terminée relancée ;
- [x] aucune fusion automatique.

## V0.14 — maîtrise des corrections

- [x] correction déclenchée explicitement avec `--retry` ;
- [x] retry autorisé seulement après `changes-requested` ;
- [x] review précédente injectée au builder par fichier ;
- [x] nombre maximal d'essais ;
- [x] plafond total de prix Vibe réservé ;
- [x] plafonds figés au premier lancement ;
- [x] chaque builder terminé comptabilisé ;
- [x] empreinte SHA-256 de chaque patch ;
- [x] détection d'une correction identique ;
- [x] reviewer non relancé après boucle détectée ;
- [x] cause d'arrêt enregistrée ;
- [x] **44 tests réussis** ;
- [ ] extraction du coût réellement facturé ;
- [ ] taille maximale des diffs ;
- [ ] liste de fichiers toujours interdits ;
- [ ] correction automatique sans action humaine — volontairement désactivée.

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
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] arrêt d'urgence global ;
- [ ] interface web locale ;
- [ ] notifications.

## V1.0 — publication stable

La PR passe en prête pour revue uniquement lorsque :

- [ ] le Pi réel est validé ;
- [ ] la restauration est prouvée ;
- [ ] Codex et Vibe réels ont produit un receipt valide ;
- [x] Gitleaks est obligatoire ;
- [x] les modifications hors périmètre sont bloquées ;
- [x] le reviewer indépendant est livré ;
- [x] le pipeline reprend depuis ses checkpoints ;
- [x] les corrections sont bornées et les boucles détectées ;
- [ ] la sandbox commune est validée sur le noyau du Pi ;
- [ ] la CI est verte sur le head final ;
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

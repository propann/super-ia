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
- Bubblewrap avec HOME jetable ;
- périmètre d'écriture, chemins critiques interdits et limites de diff ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- checkpoints et reprise ;
- retries explicites et bornés ;
- feedback de review injecté au builder ;
- plafonds de tentatives et de prix réservés immuables ;
- détection de patch identique ;
- receipts et sauvegardes vérifiables ;
- daemon, service Pi et console Matrix ;
- suivi de tâches et roadmap machine-lisible.

### Bloqué par le matériel ou les comptes

- autotest Bubblewrap réel sur le Pi ;
- installation sur le Pi 5 réel ;
- coupure et restauration ;
- authentification Codex et Vibe ;
- benchmark commun Codex/Vibe.

### Prochain chantier logiciel

1. Restic après la restauration réelle ;
2. routeur coût/qualité après benchmarks ;
3. DAG de missions ;
4. interface web locale ;
5. notifications.

## V0.1 à V0.9 — fondations

- [x] CLI TypeScript, catalogue et diagnostic ;
- [x] scanner Git, missions, branches et worktrees ;
- [x] SQLite WAL, migrations, runs, événements et reprise ;
- [x] leases exclusifs ;
- [x] contexte Git ciblé et manifestes SHA-256 ;
- [x] runner contrôlé ;
- [x] Codex et Mistral Vibe ;
- [x] receipts et détection de falsification ;
- [x] sauvegardes, daemon et paquet Pi sans privilèges.

## V0.10 et V0.11 — suivi et Gitleaks

- [x] statuts, priorités, responsable, échéance et tags ;
- [x] dépendances et critères d'acceptation ;
- [x] tableau `task board` ;
- [x] roadmap JSON validée par la CI ;
- [x] Gitleaks avec rapport expurgé ;
- [x] Gitleaks obligatoire avant Codex/Vibe ;
- [x] absence, erreur ou finding bloquants ;
- [x] dérogation explicite et journalisée.

## V0.12 — sandbox commune

- [x] constructeur Bubblewrap ;
- [x] HOME temporaire ;
- [x] système en lecture seule ;
- [x] plan/review en lecture seule ;
- [x] build limité au worktree ;
- [x] réseau désactivable ;
- [x] dérogation journalisée ;
- [x] autotest et tests avec mocks ;
- [ ] autotest noyau réussi sur le Pi ;
- [ ] compatibilité réelle Bubblewrap + Codex ;
- [ ] compatibilité réelle Bubblewrap + Vibe ;
- [ ] Podman optionnel ;
- [ ] filtrage réseau plus fin.

## V0.13 — contrôle, reviewer et pipeline

### Contrôle initial

- [x] `allowedPaths` par mission ;
- [x] build refusé sans périmètre ;
- [x] état Git avant/après ;
- [x] patch et rapport archivés ;
- [x] plan/review avec zéro modification autorisée ;
- [x] hors-périmètre bloquant ;
- [x] comportement fail-closed.

### Reviewer

- [x] reviewer différent du builder ;
- [x] lecture seule ;
- [x] findings structurés ;
- [x] preuve et recommandation ;
- [x] sortie invalide bloquante ;
- [x] approbation incohérente corrigée ;
- [x] `REVIEW.json`.

### Pipeline

- [x] builder → garde Git → validations → reviewer → receipt ;
- [x] échec bloquant ;
- [x] receipt enrichi ;
- [x] checkpoints atomiques ;
- [x] statut et reprise ;
- [x] étapes terminées non relancées ;
- [x] aucune fusion automatique.

## V0.14 — corrections bornées et durcissement

### Retries

- [x] correction explicite avec `--retry` ;
- [x] uniquement après `changes-requested` ;
- [x] review précédente injectée par fichier ;
- [x] nombre maximal d'essais ;
- [x] plafond total de prix réservé ;
- [x] plafonds figés au premier lancement ;
- [x] chaque builder comptabilisé ;
- [x] empreinte SHA-256 de chaque patch ;
- [x] patch identique détecté ;
- [x] reviewer non relancé après boucle ;
- [x] cause d'arrêt enregistrée.

### Limites de changement — `SIA-206`

- [x] 50 fichiers modifiés maximum ;
- [x] 1 000 000 octets effectifs maximum ;
- [x] contenu des fichiers non suivis compté ;
- [x] `.env` et variantes toujours interdits ;
- [x] `.npmrc` et `.pypirc` interdits ;
- [x] clés privées et `.git-credentials` interdits ;
- [x] chemin interdit prioritaire sur un glob autorisé ;
- [x] limites invalides bloquantes ;
- [x] rapport enrichi ;
- [x] **48 tests réussis**.

### Encore volontairement absent

- [ ] extraction du coût réellement facturé ;
- [ ] limites personnalisables par projet ;
- [ ] correction automatique sans action humaine.

## V0.15 — validation Raspberry Pi

- [ ] installation complète ;
- [ ] service après déconnexion ;
- [ ] coupure et reprise ;
- [ ] sauvegarde/restauration ;
- [ ] rapport matériel ;
- [ ] Codex réel sous Bubblewrap ;
- [ ] Vibe réel sous Bubblewrap ;
- [ ] benchmark identique ;
- [ ] Restic et rétention ;
- [ ] copie hors machine.

## V0.16 — orchestration

- [ ] DAG et détection de cycles ;
- [ ] claim/ack/complete/requeue atomiques ;
- [ ] déblocage automatique des dépendances ;
- [ ] conflits de fichiers ;
- [ ] routeur coût/capacité/qualité ;
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
- [x] chemins critiques et diffs excessifs sont bloqués ;
- [x] le reviewer indépendant est livré ;
- [x] le pipeline reprend depuis ses checkpoints ;
- [x] les corrections sont bornées ;
- [ ] Bubblewrap est validé sur le noyau du Pi ;
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

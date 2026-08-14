# Feuille de route

## V0.1 — socle

- [x] CLI TypeScript ;
- [x] catalogue multi-fournisseurs ;
- [x] diagnostic des outils ;
- [x] configuration avec API désactivées ;
- [x] scanner Git ;
- [x] missions `TASK-XXXX` ;
- [x] branches et worktrees ;
- [x] console Matrix.

## V0.2 — état fiable et multi-projets

- [x] `SUPERIA_HOME` global ;
- [x] SQLite WAL et migration initiale ;
- [x] registre multi-projets ;
- [x] synchronisation des missions JSON ;
- [x] runs et heartbeats ;
- [x] journal SQLite + JSONL ;
- [x] récupération des runs abandonnés ;
- [x] leases exclusifs et expiration ;
- [ ] clés d'idempotence explicites ;
- [ ] checkpoints de mission ;
- [ ] DAG de dépendances ;
- [ ] test d'arrêt brutal sur le Pi réel.

## V0.3 — contexte sécurisé

- [x] sélection Git ciblée ;
- [x] instructions et manifests prioritaires ;
- [x] recherche par mots-clés via Git ;
- [x] fichiers modifiés et références explicites ;
- [x] manifeste avec SHA-256 et raisons ;
- [x] budget de taille ;
- [x] scanner interne de chemins/secrets ;
- [x] paquet `MISSION.md` / `CONTEXT.md` / `MANIFEST.json` ;
- [ ] support hiérarchique complet de plusieurs `AGENTS.md` ;
- [ ] Gitleaks externe ;
- [ ] budget de tokens par tokenizer ;
- [ ] Repomix optionnel ;
- [ ] index Tree-sitter/symboles.

## V0.4 — runner

- [x] processus sans shell implicite ;
- [x] environnement réduit ;
- [x] dossier limité au projet/worktree ;
- [x] stdin contrôlé ;
- [x] logs persistants ;
- [x] timeout ;
- [x] arrêt du groupe de processus ;
- [x] heartbeats ;
- [x] validation des checks du dépôt ;
- [ ] HOME temporaire par run ;
- [ ] sandbox bubblewrap ;
- [ ] Podman optionnel ;
- [ ] réseau désactivé par défaut pour agents génériques.

## V0.5 — agents

- [x] contrat d'adaptateur ;
- [x] adaptateur Codex CLI ;
- [x] Codex JSONL et dernière réponse ;
- [x] sandbox Codex conservée ;
- [x] adaptateur Mistral Vibe ;
- [x] Vibe programmatique par stdin ;
- [x] Vibe sans shell ;
- [x] plafonds prix/tokens/tours ;
- [x] faux exécutables de test sans quota ;
- [ ] mission réelle Codex sur Pi ;
- [ ] mission réelle Vibe sur Pi ;
- [ ] reprise de session native ;
- [ ] adaptateur Claude Code ;
- [ ] adaptateur Gemini CLI ;
- [ ] adaptateur Generic CLI ;
- [ ] Qwen Code ;
- [ ] OpenCode, Aider et mini-SWE-agent.

## V0.6 — preuve et qualité

- [x] artefacts par run ;
- [x] événements normalisés ;
- [x] receipt SHA-256 ;
- [x] vérification des artefacts ;
- [x] détection de falsification ;
- [x] état de validation structuré ;
- [x] approbation humaine obligatoire ;
- [ ] fingerprint renforcé des fichiers non suivis ;
- [ ] signature d'identité optionnelle ;
- [ ] reviewer indépendant ;
- [ ] findings structurés ;
- [ ] relation explicite builder/validator/reviewer ;
- [ ] budgets de retries ;
- [ ] contrôle des chemins modifiés autorisés.

## V0.7 — exploitation Raspberry Pi

- [x] sauvegarde SQLite cohérente ;
- [x] manifeste SHA-256 ;
- [x] détection de corruption ;
- [x] daemon de synchronisation/récupération ;
- [x] console Matrix globale ;
- [x] service systemd utilisateur ;
- [x] installateur sans `sudo` ;
- [x] durcissement systemd ;
- [x] première sauvegarde créée et vérifiée par l'installateur ;
- [ ] installation sur le Pi 5 réel ;
- [ ] test d'arrêt brutal ;
- [ ] test de restauration ;
- [ ] Restic ;
- [ ] rapport matériel réel ;
- [ ] interface web locale ;
- [ ] accès VPN/Tailscale ;
- [ ] notifications.

## V0.8 — orchestration multi-agent

- [ ] rôles planner/builder/reviewer/researcher dans un pipeline ;
- [ ] DAG avec détection de cycles ;
- [ ] claim/ack/complete/requeue atomiques ;
- [ ] tâches débloquées automatiquement ;
- [ ] détection des conflits de fichiers ;
- [ ] comparaison de plans ;
- [ ] audit croisé Codex/Vibe ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] arrêt d'urgence global ;
- [ ] reprise automatique contrôlée.

## V0.9 — écosystème large

- [ ] web assisté légitime ;
- [ ] import et validation de patches web ;
- [ ] GitHub Copilot CLI ;
- [ ] workers distants ;
- [ ] MCP lecture seule ;
- [ ] ACP quand stable et utile ;
- [ ] A2A uniquement pour workers distants.

## Laboratoire futur séparé

- [ ] définir une petite fonction locale précise ;
- [ ] comparer règle déterministe, service distant et petit modèle local ;
- [ ] utiliser Pi 4/5 uniquement si le benchmark est favorable ;
- [ ] aucun impact si le laboratoire est arrêté.

## Hors périmètre par défaut

- Kubernetes ;
- Redis ou PostgreSQL dans le MVP ;
- modèle local obligatoire ;
- base vectorielle obligatoire ;
- fusion automatique ;
- contournement de quotas ;
- scraping interdit ;
- conversation libre infinie entre agents.

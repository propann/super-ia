# Feuille de route

## V0.1 — socle

- [x] CLI TypeScript ;
- [x] catalogue multi-fournisseurs ;
- [x] diagnostic des outils ;
- [x] configuration locale avec API désactivées ;
- [x] scanner Git ;
- [x] missions `TASK-XXXX` ;
- [x] branches et worktrees ;
- [x] console Matrix.

## V0.1.5 — recherche approfondie

- [x] rôles des principales IA de code ;
- [x] concurrents directs et agents ouverts ;
- [x] comparaison ACP, MCP, A2A, JSONL, tmux et SQLite ;
- [x] architecture Pi 5 control-plane-only ;
- [x] mémoire Git + SQLite + JSONL + artefacts ;
- [x] pipeline multi-agent déterministe ;
- [x] protocole de benchmark ;
- [x] catalogue de veille machine-lisible.

## V0.2 — état fiable et multi-projets

- [x] répertoire global `SUPERIA_HOME` ;
- [x] SQLite en WAL ;
- [x] première migration de schéma ;
- [x] registre global multi-projets ;
- [x] import/synchronisation des missions JSON ;
- [x] table des runs ;
- [x] heartbeats ;
- [x] journal d'événements SQLite ;
- [x] miroir JSONL append-only ;
- [x] récupération des runs abandonnés ;
- [ ] leases et clés d'idempotence ;
- [ ] checkpoints ;
- [ ] graphe de dépendances ;
- [ ] test d'arrêt brutal sur le Pi réel.

## V0.3 — contexte sécurisé

- [ ] constructeur de contexte Git ciblé ;
- [ ] support hiérarchique de `AGENTS.md` ;
- [ ] recherche ripgrep ;
- [ ] manifeste avec hashes et raisons par fichier ;
- [ ] budget de tokens ;
- [ ] scan Gitleaks ;
- [ ] Repomix optionnel ;
- [ ] index Tree-sitter/symboles optionnel.

## V0.4 — exécution agent réelle

- [ ] runner de groupes de processus ;
- [ ] timeout et arrêt des descendants ;
- [ ] environnement temporaire ;
- [ ] adaptateur Generic CLI ;
- [ ] adaptateur Codex CLI ;
- [ ] adaptateur Mistral Vibe ;
- [ ] adaptateur Claude Code ;
- [ ] adaptateur Gemini CLI ;
- [ ] sorties JSON/JSONL normalisées ;
- [ ] capture versions, modèles, usages et coûts ;
- [ ] archivage propre des worktrees.

## V0.5 — sécurité et qualité

- [ ] politiques de permissions ;
- [ ] bubblewrap sur Linux ;
- [ ] Podman optionnel ;
- [ ] réseau désactivé par défaut en sandbox ;
- [ ] validation format/lint/typecheck/test/build ;
- [ ] contrôle des fichiers autorisés ;
- [ ] reviewer indépendant ;
- [ ] budgets de retries ;
- [ ] findings structurés ;
- [ ] receipt de fin de mission ;
- [ ] aucune fusion automatique.

## V0.6 — orchestration multi-agent

- [ ] DAG de missions avec détection de cycles ;
- [ ] claim/ack/complete/requeue atomiques ;
- [ ] tâches débloquées automatiquement ;
- [ ] détection des chevauchements de fichiers ;
- [ ] rôles planner/builder/reviewer/researcher ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] audit croisé ;
- [ ] comparaison de plans ;
- [ ] arrêt d'urgence ;
- [ ] reprise automatique contrôlée.

## V0.7 — exploitation Raspberry Pi

- [ ] sauvegarde SQLite cohérente ;
- [ ] sauvegarde Restic ;
- [ ] test de restauration ;
- [ ] service systemd non privilégié ;
- [ ] installateur ARM64 ;
- [ ] rapport matériel réel ;
- [ ] tableau de santé local ;
- [ ] accès distant via VPN/Tailscale ;
- [ ] notifications.

## V0.8 — écosystème large

- [ ] Qwen Code ;
- [ ] GitHub Copilot CLI ;
- [ ] OpenCode, Aider et mini-SWE-agent ;
- [ ] web assisté légitime ;
- [ ] import et validation de patches ;
- [ ] workers distants ;
- [ ] A2A uniquement si nécessaire.

## Laboratoire futur séparé

- [ ] mesurer une fonction locale précise sur Pi 4/5 ;
- [ ] comparer règle déterministe, service distant et petit modèle local ;
- [ ] n'installer Ollama/llama.cpp que si le bénéfice est démontré ;
- [ ] aucun impact fonctionnel si le laboratoire est arrêté.

## Hors périmètre par défaut

- Kubernetes ;
- Redis ou PostgreSQL pour le MVP ;
- modèle local obligatoire ;
- base vectorielle obligatoire ;
- fusion automatique ;
- contournement de quotas ;
- scraping interdit ;
- conversation libre infinie entre agents.

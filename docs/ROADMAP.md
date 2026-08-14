# Feuille de route

## V0.1 — socle

- [x] dépôt et règles permanentes ;
- [x] CLI minimale ;
- [x] catalogue multi-fournisseurs ;
- [x] commande `doctor` ;
- [x] configuration locale avec API désactivée ;
- [x] détecter le dépôt Git et ses commandes de test ;
- [x] créer une mission persistante ;
- [x] créer un worktree sécurisé ;
- [x] console de contrôle Matrix.

## V0.1.5 — recherche approfondie

- [x] analyser les principales IA de code et leurs rôles ;
- [x] étudier les agents de code ouverts ;
- [x] analyser les concurrents directs : Shep, Mozzie, Agetor, Agent of Empires, Claude Squad, Squad, The Pair, Mission Control, OpenHands et Agent Orchestrator ;
- [x] étudier Aider, OpenCode, mini-SWE-agent, Spec Kit, Repomix, Serena, Beads, Pochi, Tabby et Gitleaks ;
- [x] comparer ACP, MCP, A2A, JSON/JSONL, tmux et SQLite ;
- [x] définir l'architecture Pi 5 control-plane-only ;
- [x] exclure tout modèle local obligatoire du MVP ;
- [x] définir la mémoire Git + SQLite + JSONL + artefacts ;
- [x] définir le pipeline multi-agent déterministe ;
- [x] définir le graphe de tâches et la reprise ;
- [x] définir les receipts de validation ;
- [x] créer un protocole de benchmark par dépôt et rôle ;
- [x] créer un catalogue machine-lisible de veille ;
- [x] distinguer outils locaux, agents et moteurs d'inférence différés ;
- [ ] automatiser la collecte de métadonnées de veille ;
- [ ] générer un rapport matériel réel du Pi 5 après installation.

## V0.2 — état fiable et contexte

- [ ] remplacer le stockage JSON minimal par SQLite en WAL ;
- [ ] migrations de schéma ;
- [ ] journal d'événements JSONL append-only ;
- [ ] leases et idempotency keys ;
- [ ] réconciliation après redémarrage ;
- [ ] checkpoints de mission ;
- [ ] constructeur de contexte Git ciblé ;
- [ ] support hiérarchique de `AGENTS.md` ;
- [ ] recherche ripgrep ;
- [ ] scan Gitleaks avant envoi distant ;
- [ ] manifeste de contexte avec hashes et raisons ;
- [ ] budget de tokens ;
- [ ] Repomix optionnel ;
- [ ] index Tree-sitter/symboles optionnel ;
- [ ] sauvegarde Restic et test de restauration.

## V0.3 — exécution agent réelle

- [ ] runner de groupes de processus ;
- [ ] timeout et arrêt des descendants ;
- [ ] adaptateur Generic CLI ;
- [ ] adaptateur Codex CLI ;
- [ ] adaptateur Mistral Vibe ;
- [ ] adaptateur Claude Code ;
- [ ] adaptateur Gemini CLI ;
- [ ] sorties JSON/JSONL normalisées ;
- [ ] sessions interactives uniquement si nécessaires ;
- [ ] transport ACP lorsqu'il est stable et disponible ;
- [ ] capture des versions, modèles, usages et coûts ;
- [ ] archivage propre des worktrees.

## V0.4 — sécurité et qualité

- [ ] politiques de permissions par action ;
- [ ] bubblewrap sur Linux ;
- [ ] Podman optionnel ;
- [ ] HOME et environnement temporaires ;
- [ ] réseau désactivé par défaut dans les sandboxes ;
- [ ] validation format/lint/typecheck/test/build ;
- [ ] vérification des fichiers autorisés ;
- [ ] reviewer indépendant en lecture seule ;
- [ ] budgets de retries ;
- [ ] findings structurés et preuves ;
- [ ] receipt de fin de mission ;
- [ ] aucune fusion automatique sur branche protégée.

## V0.5 — orchestration multi-agent

- [ ] DAG de missions avec détection de cycles ;
- [ ] claim/ack/complete/requeue atomiques ;
- [ ] dépendances et lancement des tâches débloquées ;
- [ ] détection des chevauchements de fichiers/symboles ;
- [ ] branches empilées pour sous-missions ;
- [ ] rôles planner/builder/reviewer/researcher ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] audit croisé entre fournisseurs ;
- [ ] comparaison de plusieurs plans ;
- [ ] arrêt d'urgence ;
- [ ] reprise automatique après interruption.

## V0.6 — interfaces

- [ ] console Matrix interactive complète ;
- [ ] vue multi-projets ;
- [ ] questions et approbations dans la TUI ;
- [ ] diff et logs ;
- [ ] tableau de bord web local facultatif ;
- [ ] interface mobile via VPN/Tailscale ;
- [ ] notifications ;
- [ ] API locale documentée ;
- [ ] serveur MCP Super IA en lecture seule.

## V0.7 — écosystème large

- [ ] Qwen Code ;
- [ ] GitHub Copilot CLI ;
- [ ] OpenCode, Aider et mini-SWE-agent comme backends ;
- [ ] Agent of Empires/OpenHands comme workers externes optionnels ;
- [ ] web assisté : DeepSeek, Le Chat et autres interfaces autorisées ;
- [ ] profils navigateur par fournisseur ;
- [ ] import et validation des patches web ;
- [ ] workers distants ;
- [ ] A2A ou protocole worker lorsque nécessaire.

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

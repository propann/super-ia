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

## V0.1.5 — recherche et architecture

- [x] analyser les principales IA de code et leurs rôles ;
- [x] étudier Aider, OpenCode, mini-SWE-agent, OpenHands, Spec Kit, Repomix, Pochi et Tabby ;
- [x] définir l'architecture locale sur Raspberry Pi 5 ;
- [x] définir la mémoire Git + SQLite + artefacts ;
- [x] définir le pipeline multi-agent déterministe ;
- [x] créer un protocole de benchmark par dépôt et par rôle ;
- [x] construire un registre séparé des outils locaux et moteurs d'inférence ;
- [x] détecter Ollama, llama.cpp, Repomix, Aider, mini-SWE-agent, OpenCode, sandboxes et sauvegardes ;
- [ ] générer un rapport de capacité détaillé du Pi 5.

## V0.2 — première mission réelle

- [ ] constructeur de contexte Git ciblé ;
- [ ] manifeste de contexte et scan de secrets ;
- [ ] journal d'événements JSONL et checkpoints ;
- [ ] adaptateur Codex CLI ;
- [ ] adaptateur Mistral Vibe ;
- [ ] exécution non interactive contrôlée ;
- [ ] capture des sorties, diffs et coûts ;
- [ ] validation TypeScript, tests et build ;
- [ ] suppression et archivage propres des worktrees.

## V0.3 — écosystème large

- [ ] Claude Code ;
- [ ] Qwen Code ;
- [ ] Gemini CLI ;
- [ ] GitHub Copilot ;
- [ ] OpenCode, Aider et mini-SWE-agent ;
- [ ] Ollama et llama.cpp pour fonctions locales légères ;
- [ ] backend OpenHands / ACP optionnel ;
- [ ] modèle local ou serveur personnel.

## V0.4 — web assisté

- [ ] profils navigateur par fournisseur ;
- [ ] générateur de paquet de contexte ;
- [ ] expurgation des secrets ;
- [ ] copie, ouverture et import de réponse ;
- [ ] validation des patches importés.

## V0.5 — orchestration

- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] missions parallèles sans fichiers concurrents ;
- [ ] relecture croisée ;
- [ ] reprise automatique après interruption ;
- [ ] console Matrix interactive complète ;
- [ ] tableau de bord local web ;
- [ ] benchmarks et métriques de qualité par fournisseur.

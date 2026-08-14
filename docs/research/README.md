# Base de recherche Super IA

Dernière revue : 14 août 2026.

Cette section rassemble les recherches qui doivent guider la construction de Super IA. Elle ne cherche pas à désigner une IA « meilleure que toutes les autres ». Elle sépare quatre choses souvent mélangées :

1. **le modèle** : le cerveau qui raisonne et produit du texte ou du code ;
2. **l'agent de code** : l'outil qui lit Git, modifie des fichiers et exécute des commandes ;
3. **l'orchestrateur** : le moteur déterministe qui découpe, distribue et reprend les missions ;
4. **la mémoire** : les artefacts persistants permettant de reprendre un projet sans repartir de zéro.

## Documents

- [Rôles des IA et modèles](AI_ROLES_MATRIX.md)
- [Étude des agents et outils existants](AGENT_TOOLING_SURVEY.md)
- [Architecture locale sur Raspberry Pi 5](PI5_LOCAL_FIRST_ARCHITECTURE.md)
- [Git, mémoire et sauvegarde de contexte](GIT_CONTEXT_MEMORY.md)
- [Architecture multi-agent retenue](MULTI_AGENT_DESIGN.md)
- [Protocole de benchmark](BENCHMARK_PROTOCOL.md)

## Méthode

Les choix sont fondés en priorité sur :

- les documentations officielles ;
- les dépôts sources actifs ;
- les capacités réellement automatisables ;
- la compatibilité ARM64 et petite machine ;
- la possibilité de contrôler les coûts ;
- la capacité à reprendre une mission après interruption ;
- la sécurité des écritures et commandes.

Les performances des modèles évoluent trop vite pour graver un classement définitif. Super IA doit donc conserver une **matrice initiale de rôles**, puis la corriger avec ses propres mesures sur les mêmes dépôts, les mêmes commits et les mêmes tests.

## Projets étudiés en priorité

- OpenAI Codex CLI
- Anthropic Claude Code
- Mistral Vibe Code
- Google Gemini CLI
- Qwen Code
- Aider
- OpenCode
- mini-SWE-agent
- OpenHands Agent Canvas
- GitHub Spec Kit
- Repomix
- Pochi
- Tabby
- llama.cpp
- Ollama
- LocalAI

## Décision générale

Super IA sera **Git-native, local-first, multi-fournisseurs et orienté preuves**.

Le dépôt complet reste local. Les IA ne reçoivent pas automatiquement tout le dépôt : elles reçoivent un paquet de contexte ciblé, versionné et reproductible. Chaque modification doit être associée à un commit de départ, un worktree, des tests, un journal d'événements et un résultat structuré.

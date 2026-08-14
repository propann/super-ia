# Base de recherche Super IA

Dernière revue : 14 août 2026.

Cette section rassemble les recherches qui guident la construction de Super IA. Elle sépare six éléments souvent mélangés :

1. **le modèle** : le cerveau qui produit du texte ou du code ;
2. **l'agent de code** : l'outil qui lit Git, modifie et exécute ;
3. **le transport** : ACP, JSON, JSONL, terminal ou web assisté ;
4. **l'orchestrateur** : la machine à états qui distribue et reprend ;
5. **la mémoire** : les artefacts persistants indépendants du fournisseur ;
6. **le plan de contrôle** : Git, permissions, coûts, tests, audit et interface.

## Décision matérielle

Le Raspberry Pi 5 est uniquement le **plan de contrôle permanent** dans le MVP. Aucun modèle local n'est nécessaire ou installé par défaut. Un Pi 4/5 pourra devenir plus tard un laboratoire séparé si un benchmark prouve l'utilité d'une fonction locale.

## Documents

### Décisions et architecture

- [Architecture de référence](REFERENCE_ARCHITECTURE.md)
- [Architecture locale sur Raspberry Pi 5](PI5_LOCAL_FIRST_ARCHITECTURE.md)
- [Git, mémoire et sauvegarde de contexte](GIT_CONTEXT_MEMORY.md)
- [Architecture multi-agent retenue](MULTI_AGENT_DESIGN.md)
- [Protocoles, runtimes et interopérabilité](PROTOCOLS_RUNTIME_AND_INTEROP.md)

### Marché, agents et modèles

- [Paysage concurrentiel 2026](COMPETITOR_LANDSCAPE_2026.md)
- [Rôles des IA et modèles](AI_ROLES_MATRIX.md)
- [Étude des agents et outils existants](AGENT_TOOLING_SURVEY.md)
- [Catalogue machine-lisible](RESEARCH_CATALOG.json)

### Mesure

- [Protocole de benchmark](BENCHMARK_PROTOCOL.md)

## Méthode

Les choix sont fondés en priorité sur :

- documentations officielles ;
- dépôts sources actifs ;
- architecture et code lorsqu'ils sont documentés ;
- formats de sortie et reprise réellement automatisables ;
- compatibilité Linux ARM64 ;
- fonctionnement headless ;
- contrôle des coûts ;
- sécurité des commandes ;
- persistance après interruption ;
- licence ;
- capacité à tester les affirmations.

Une fonctionnalité annoncée dans un README est classée comme **surface déclarée** tant qu'elle n'a pas été reproduite. Les benchmarks publiés par un projet ne deviennent pas automatiquement une vérité de routage.

## Concurrents directs suivis

### Orchestrateurs SDLC

- Shep
- Mozzie
- Agetor
- Agent Orchestrator

### Gestionnaires de sessions

- Agent of Empires
- Claude Squad
- Agent Deck
- amux

### Plans de contrôle

- Mission Control
- OpenHands Agent Canvas
- ADHDev

### Collaboration spécialisée

- Squad
- The Pair
- Beads

### Agents et workers

- Codex CLI
- Claude Code
- Mistral Vibe
- Gemini CLI
- Qwen Code
- Aider
- OpenCode
- mini-SWE-agent
- Cline
- Roo Code

### Contexte et sécurité

- Repomix
- Serena
- codebase-memory-mcp
- Tree-sitter
- Gitleaks
- Spec Kit
- AGENTS.md

### Protocoles

- ACP — Agent Client Protocol
- MCP — Model Context Protocol
- A2A — Agent2Agent

## Ce que l'étude a établi

1. Les worktrees sont devenus le mécanisme dominant d'isolation Git, mais ils ne sont pas une sandbox.
2. SQLite est largement utilisé pour état, événements, files et reprise locale.
3. Les meilleurs produits séparent mission, run et session terminal.
4. Les graphes de dépendances et les reprises après panne sont plus importants que le nombre d'agents affichés.
5. ACP devient le meilleur transport structuré lorsqu'il est disponible.
6. MCP est utile pour les outils et le contexte, pas comme moteur complet de workflow.
7. A2A est surtout pertinent pour des workers distants futurs.
8. Les agents doivent produire des preuves : diff, commandes, tests, audit et receipt.
9. Un contrôleur indépendant est utile, mais les tests déterministes restent prioritaires.
10. Le Pi peut orchestrer les CLI sans effectuer l'inférence du modèle.
11. Le routeur doit comparer le couple `agent + modèle + dépôt + rôle`, pas seulement la marque.
12. L'orchestration doit rester déterministe, bornée et reprenable.

## Politique de veille

Une revue mensuelle doit vérifier :

- nouvelles versions et licences ;
- activité des dépôts ;
- formats ACP/JSON/JSONL ;
- modes non interactifs ;
- permissions et sandbox ;
- reprise de session ;
- coûts et authentification ;
- support ARM64 ;
- incidents de sécurité ;
- migrations de stockage ;
- fonctions concurrentes à intégrer ou à éviter.

Le fichier `RESEARCH_CATALOG.json` servira plus tard à automatiser une partie de cette veille.

## Décision générale

Super IA sera **Git-native, Pi-first, headless, multi-fournisseurs, économique et orienté preuves**.

Le dépôt complet reste local. Les IA reçoivent un contexte ciblé, versionné, scanné et reproductible. Chaque modification est liée à un commit de départ, un worktree, une politique, des événements, des tests et un résultat structuré.

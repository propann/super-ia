# Super IA

**Un centre de commandement local, multi-fournisseurs et économique pour coder avec plusieurs IA sans dépendre d'une API payante.**

Super IA détecte les agents disponibles sur la machine, choisit la voie la plus adaptée, isole les modifications dans Git et garde l'utilisateur maître des coûts et de la fusion.

## Console Matrix

```bash
npm install
npm run build
node dist/index.js matrix
```

La console affiche en direct :

- le dépôt, la branche et l'état Git ;
- la stack et les commandes de validation détectées ;
- les fournisseurs IA présents ou utilisables en mode assisté ;
- les missions persistantes et leur statut ;
- le verrou API, le budget et les règles de fusion.

Contrôles : `R` rafraîchit, `Q` quitte. Pour une capture statique :

```bash
node dist/index.js matrix --once
```

## Architecture cible

```text
Raspberry Pi 5 + NVMe
├── dépôts Git complets
├── missions, mémoire et checkpoints
├── console Matrix
├── worktrees isolés
├── outils locaux légers
└── adaptateurs vers plusieurs IA
        ├── Codex
        ├── Mistral Vibe
        ├── Claude Code
        ├── Gemini CLI
        ├── Qwen Code
        ├── Aider / OpenCode / mini-SWE-agent
        ├── services web assistés
        └── Ollama / llama.cpp pour fonctions locales légères
```

Le Pi 5 est la tour de contrôle permanente. Le dépôt, l'index, les tests, la mémoire et les sauvegardes restent locaux. Les modèles lourds peuvent rester distants ou tourner sur une autre machine du réseau.

## Philosophie

```text
demande
   ↓
analyse du dépôt
   ↓
spécification et plan versionnés
   ↓
choix du fournisseur légitime le moins coûteux
   ↓
mission isolée dans un worktree
   ↓
code + tests + audit croisé
   ↓
checkpoint et rapport
   ↓
fusion humaine
```

## Commandes actuelles

```bash
superia matrix
superia doctor
superia providers
superia scan
superia init
superia task create "Ajouter une authentification"
superia task list
superia task show TASK-0001
superia worktree TASK-0001
```

`superia worktree TASK-0001 --dry-run` affiche la commande sans modifier Git.

## Voies prévues

- CLI officielles : Codex, Mistral Vibe, Claude Code, Gemini CLI et Qwen Code ;
- agents ouverts : OpenCode, Aider, mini-SWE-agent et autres backends légitimes ;
- services web assistés : DeepSeek, Le Chat et autres interfaces autorisées ;
- modèles locaux ou serveur personnel ;
- API compatibles uniquement en secours, avec budget strict.

Aucun faux compte, aucun contournement de quota, aucun scraping interdit.

## État actuel

- catalogue et diagnostic multi-fournisseurs ;
- configuration locale avec API désactivées par défaut ;
- scanner Git et détection des commandes de validation ;
- missions persistantes `TASK-XXXX` ;
- branches et worktrees isolés ;
- console de contrôle Matrix ;
- tests du flux `scan → mission → worktree` ;
- étude documentée des IA, agents, mémoire Git et architecture Raspberry Pi 5.

## Développement

```bash
npm install
npm test
npm run matrix
```

## Documentation

- [Vision](docs/PROJECT_VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Fournisseurs](docs/PROVIDERS.md)
- [Sécurité](docs/SECURITY.md)
- [Feuille de route](docs/ROADMAP.md)
- [Base de recherche](docs/research/README.md)
- [Rôles des IA](docs/research/AI_ROLES_MATRIX.md)
- [Agents et outils étudiés](docs/research/AGENT_TOOLING_SURVEY.md)
- [Architecture Raspberry Pi 5](docs/research/PI5_LOCAL_FIRST_ARCHITECTURE.md)
- [Git et mémoire de contexte](docs/research/GIT_CONTEXT_MEMORY.md)
- [Architecture multi-agent](docs/research/MULTI_AGENT_DESIGN.md)
- [Benchmark des fournisseurs](docs/research/BENCHMARK_PROTOCOL.md)

## Licence

MIT.

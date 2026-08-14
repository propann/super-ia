# Architecture locale sur Raspberry Pi 5

## Rôle du Pi 5

Le Raspberry Pi 5 n'a pas besoin d'être le modèle géant. Il devient le **cerveau de coordination permanent** :

- hébergement des dépôts Git complets ;
- stockage de la mémoire et des journaux ;
- création des missions et worktrees ;
- lancement des CLI d'agents distants ;
- exécution des tests légers ;
- planification et reprise après interruption ;
- console Matrix accessible en SSH ou navigateur ;
- sauvegardes et synchronisation GitHub.

Cette architecture fonctionne même si le modèle principal tourne chez OpenAI, Mistral, Anthropic, Google ou sur une autre machine du réseau.

## Architecture cible

```text
ordinateur / téléphone
        │ SSH ou interface web
        ▼
Raspberry Pi 5 + NVMe
├── superia daemon
├── console Matrix
├── SQLite + journal JSONL
├── dépôts Git miroirs
├── worktrees de missions
├── index de code
├── constructeur de contexte
├── expurgateur de secrets
├── file de tâches
├── lanceurs Codex / Vibe / Gemini / Qwen / Aider
└── moteur local léger Ollama ou llama.cpp
        │
        ├── IA distantes par CLI officielle
        ├── petite IA locale utilitaire
        └── autre machine puissante optionnelle sur le LAN
```

## Services minimaux

### Obligatoires

- Linux 64 bits ;
- Git ;
- Node.js ;
- SQLite ;
- ripgrep ;
- systemd ;
- stockage NVMe ;
- SSH.

### Recommandés

- `uv` / `pipx` pour isoler les agents Python ;
- `bwrap` ou Podman pour les sandboxes légères ;
- `restic` ou équivalent pour les sauvegardes ;
- `jq` pour inspecter les sorties JSON ;
- `tmux` uniquement comme outil humain, pas comme mémoire de mission.

### Optionnels

- Docker pour les projets qui l'exigent ;
- Ollama ;
- llama.cpp ;
- Repomix ;
- Aider ;
- mini-SWE-agent ;
- OpenCode.

## Outils locaux versus modèles locaux

Il faut distinguer deux choses.

### Outils locaux

Codex CLI, Claude Code, Mistral Vibe, Gemini CLI, Qwen Code, Aider et OpenCode peuvent tourner comme **programmes locaux** sur une petite machine tout en appelant un modèle distant. Leur charge principale est Git, le parsing, les commandes et l'interface. Le Pi 5 est adapté à ce rôle.

### Modèles locaux

L'inférence d'un LLM consomme beaucoup plus de mémoire et de calcul. Le Pi 5 doit commencer avec de petits modèles quantifiés pour :

- classifier une mission ;
- extraire des mots-clés ;
- résumer des logs ;
- produire un titre de commit ;
- sélectionner des fichiers candidats ;
- détecter des doublons ou anomalies simples ;
- compresser une conversation en mémoire de reprise.

Les modèles de code lourds ne doivent pas être considérés comme moteur principal du Pi. La documentation Mistral recommande pour son modèle Devstral 24B des configurations très supérieures ; cela confirme que ce type de modèle doit rester distant ou tourner sur une autre machine.

## Moteurs locaux

### Ollama

Avantages :

- paquet Linux ARM64 officiel ;
- installation et gestion des modèles simples ;
- API locale ;
- bon outil de découverte.

Usage recommandé : premier moteur local utilitaire.

### llama.cpp

Avantages :

- support Linux ARM64 ;
- contrôle fin des quantifications et paramètres ;
- serveur local léger ;
- excellente base pour mesurer précisément la mémoire et la vitesse.

Usage recommandé : moteur de production léger lorsque les modèles retenus sont connus.

### LocalAI

Avantages : API compatible et plusieurs backends. Limite : surface plus large et davantage de composants.

Usage recommandé : phase ultérieure, si plusieurs fonctions locales doivent être exposées derrière une passerelle commune.

## Stockage proposé

```text
/srv/superia/
├── repos/          # clones ou miroirs Git
├── worktrees/      # espaces temporaires par mission
├── state/          # SQLite, journaux et verrous
├── contexts/       # paquets de contexte versionnés
├── transcripts/    # sorties brutes des agents
├── artifacts/      # rapports, patches, benchmarks
├── models/         # modèles locaux optionnels
└── backups/        # snapshots avant transfert externe
```

Les modèles, caches et `node_modules` ne doivent pas être mélangés aux sauvegardes critiques.

## Processus systemd

Le MVP doit fonctionner sans Kubernetes ni Redis :

```text
superia.service          orchestrateur et API locale
superia-worker.service   exécuteur de missions
ollama.service           optionnel
superia-backup.timer     sauvegarde régulière
superia-health.timer     contrôle des dépôts et files de tâches
```

SQLite en mode WAL suffit pour une petite file de missions. Une base réseau ne sera ajoutée que si plusieurs machines écrivent réellement en parallèle.

## Sécurité

- utilisateur Linux dédié sans `sudo` ;
- chaque mission dans un worktree ;
- répertoires autorisés explicitement ;
- réseau désactivé par défaut pour les commandes de code ;
- secrets retirés des paquets de contexte ;
- fichiers `.env`, clés SSH et tokens exclus ;
- aucune commande destructive sans règle et approbation ;
- sauvegarde avant migration ou fusion importante.

## Configuration matérielle

### Pi 5 avec 8 Go

Adapté au coordinateur, à plusieurs CLI inactives, aux tests raisonnables et à un petit modèle local ponctuel. Limiter le nombre d'agents simultanés et éviter les gros builds parallèles.

### Pi 5 avec 16 Go

Plus confortable pour plusieurs worktrees, les index de gros dépôts, Docker et des modèles locaux quantifiés plus volumineux. Le CPU reste toutefois la limite principale de l'inférence.

## Décision

Le Pi 5 sera la **tour de contrôle**, pas la centrale nucléaire. Cette séparation permet un outil disponible 24 h/24, peu coûteux, sauvegardé et indépendant du poste de travail principal.

## Sources

- Ollama Linux ARM64 : https://github.com/ollama/ollama/blob/main/docs/linux.mdx
- llama.cpp ARM64 : https://github.com/ggml-org/llama.cpp
- Mistral Vibe hors ligne : https://docs.mistral.ai/vibe/code/cli/offline-models
- LocalAI : https://github.com/mudler/LocalAI

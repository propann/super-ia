# Super IA

**Centre de commandement local, multi-projets et multi-fournisseurs pour piloter des agents de développement avec contrôle des coûts, sécurité, reprise, suivi et preuves.**

Le Raspberry Pi 5 sert de tour de contrôle permanente. Les modèles restent chez leurs fournisseurs officiels ; aucun modèle IA local n'est requis.

## État vérifié — v0.14.0

La CI GitHub valide :

- Ubuntu 24.04 ;
- Node.js 22.23.2 et npm 10.9.8 ;
- compilation TypeScript réussie ;
- **59 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- scripts Pi et toolchain valides ;
- aucun téléchargement distant transmis directement à un shell ;
- dry-run non destructif des profils Core, Standard et Full ;
- aucune commande `sudo` cachée dans le paquet Pi.

Fonctions principales :

- SQLite WAL multi-projets ;
- missions, priorités, dépendances, blocages et suivi ;
- Git branches et worktrees ;
- contexte ciblé avec SHA-256 ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- Codex et Mistral Vibe ;
- Gitleaks et Bubblewrap obligatoires avant les agents réels ;
- contrôle des fichiers modifiés, chemins critiques et taille des diffs ;
- reviewer indépendant et structuré ;
- pipeline builder → validation → review → receipt ;
- checkpoints atomiques et reprise contrôlée ;
- corrections explicites, bornées et protégées contre les boucles ;
- receipts et sauvegardes vérifiables ;
- daemon, service systemd utilisateur et console Matrix ;
- profils d'installation complets sans modèle local ;
- Connection Matrix couvrant CLI, API, cloud, MCP, ACP, A2A, SSH, web et endpoints locaux facultatifs ;
- registre de connexions privé et références de secrets sans valeur ;
- roadmap machine-lisible contrôlée par la CI.

Voir [l'état vérifié](docs/STATUS.md).

## Préparer une machine complète

Afficher le plan sans rien modifier :

```bash
bash install/tools/prepare-machine.sh \
  --phase plan \
  --profile standard
```

Phase système explicite :

```bash
sudo bash install/tools/prepare-machine.sh \
  --phase system \
  --profile standard
```

Phase utilisateur sans root :

```bash
bash install/tools/prepare-machine.sh \
  --phase user \
  --profile standard
```

Installation du plan de contrôle :

```bash
bash install/tools/prepare-machine.sh --phase superia
```

Vérification :

```bash
bash install/tools/prepare-machine.sh \
  --phase verify \
  --profile standard
```

Profils :

```text
core      Codex, Vibe, Repomix, Gitleaks et socle
standard  + Gemini, Qwen, OpenCode, Aider, mini-SWE, GitHub CLI
full      + Claude Code, pre-commit et Ruff
```

Aucun profil n'installe Ollama, llama.cpp, LocalAI ou des poids de modèle.

Voir [Toolchain](docs/TOOLCHAIN.md).

## Matrice de connexions

```bash
superia connection init
superia connection dashboard
superia connection doctor
superia connection secret-backends
```

Transports disponibles :

- sessions CLI ;
- APIs officielles ;
- endpoints compatibles OpenAI ;
- identités cloud Azure, AWS et Google Cloud ;
- GitHub Models et Hugging Face ;
- MCP stdio/HTTP ;
- ACP ;
- A2A ;
- worker SSH ;
- transfert web assisté ;
- endpoints locaux expérimentaux désactivés.

Toutes les connexions sont désactivées par défaut. `~/.superia/connections.json` est privé en `0600` et ne contient que les noms des variables attendues, jamais leurs valeurs.

Voir [Connexions universelles](docs/CONNECTIONS.md) et [suivi de préparation](docs/MACHINE_TRACKER.json).

## Installation de développement

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
npm install
npm test
npm link
```

Node.js **22.5 ou supérieur** est requis.

## Flux recommandé

```bash
superia init
superia task create "Modifier le module d'authentification"

superia task update TASK-0001 \
  --priority high \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "tests réussis" \
  --accept "review indépendante approuvée"

superia worktree TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Le sens inverse est pris en charge : Vibe builder et Codex reviewer.

## Pipeline contrôlé

```text
builder
  ↓
Gitleaks + Bubblewrap
  ↓
change guard
  ↓
validations locales
  ↓
reviewer différent et read-only
  ↓
REVIEW.json
  ↓
receipt SHA-256
  ↓
approbation humaine
```

Le reviewer ne démarre pas si le builder, le périmètre Git ou les validations échouent.

### Reprise

```bash
superia pipeline status TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

Une étape terminée n'est pas relancée.

### Correction bornée

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --retry
```

Le retry exige une review `changes-requested`. La review précédente est transmise au builder par fichier et n'apparaît pas dans `argv`.

Chaque builder terminé consomme une tentative. Chaque patch reçoit une empreinte SHA-256. Un patch déjà vu arrête la boucle avant une nouvelle validation ou review.

Voir [Pipeline multi-agent](docs/PIPELINE.md).

## Barrières de sécurité

### Gitleaks

```text
Gitleaks absent  → agent refusé
finding          → agent refusé
scan propre      → préflight validé
```

### Bubblewrap

- HOME jetable ;
- système en lecture seule ;
- plan/review en lecture seule ;
- build limité au worktree ;
- réseau isolable ;
- dérogation explicite et journalisée.

### Change guard

Le garde refuse :

- un fichier hors périmètre ;
- `.env`, `.npmrc`, `.pypirc`, clés privées et `.git-credentials` ;
- plus de 50 fichiers modifiés ;
- plus de 1 000 000 octets effectifs.

Le volume compte aussi le contenu complet des fichiers non suivis.

### Secrets

Méthodes détectées sans lire les valeurs :

- variables temporaires de session ;
- trousseau `libsecret` ;
- fichier chiffré Age ;
- credentials systemd.

Les clés ne doivent apparaître ni dans Git, ni dans `connections.json`, ni dans les arguments de processus.

## Suivi des tâches

```bash
superia task list
superia task show TASK-0001
superia task board
superia task note TASK-0001 "Accès au Pi nécessaire."
superia task update TASK-0001 --status blocked --priority critical
superia task update TASK-0002 --depends TASK-0001
```

## Contrôle global

```bash
superia control status --json
superia project add /chemin/du/depot
superia project list
superia run list
superia events --limit 100
superia daemon --once
superia matrix
```

## Sauvegardes et preuves

```bash
superia backup create
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS

superia receipt create <RUN-ID>
superia receipt verify ~/.superia/runs/<RUN-ID>/RECEIPT.json
```

L'approbation humaine reste obligatoire. Super IA ne fusionne jamais automatiquement.

## Ce qui attend le Pi ou les comptes

- installation réelle du profil Standard ;
- autotest Bubblewrap sur le noyau du Pi ;
- choix du coffre de secrets ;
- authentification interactive des CLI retenues ;
- test borné des APIs activées ;
- handshakes MCP, ACP, A2A et SSH ;
- reprise après coupure et restauration ;
- pipeline réel Codex/Vibe ;
- benchmark coût/qualité.

## Documentation

- [État vérifié](docs/STATUS.md)
- [Toolchain](docs/TOOLCHAIN.md)
- [Connexions universelles](docs/CONNECTIONS.md)
- [Suivi machine](docs/MACHINE_TRACKER.json)
- [Feuille de route](docs/ROADMAP.md)
- [Registre projet](docs/ROADMAP_TRACKER.json)
- [Suivi des tâches](docs/TASK_TRACKER.md)
- [Pipeline multi-agent](docs/PIPELINE.md)
- [Plan de contrôle](docs/CONTROL_PLANE.md)
- [Sandbox Bubblewrap](docs/SANDBOX.md)
- [Contrôle des modifications](docs/CHANGE_GUARD.md)
- [Receipts](docs/RECEIPTS.md)
- [Installation Pi](docs/PI_INSTALL.md)
- [Sécurité](docs/SECURITY.md)

## Licence

MIT.

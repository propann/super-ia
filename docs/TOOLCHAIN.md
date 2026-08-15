# Toolchain Super IA

## Objectif

Préparer une machine de contrôle complète sans installer de modèle IA local, sans enregistrer de clé et sans dépendre de Docker.

La préparation est séparée en deux niveaux :

1. dépendances système Debian/Ubuntu, avec autorisation administrative explicite ;
2. outils utilisateur installés dans `~/.local`, sans root.

Aucun script ne lance `sudo` lui-même.

## Profils

### Core

Pour le plan de contrôle et les deux agents déjà intégrés :

- Git, Node.js 22, npm et Python ;
- uv ;
- Codex CLI ;
- Mistral Vibe ;
- Repomix ;
- Gitleaks ;
- Bubblewrap ;
- Restic ;
- jq, SQLite et ripgrep.

### Standard

Profil recommandé pour le Pi de contrôle :

- tout le profil Core ;
- Gemini CLI ;
- Qwen Code ;
- OpenCode ;
- Aider ;
- mini-SWE-agent ;
- GitHub CLI ;
- tmux et ShellCheck.

### Full

Laboratoire complet :

- tout le profil Standard ;
- Claude Code ;
- pre-commit ;
- Ruff.

Ce profil n'installe toujours ni Ollama, ni llama.cpp, ni LocalAI, ni poids de modèle.

## Afficher le plan

```bash
bash install/tools/prepare-machine.sh \
  --phase plan \
  --profile standard
```

Le plan affiche les commandes exactes sans modifier la machine.

## Phase système

```bash
sudo bash install/tools/prepare-machine.sh \
  --phase system \
  --profile standard
```

Le mot de passe administrateur n'est demandé que par la commande `sudo` tapée volontairement par l'utilisateur. Le script système vérifie qu'il est déjà exécuté en root et ne tente aucune élévation.

Conteneurs rootless facultatifs :

```bash
sudo bash install/tools/prepare-machine.sh \
  --phase system \
  --profile full \
  --with-containers
```

Cela ajoute Podman, Buildah et Skopeo. Docker n'est pas requis.

## Phase utilisateur

```bash
bash install/tools/prepare-machine.sh \
  --phase user \
  --profile standard
```

Installations :

- Node.js dans `~/.local/share/superia-toolchain/node` ;
- commandes dans `~/.local/bin` ;
- paquets npm avec préfixe utilisateur ;
- outils Python dans des environnements isolés gérés par uv.

Node.js est téléchargé depuis la distribution officielle v22 et vérifié avec `SHASUMS256.txt`.

Gitleaks est téléchargé pour `linux_x64` ou `linux_arm64` et vérifié avec le fichier de checksums de la release.

Aucun téléchargement n'est transmis directement à un shell.

## Installation Super IA

```bash
bash install/tools/prepare-machine.sh --phase superia
```

Cette phase :

- compile et teste Super IA ;
- installe la commande utilisateur ;
- initialise SQLite ;
- crée le service systemd utilisateur ;
- crée et vérifie une sauvegarde ;
- initialise `connections.json` ;
- affiche la Connection Matrix.

## Vérification

```bash
bash install/tools/prepare-machine.sh \
  --phase verify \
  --profile standard
```

Ou séparément :

```bash
bash install/tools/verify-toolchain.sh --profile standard
superia doctor
superia connection doctor
superia connection secret-backends
superia security sandbox-check --json
superia control status --json
```

Rapport JSON :

```bash
bash install/tools/verify-toolchain.sh \
  --profile standard \
  --json \
  --output ~/.superia/toolchain-status.json
```

Le rapport est écrit avec des permissions `0600`.

## Dry-run complet

```bash
bash install/tools/system-packages-debian.sh \
  --profile full \
  --with-containers \
  --dry-run

bash install/tools/bootstrap-user-tools.sh \
  --profile full \
  --dry-run \
  --no-modify-path
```

Le dry-run est testé par la CI dans un HOME temporaire vide.

## Authentification

Les installations ne réalisent aucune authentification.

Après installation, chaque CLI est connectée séparément avec sa méthode officielle. Les clés restent hors Git et hors `connections.json`.

```bash
superia connection enable codex-cli
superia connection enable mistral-vibe
superia connection enable gemini-cli
superia connection doctor
```

## Mise à jour

```bash
bash install/tools/bootstrap-user-tools.sh \
  --profile standard \
  --force
```

L'option `--force` met à jour les outils du profil, mais ne change ni les connexions ni les secrets.

## Fichiers

```text
install/tools/
├── prepare-machine.sh
├── system-packages-debian.sh
├── bootstrap-user-tools.sh
├── verify-toolchain.sh
└── toolchain-manifest.json
```

`toolchain-manifest.json` est la source machine-lisible des profils, canaux d'installation et méthodes de vérification.

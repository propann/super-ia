# Super IA

Plateforme personnelle d'orchestration IA déployable sur Raspberry Pi 5 et
extensible vers d'autres machines. Le Pi sert de plan de contrôle léger : il
coordonne les outils, les projets, les CLI et les sessions web sans imposer un
modèle local ni une API payante.

## État

Cette branche fournit :

- PostgreSQL, Qdrant, LiteLLM et n8n avec Docker Compose ;
- un cockpit local sur le port `8080` ;
- un registre de connecteurs API, OAuth, CLI, navigateur et humain ;
- des profils Chromium séparés pour ChatGPT, Claude, Gemini, DeepSeek, Mistral et Suno ;
- des services liés à `127.0.0.1` ;
- aucune clé API, aucun cookie et aucune donnée privée dans Git.

## Installation sur le Pi 5

```bash
cd /opt/azoth-ai/projects/super-ia
make init
make validate
make pull
make up
make ps
make connectors
```

Le tableau de bord est disponible sur `http://127.0.0.1:8080` via tunnel SSH.

## Sessions web isolées

Depuis une session graphique locale :

```bash
make browser-check
make browser NAME=chatgpt
make browser NAME=claude
make browser NAME=gemini
```

Les profils restent dans `~/.local/share/super-ia/browser-profiles/`. Les cookies
ne sont jamais exportés. MFA, CAPTCHA, paiement, publication et suppression
restent des actions humaines.

## Organisation

```text
compose/       services Docker
config/        configuration non secrète des passerelles et profils
docs/          architecture et décisions
scripts/       bootstrap, validations et lanceurs locaux
dashboard/     centre de contrôle web léger
```

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/CONNECTORS.md`](docs/CONNECTORS.md) et
[`docs/BROWSER_PROFILES.md`](docs/BROWSER_PROFILES.md).

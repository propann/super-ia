# Super IA

Plan de contrôle personnel pour Raspberry Pi 5 : services Docker, connexions
API/OAuth/CLI, navigateurs web isolés, projets GitHub et missions d'agents.

## Ce que cette branche apporte

- PostgreSQL, Qdrant, LiteLLM et n8n avec Docker Compose ;
- un cockpit local sur le port `8080` ;
- un navigateur Chromium persistant par fournisseur : ChatGPT, Claude, Gemini,
  DeepSeek, Grok, Mistral et Suno ;
- une liste de dépôts synchronisable avec `gh` ;
- des rôles d'agents et une file de missions locale ;
- un journal d'activité qui affiche les commandes allowlistées ;
- aucune clé API, aucun cookie et aucune donnée privée dans Git.

## Installation sur le Pi

```bash
cd /opt/azoth-ai/projects/super-ia
make init
make validate
make up
make browser-up
make projects-sync
make ps
```

Si GitHub n'est pas encore connecté :

```bash
gh auth login
make projects-sync
```

## Accès au cockpit et aux navigateurs

Les ports restent sur `127.0.0.1`. Depuis une autre machine, ouvre un tunnel
SSH avec les ports dont tu as besoin, puis visite `http://127.0.0.1:18080` :

```bash
ssh -N \
  -L 18080:127.0.0.1:8080 \
  -L 3011:127.0.0.1:3011 \
  -L 3012:127.0.0.1:3012 \
  -L 3013:127.0.0.1:3013 \
  azoth@192.168.2.34
```

Voir [`docs/REMOTE_BROWSERS.md`](docs/REMOTE_BROWSERS.md) pour le détail des
profils, du login manuel et des garde-fous.

## Organisation

```text
compose/       services Docker
config/        registres non secrets
data/          catalogue local, file et journal ignorés par Git
docs/          architecture et procédures
scripts/       bootstrap, synchronisation et runner allowlisté
dashboard/     cockpit web léger
```

Le Pi reste un plan de contrôle : on n'installe pas un gros modèle local par
défaut. Les modèles web passent par leurs profils Chromium ; les API restent
optionnelles et séparées de l'abonnement ChatGPT navigateur.

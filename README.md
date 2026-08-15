# Super IA

Fondation d'une plateforme personnelle d'orchestration IA, déployable sur le
Raspberry Pi 5 et extensible vers d'autres machines.

## État

Cette branche prépare la première fondation Docker : PostgreSQL, Qdrant,
LiteLLM, n8n et un centre de contrôle local. Les services restent liés à
`127.0.0.1` ; aucune clé API ni donnée privée n'est stockée dans le dépôt.

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
Il regroupe n8n, Qdrant, LiteLLM, ChatGPT web et les commandes CLI. ChatGPT
web est traité comme un connecteur navigateur/humain ; aucune clé OpenAI API
n'est requise ni stockée.

## Organisation

```text
compose/       services Docker
config/        configuration non secrète des passerelles
docs/          architecture et décisions
scripts/       bootstrap et validations
dashboard/     centre de contrôle web léger
```

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) et
[`docs/CONNECTORS.md`](docs/CONNECTORS.md) pour le routage API/OAuth/CLI/
navigateur/humain.

# Super IA

Fondation d'une plateforme personnelle d'orchestration IA, déployable sur le
Raspberry Pi 5 et extensible vers d'autres machines.

## État

Cette branche prépare la première fondation Docker : PostgreSQL, Qdrant,
LiteLLM et n8n. Les services restent liés à `127.0.0.1` ; aucune clé API ni
donnée privée n'est stockée dans le dépôt.

## Installation sur le Pi 5

```bash
cd /opt/azoth-ai/projects/super-ia
make init
make validate
make pull
make up
make ps
```

Après `make init`, renseigne les clés de fournisseurs dans `.env` si tu veux
appeler OpenAI, Gemini, Groq ou OpenRouter. Ne committe jamais ce fichier.

## Organisation

```text
compose/       services Docker
config/        configuration non secrète des passerelles
docs/          architecture et décisions
scripts/       bootstrap et validations
```

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour le rôle de chaque
service et la feuille de route.


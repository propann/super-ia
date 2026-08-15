# Architecture initiale

## Rôle du Raspberry Pi 5

Le Pi est le plan de contrôle : il orchestre les workflows, les CLI, les
connecteurs navigateur et la mémoire. Aucun gros modèle local n'est installé à
cette étape ; les 8 Go de RAM restent disponibles pour l'automatisation et les
services applicatifs.

## Services

- PostgreSQL : données persistantes et futur historique des agents.
- Qdrant : mémoire vectorielle locale.
- LiteLLM : point d'entrée unique pour OpenAI, Gemini, Groq, OpenRouter et
  d'autres fournisseurs compatibles.
- n8n : automatisations, déclencheurs, appels d'outils et workflows.
- Dashboard : porte d'entrée unique vers les services et le registre des
  connecteurs.
- Workers CLI/navigateur : modules optionnels, activés seulement lorsqu'une
  tâche le demande.

Les services écoutent uniquement sur `127.0.0.1`. L'accès distant passera plus
tard par SSH, un reverse proxy authentifié ou un tunnel privé ; aucun port IA
n'est publié directement sur le réseau avant la phase sécurité.

## Principes

1. Chaque service est classé dans `config/connectors.json`.
2. Le routeur choisit API, OAuth, CLI, navigateur ou humain.
3. Les clés API restent dans `.env`, ignoré par Git.
4. Les profils navigateur restent locaux et les cookies ne sortent jamais.
5. Les CLI sont allowlistées ; pas de `bash -c` arbitraire.
6. Les volumes Docker portent des noms stables pour survivre aux mises à jour.
7. Toute évolution importante passe par une branche et une pull request.

## Démarrage

```bash
make init
make validate
make pull
make up
make ps
```

Les interfaces locales sont ensuite :

- n8n : `http://127.0.0.1:5678`
- LiteLLM : `http://127.0.0.1:4000`
- Qdrant : `http://127.0.0.1:6333`
- Dashboard : `http://127.0.0.1:8080`

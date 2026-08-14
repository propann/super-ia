# Connexions universelles et sécurité

## Principe

Super IA sépare trois choses :

1. l'installation d'un outil ;
2. la description d'une connexion ;
3. le secret ou la session qui autorise réellement cette connexion.

Le fichier de connexion ne contient jamais de clé.

```text
~/.superia/connections.json
```

Permissions : `0600`.

Il stocke uniquement :

- identifiant et libellé ;
- type de transport ;
- commande ou URL ;
- nom des variables d'environnement attendues ;
- état activé/désactivé ;
- notes et version de protocole.

## Initialiser

```bash
superia connection init
```

Cela crée également :

```text
~/.superia/secrets/providers.env.example
```

Ce fichier est un modèle vide. Il ne doit jamais être rempli puis ajouté à Git.

## Connection Matrix

```bash
superia connection dashboard
```

États :

```text
disabled         connexion volontairement inactive
configured       CLI installée, session à confirmer lors de l'usage
ready            métadonnées et références de secrets présentes
needs-auth       variable ou authentification absente
missing-command  exécutable absent
manual           transfert humain requis
invalid          configuration refusée
```

La commande ne contacte aucun serveur.

## Transports couverts

### Sessions CLI

- OpenAI Codex CLI ;
- Anthropic Claude Code ;
- Mistral Vibe ;
- Google Gemini CLI ;
- Qwen Code ;
- OpenCode ;
- Aider ;
- mini-SWE-agent.

### APIs officielles

- OpenAI ;
- Anthropic ;
- Mistral ;
- Gemini.

### Endpoints compatibles OpenAI

- OpenRouter ;
- DeepSeek ;
- Groq ;
- endpoint personnalisé.

### Protocoles

- MCP stdio ;
- MCP HTTP ;
- ACP stdio ;
- A2A HTTP.

### Machines distantes

- worker SSH ;
- futur worker A2A ;
- CLI distante sans copie de la clé privée dans Super IA.

### Interfaces web assistées

- ChatGPT ;
- Claude ;
- Mistral Le Chat ;
- DeepSeek.

Le contexte est préparé et expurgé, mais le transfert reste manuel. Super IA ne pilote pas le navigateur et ne tente pas de contourner les limitations d'un service.

### Endpoints locaux expérimentaux

- Ollama ;
- LM Studio ;
- LocalAI.

Ils sont présents dans le catalogue pour la compatibilité future, mais désactivés. Aucun modèle n'est installé sur le Pi.

## Activer une connexion

```bash
superia connection enable codex-cli
superia connection enable openai-api
superia connection doctor
```

Désactiver :

```bash
superia connection disable openai-api
```

L'activation n'autorise pas automatiquement la dépense. Les politiques de budget et les adaptateurs restent des barrières séparées.

## Ajouter un endpoint personnalisé

Exemple compatible OpenAI :

```bash
superia connection add mon-endpoint \
  --kind openai-compatible \
  --label "Endpoint équipe" \
  --base-url "https://ia.exemple.invalid/v1" \
  --auth environment \
  --secret-env TEAM_AI_API_KEY \
  --note "Budget et modèle définis par le projet"

superia connection enable mon-endpoint
```

La commande enregistre `TEAM_AI_API_KEY`, jamais sa valeur.

## Ajouter un serveur MCP stdio

```bash
superia connection add fichiers-mcp \
  --kind mcp-stdio \
  --label "MCP fichiers contrôlés" \
  --command mon-serveur-mcp \
  --auth none
```

L'exécution réelle devra ensuite passer par un adaptateur et une politique d'outils. L'enregistrement seul ne lance rien.

## Ajouter un serveur MCP HTTP

```bash
superia connection add outils-mcp-http \
  --kind mcp-http \
  --label "MCP distant" \
  --base-url "https://mcp.exemple.invalid" \
  --auth environment \
  --secret-env MCP_ACCESS_TOKEN
```

## Ajouter un agent ACP

```bash
superia connection add agent-acp \
  --kind acp-stdio \
  --label "Agent ACP" \
  --command agent-acp \
  --auth none
```

## Ajouter un worker A2A

```bash
superia connection add worker-a2a \
  --kind a2a-http \
  --label "Worker de calcul" \
  --base-url "https://worker.exemple.invalid" \
  --auth environment \
  --secret-env A2A_WORKER_TOKEN
```

## Ajouter un worker SSH

```bash
superia connection add laptop-worker \
  --kind ssh-cli \
  --label "Laptop worker" \
  --command ssh \
  --host "worker@192.168.2.20" \
  --auth session
```

Les clés SSH restent dans `~/.ssh` ou dans `ssh-agent`. Elles ne sont pas copiées dans `~/.superia`.

## Coffres de secrets

```bash
superia connection secret-backends
```

Méthodes proposées :

### Variables de session temporaires

Pour un test ponctuel. La variable disparaît avec le terminal.

```bash
read -rsp "Clé : " OPENAI_API_KEY
export OPENAI_API_KEY
printf '\n'
```

Cette méthode évite d'écrire la clé dans la commande et donc dans l'historique.

### Libsecret

Approprié à un poste Linux avec trousseau utilisateur. Super IA détecte `secret-tool`, mais ne lit pas automatiquement le coffre.

### Fichier Age chiffré

Approprié à un Pi headless ou à une copie hors machine. L'identité Age doit être séparée de l'archive chiffrée et protégée.

### Credentials systemd

Appropriés au daemon ou à un futur worker systemd. Les secrets sont fournis comme fichiers de credentials plutôt que comme texte dans l'unité.

## Règles

- aucune valeur de clé dans Git ;
- aucune valeur de clé dans `connections.json` ;
- aucun secret dans les arguments de processus ;
- aucune connexion activée par défaut ;
- aucun test réseau pendant le diagnostic ;
- pas de navigateur automatisé ;
- pas de fusion automatique ;
- les APIs restent soumises au budget explicite ;
- un endpoint local n'implique jamais l'installation d'un modèle.

## Commandes

```bash
superia connection catalog
superia connection init
superia connection dashboard
superia connection list
superia connection doctor
superia connection secret-backends
superia connection secrets-template
superia connection enable <ID>
superia connection disable <ID>
superia connection remove <ID>
```

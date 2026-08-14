# Connexions universelles et sécurité

## Principe

Super IA sépare trois choses :

1. l'installation d'un outil ;
2. la description d'une connexion ;
3. le secret, la session ou l'identité cloud qui autorise réellement cette connexion.

Le fichier de connexion ne contient jamais de clé :

```text
~/.superia/connections.json
```

Il est créé avec les permissions `0600` et stocke uniquement :

- identifiant et libellé ;
- type de transport ;
- commande, hôte ou URL ;
- noms des variables d'environnement attendues ;
- état activé ou désactivé ;
- notes et version de protocole.

## Initialisation et migration

```bash
superia connection init
```

Cette commande crée également un modèle vide :

```text
~/.superia/secrets/providers.env.example
```

Une nouvelle exécution ajoute les connexions apparues dans une version plus récente sans écraser les connexions personnalisées ni leur état activé/désactivé.

## Connection Matrix

```bash
superia connection dashboard
superia connection doctor
```

États :

```text
disabled         connexion volontairement inactive
configured       CLI ou identité déclarée, session à confirmer
ready            métadonnées et références nécessaires présentes
needs-auth       variable ou authentification absente
missing-command  exécutable absent
manual           transfert humain requis
invalid          configuration refusée
```

Le diagnostic ne contacte aucun serveur, ne lance aucun agent et ne retourne aucune valeur de secret.

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

### Identités cloud

- Azure OpenAI / Microsoft Foundry ;
- AWS Bedrock ;
- Google Vertex AI.

Les identités cloud sont décrites sans copier les profils locaux : rôle ou profil AWS, Application Default Credentials Google, identité Microsoft Entra ou clé Azure gérée hors dépôt.

### Passerelles et endpoints compatibles OpenAI

- GitHub Models ;
- OpenRouter ;
- DeepSeek ;
- Groq ;
- Hugging Face Inference Providers ;
- Together AI ;
- endpoint compatible personnalisé.

### Protocoles et workers

- MCP stdio ;
- MCP HTTP ;
- ACP stdio ;
- A2A HTTP ;
- worker distant SSH.

Les clés SSH restent dans `~/.ssh` ou `ssh-agent`. Elles ne sont pas copiées dans Super IA.

### Interfaces web assistées

- ChatGPT ;
- Claude ;
- Mistral Le Chat ;
- DeepSeek.

Le paquet de contexte est préparé et expurgé, mais le transfert reste manuel. Aucun navigateur n'est automatisé.

### Endpoints locaux expérimentaux

- Ollama ;
- LM Studio ;
- LocalAI.

Ils sont désactivés et présents uniquement pour une compatibilité future. Aucun modèle n'est installé automatiquement.

## Activation

```bash
superia connection enable codex-cli
superia connection enable openai-api
superia connection doctor
```

Désactivation :

```bash
superia connection disable openai-api
```

L'activation ne fournit pas de secret, n'envoie aucune requête et n'autorise pas automatiquement une dépense.

## Endpoint compatible personnalisé

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

Seul le nom `TEAM_AI_API_KEY` est enregistré.

## MCP stdio

```bash
superia connection add fichiers-mcp \
  --kind mcp-stdio \
  --label "MCP fichiers contrôlés" \
  --command mon-serveur-mcp \
  --auth none
```

L'enregistrement ne lance rien. L'exécution réelle devra passer par un adaptateur et une politique d'outils.

## MCP HTTP

```bash
superia connection add outils-mcp-http \
  --kind mcp-http \
  --label "MCP distant" \
  --base-url "https://mcp.exemple.invalid" \
  --auth environment \
  --secret-env MCP_ACCESS_TOKEN
```

## Agent ACP

```bash
superia connection add agent-acp \
  --kind acp-stdio \
  --label "Agent ACP" \
  --command agent-acp \
  --auth none
```

## Worker A2A

```bash
superia connection add worker-a2a \
  --kind a2a-http \
  --label "Worker de calcul" \
  --base-url "https://worker.exemple.invalid" \
  --auth environment \
  --secret-env A2A_WORKER_TOKEN
```

## Worker SSH

```bash
superia connection add laptop-worker \
  --kind ssh-cli \
  --label "Laptop worker" \
  --command ssh \
  --host "worker@192.168.2.20" \
  --auth session
```

## Coffres de secrets

```bash
superia connection secret-backends
```

Méthodes détectées sans lire leurs valeurs :

### Variables temporaires

```bash
read -rsp "Clé : " OPENAI_API_KEY
export OPENAI_API_KEY
printf '\n'
```

La clé n'est pas saisie directement dans une ligne de commande conservée par l'historique.

### Libsecret

Adapté à un poste Linux avec trousseau de session. Super IA détecte `secret-tool`, mais ne lit pas automatiquement le coffre.

### Fichier Age chiffré

Adapté à un Pi headless ou à une copie hors machine. L'identité Age doit être stockée séparément et protégée.

### Credentials systemd

Adaptés au daemon et aux futurs workers systemd. Les credentials sont transmis sous forme de fichiers, pas inscrits dans l'unité ou le dépôt.

## Règles

- aucune valeur de clé dans Git ;
- aucune valeur de clé dans `connections.json` ;
- aucun secret dans les arguments de processus ;
- aucune connexion activée par défaut ;
- aucun test réseau pendant le diagnostic ;
- pas de navigateur automatisé ;
- pas de fusion automatique ;
- API soumise à un budget explicite ;
- endpoint local sans installation automatique de modèle.

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

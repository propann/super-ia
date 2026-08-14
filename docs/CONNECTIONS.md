# Connexions universelles et sécurité

## Principe

Super IA sépare strictement :

1. l’installation d’un outil ;
2. la description d’une connexion ;
3. le secret, la session ou l’identité cloud qui autorise réellement cette connexion ;
4. l’autorisation explicite d’effectuer un accès réseau.

Le registre privé est stocké dans :

```text
~/.superia/connections.json
```

Il est créé avec les permissions `0600` et ne contient jamais de valeur de clé. Il stocke uniquement :

- identifiant et libellé ;
- type de transport ;
- commande, hôte ou URL ;
- noms des variables d’environnement attendues ;
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

Les nouvelles connexions du catalogue sont ajoutées sans écraser les choix existants.

### Registre invalide : comportement fail-closed

Un `connections.json` existant mais malformé, incompatible ou contenant une entrée refusée :

- provoque une erreur explicite ;
- n’est jamais remplacé par les valeurs par défaut ;
- reste intact pour permettre une réparation ou une restauration depuis une sauvegarde.

Les valeurs par défaut ne sont créées que lorsque le fichier n’existe réellement pas.

## Connection Matrix

```bash
superia connection dashboard
superia connection doctor
superia connection policy
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

`doctor` et `policy` :

- ne contactent aucun serveur ;
- ne lancent aucun agent ;
- ne lisent aucune valeur de secret ;
- ne testent aucune authentification ;
- ne facturent aucune requête.

## Politique des endpoints

### Endpoint distant

Un endpoint HTTP distant doit respecter toutes les règles suivantes :

- protocole `https:` ;
- adresse publique ;
- aucun identifiant dans l’URL ;
- aucune query string ;
- aucun fragment ;
- aucune résolution DNS vers une adresse privée ou spéciale.

Sont notamment refusés :

- `localhost` et la boucle locale ;
- réseaux RFC1918 ;
- link-local ;
- CGNAT ;
- multicast ;
- adresses de métadonnées cloud comme `169.254.169.254` ;
- noms `.local`, `.internal` et `.home.arpa`.

La résolution DNS est revalidée juste avant une sonde afin de limiter les attaques de type DNS rebinding.

### Endpoint local

Une connexion `local-endpoint` est limitée à la boucle locale. Une adresse LAN n’est pas acceptée comme endpoint local implicite.

Les endpoints locaux restent expérimentaux et désactivés. Aucun modèle local n’est installé par Super IA.

## Sonde réseau explicite

Une sonde n’est exécutée que lorsque `--network` est présent :

```bash
superia connection probe <ID> --network --timeout-ms 5000
```

Garanties :

- méthode `HEAD` ;
- aucune valeur d’environnement envoyée ;
- aucun en-tête `Authorization` ;
- aucune redirection suivie ;
- délai borné entre 250 et 15 000 ms ;
- validation statique puis validation DNS avant la requête.

Un code HTTP `401`, `403` ou `404` peut confirmer que le serveur est joignable sans prouver que l’authentification fonctionne.

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

Les identités cloud sont référencées sans copier les profils locaux : rôle ou profil AWS, Application Default Credentials Google, identité Microsoft Entra ou clé Azure gérée hors dépôt.

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

Les clés SSH restent dans `~/.ssh` ou dans `ssh-agent`. Elles ne sont pas copiées dans Super IA.

### Interfaces web assistées

- ChatGPT ;
- Claude ;
- Mistral Le Chat ;
- DeepSeek.

Le paquet de contexte est préparé et expurgé, mais le transfert reste manuel. Aucun navigateur n’est automatisé.

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

L’activation ne fournit pas de secret, n’envoie aucune requête et n’autorise pas automatiquement une dépense.

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
superia connection policy
```

Seul le nom `TEAM_AI_API_KEY` est enregistré.

## Protocoles

### MCP stdio

```bash
superia connection add fichiers-mcp \
  --kind mcp-stdio \
  --label "MCP fichiers contrôlés" \
  --command mon-serveur-mcp \
  --auth none
```

### MCP HTTP

```bash
superia connection add outils-mcp-http \
  --kind mcp-http \
  --label "MCP distant" \
  --base-url "https://mcp.exemple.invalid" \
  --auth environment \
  --secret-env MCP_ACCESS_TOKEN
```

### ACP stdio

```bash
superia connection add agent-acp \
  --kind acp-stdio \
  --label "Agent ACP" \
  --command agent-acp \
  --auth none
```

### A2A HTTP

```bash
superia connection add worker-a2a \
  --kind a2a-http \
  --label "Worker de calcul" \
  --base-url "https://worker.exemple.invalid" \
  --auth environment \
  --secret-env A2A_WORKER_TOKEN
```

### Worker SSH

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

1. variables temporaires de session ;
2. trousseau `libsecret` ;
3. fichier Age chiffré ;
4. credentials systemd.

Exemple de variable temporaire sans valeur dans l’historique :

```bash
read -rsp "Clé : " OPENAI_API_KEY
export OPENAI_API_KEY
printf '\n'
```

## Règles permanentes

- aucune valeur de clé dans Git ;
- aucune valeur de clé dans `connections.json` ;
- aucun secret dans les arguments de processus ;
- aucune connexion activée par défaut ;
- aucun test réseau implicite ;
- aucune redirection suivie par une sonde ;
- aucune automatisation de navigateur ;
- aucune fusion automatique ;
- dépense Vibe soumise à un plafond explicite ;
- endpoint local sans installation automatique de modèle.

## Commandes

```bash
superia connection catalog
superia connection init
superia connection dashboard
superia connection list
superia connection doctor
superia connection policy
superia connection probe <ID> --network
superia connection secret-backends
superia connection secrets-template
superia connection enable <ID>
superia connection disable <ID>
superia connection remove <ID>
```

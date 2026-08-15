# Fournisseurs et outils

Super IA distingue trois familles :

1. **fournisseurs de modèles** : OpenAI, Anthropic, Mistral, Google, Qwen, DeepSeek et autres ;
2. **agents de code** : Codex CLI, Claude Code, Mistral Vibe, Gemini CLI, Qwen Code, Aider, OpenCode et mini-SWE-agent ;
3. **outils locaux de soutien** : Git, Repomix, ripgrep, Ollama, llama.cpp, LocalAI, SQLite et les sandboxes.

La matrice détaillée et les décisions d'architecture vivent dans [`docs/research/`](research/README.md).

## Priorité économique

1. abonnement déjà payé ou accès inclus ;
2. CLI officielle avec offre gratuite légitime ;
3. agent open source connecté à un modèle local ou à un endpoint autorisé ;
4. interface web assistée ;
5. API plafonnée seulement en secours.

## Catalogue initial

- Codex CLI ;
- Mistral Vibe ;
- Claude Code ;
- Gemini CLI ;
- GitHub Copilot ;
- Qwen Code ;
- OpenCode ;
- Aider ;
- Goose ;
- Ollama ;
- DeepSeek Web assisté ;
- Mistral Le Chat assisté ;
- endpoint compatible OpenAI plafonné.

## Registre local futur

Le code doit créer un registre distinct `localTools` pour les programmes qui ne sont pas eux-mêmes des fournisseurs :

- Repomix ;
- mini-SWE-agent ;
- llama.cpp ;
- LocalAI ;
- bubblewrap / Podman ;
- restic ;
- ripgrep ;
- jq.

La console Matrix pourra ainsi afficher séparément :

- les cerveaux disponibles ;
- les agents capables d'agir ;
- les moteurs locaux ;
- les outils de sécurité et de sauvegarde.

## Web assisté

DeepSeek, Le Chat et d'autres interfaces peuvent recevoir un paquet de contexte préparé. L'utilisateur valide l'envoi et importe la réponse. Super IA n'automatise ni CAPTCHA, ni création de comptes, ni extraction interdite.

## API plafonnée

Les API compatibles sont des solutions de secours. Elles restent désactivées par défaut, avec budget mensuel, limite par mission et confirmation humaine.

## Donnée dynamique

Les quotas, modèles et conditions changent souvent. Super IA ne doit pas promettre un quota fixe. Il doit détecter les commandes, l'authentification, les limites observées et les résultats de benchmark sur la machine réelle.

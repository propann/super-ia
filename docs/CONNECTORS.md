# Registre des connecteurs

Super IA n'est pas une simple passerelle d'API. Chaque outil est classé avant
exécution et le routeur choisit le mode adapté.

## Modes d'accès

| Mode | Usage | Règle |
| --- | --- | --- |
| API | service stable et documenté | premier choix quand il existe |
| OAuth | compte utilisateur avec autorisation | jeton conservé dans n8n, jamais dans Git |
| CLI | outil local fiable (`gh`, `git`, `docker`, `ffmpeg`...) | commandes allowlistées, timeout et sortie contrôlée |
| Navigateur | service sans API utile ou action disponible seulement sur le site | profil isolé, connexion manuelle, pas d'export de cookies |
| Humain | MFA, paiement, publication, suppression ou ambiguïté | pause du workflow et validation explicite |

## Routage

1. Identifier le service dans `config/connectors.json`.
2. Vérifier l'action demandée et son niveau de sensibilité.
3. Essayer le mode préféré le moins fragile.
4. Refuser les actions sensibles sans validation humaine.
5. Journaliser le connecteur, le mode et le résultat sans journaliser les secrets.

## ChatGPT navigateur

ChatGPT web, Claude web et Gemini web sont des connecteurs `browser`/`human`,
pas des fournisseurs LiteLLM dans cette fondation. Leurs clés API restent
désactivées par défaut. Chaque service utilise un profil local séparé et une
connexion manuelle ; aucun mot de passe, cookie ou jeton de session ne doit
être copié dans `.env`, n8n ou Git.

## CLI

Les CLI sont privilégiées pour les opérations techniques répétables :

- `gh` pour les dépôts, issues, pull requests et contrôles GitHub ;
- `git` pour les branches, diffs et commits ;
- `docker compose` pour l'exploitation de la plateforme ;
- `ffmpeg`, `yt-dlp` ou autres outils spécialisés lorsqu'ils sont installés.

Le routeur ne doit jamais exécuter une chaîne arbitraire avec `bash -c`. Une
commande doit être composée à partir d'une action et d'arguments validés.

## Navigateur isolé

Le worker navigateur sera activé à la demande, sous un profil Docker séparé,
et ne sera pas démarré avec le socle par défaut. Le Pi garde ainsi sa RAM pour
n8n, PostgreSQL et Qdrant. Le premier jalon est un navigateur local pilotable
avec connexion humaine ; l'automatisation sans surveillance viendra ensuite,
service par service.

## Centre de contrôle

Le tableau de bord local regroupe les points d'entrée, l'état des services et
les modes de connexion. Il ne remplace pas les applications : il devient la
porte d'entrée unique vers n8n, Qdrant, LiteLLM, ChatGPT web et les commandes
CLI.

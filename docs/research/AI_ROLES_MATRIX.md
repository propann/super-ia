# Matrice des rôles IA

Cette matrice est une **hypothèse de routage initiale**, pas un classement absolu. Super IA devra la réviser à partir de benchmarks locaux.

## Séparer modèle et outil

Un excellent modèle peut devenir un mauvais ouvrier s'il est enfermé dans une interface web sans accès Git, sans sortie structurée et sans reprise de session. À l'inverse, un agent très bien conçu peut rester limité par un petit modèle. Le routeur doit donc noter séparément :

- la qualité du modèle ;
- les capacités de l'outil ;
- le coût réel disponible pour l'utilisateur ;
- le niveau d'autonomie autorisé ;
- la qualité mesurée sur le projet courant.

## Rôles recommandés au démarrage

| IA / famille | Rôle conseillé | Points utiles | Limites à surveiller |
|---|---|---|---|
| **Codex CLI** | intégrateur principal, corrections complexes, tests, livraison | agent terminal local, lecture/écriture/commandes, sandbox et approbations, accès possible via forfait ChatGPT | quotas variables ; ne doit jamais fusionner directement sans garde-fou |
| **Claude Code** | gros refactor cohérent, architecture applicative, frontend, documentation technique | mode non interactif, JSON/stream JSON, reprise de session, limites de tours et permissions fines | abonnement ou facturation ; traitement distant ; coût à surveiller |
| **Mistral Vibe** | second constructeur, audit, agent local/offline compatible | agents personnalisés, sous-agent d'exploration, modes plan/accept-edits, mode script, API compatible OpenAI et modèles locaux | les gros modèles locaux recommandés dépassent largement un Pi 5 ; qualité à mesurer par tâche |
| **Gemini CLI** | éclaireur de dépôt, recherche, contexte long, seconde opinion, mémoire expérimentale | sessions reprises, sorties JSON, extensions, sous-agents, worktrees expérimentaux, auto-memory avec validation | fonctions expérimentales susceptibles de changer ; accès et quotas variables |
| **Qwen Code** | travail parallèle à bas coût, sous-agents spécialisés, automatisation CLI | shell, fichiers, web, tâches structurées, sandbox, MCP et sous-agents séparés | qualité et coût dépendent fortement du modèle/fournisseur configuré |
| **DeepSeek** | raisonnement, audit, comparaison d'architectures, correction ponctuelle | bon candidat économique via web assisté ou endpoint compatible | l'interface web n'est pas un agent Git ; automatisation web à garder assistée et conforme |
| **Modèles locaux légers** | triage, classement, résumés, extraction, génération de messages de commit, compression de contexte | coût marginal nul, confidentialité, disponibilité permanente | ne pas leur confier seuls les modifications complexes ou la validation finale sans benchmark |

## Profil par type de mission

### Exploration et compréhension

Priorité initiale :

1. Gemini CLI ou Mistral Vibe en mode plan ;
2. Codex en lecture seule ;
3. modèle local léger pour indexation, classement et résumé ;
4. Claude Code pour une analyse transversale difficile.

### Architecture

Utiliser au moins deux avis indépendants :

- un architecte principal, souvent Codex ou Claude ;
- un contradicteur, souvent Gemini, Mistral ou DeepSeek ;
- un arbitre déterministe qui compare les propositions aux contraintes du dépôt.

L'architecture retenue doit devenir un artefact Git, jamais une conclusion perdue dans une conversation.

### Implémentation

- **petite correction ciblée** : agent le moins coûteux ayant déjà de bons résultats sur ce dépôt ;
- **fonction multi-fichiers** : Codex, Claude Code, Mistral Vibe ou Qwen Code dans un worktree ;
- **refactor large** : un seul constructeur principal, puis revue par une IA différente ;
- **travail parallèle** : uniquement sur des lots de fichiers sans chevauchement.

### Tests et audit

Le constructeur ne valide jamais seul son propre travail.

- tests mécaniques : moteur local déterministe ;
- audit du diff : agent différent du constructeur ;
- sécurité : profil spécialisé en lecture seule ;
- intégration finale : Codex ou autre agent mesuré comme fiable, avec validation humaine.

### Documentation

- Claude Code, Gemini et Mistral sont de bons candidats pour transformer le code et les décisions en documentation ;
- un modèle local peut maintenir index, changelog, tags et résumés de commits ;
- toute documentation générée doit référencer le commit observé.

## Score interne futur

Chaque fournisseur recevra des scores par dépôt et par type de mission :

```text
qualité fonctionnelle
respect des fichiers autorisés
réussite des tests
nombre de corrections nécessaires
coût estimé
temps d'exécution
volume de contexte envoyé
commandes risquées proposées
qualité du rapport final
```

Le routeur choisira ensuite le meilleur **rapport qualité/coût/risque disponible**, pas la marque la plus célèbre.

## Sources principales

- Codex : https://help.openai.com/en/articles/11096431 et https://openai.com/index/running-codex-safely/
- Claude Code : https://docs.anthropic.com/en/docs/claude-code/cli-usage
- Mistral Vibe : https://docs.mistral.ai/vibe/code/cli/agents et https://docs.mistral.ai/vibe/code/cli/offline-models
- Gemini CLI : https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/cli-reference.md
- Qwen Code : https://qwenlm.github.io/qwen-code-docs/en/developers/tools/introduction/

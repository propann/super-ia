# Matrice des rôles IA

Dernière revue : 14 août 2026.

Cette matrice est une **hypothèse de routage initiale**, pas un classement absolu. Super IA devra la corriger avec des benchmarks exécutés sur les mêmes dépôts, commits, contextes et tests.

## Séparer cinq niveaux

Un excellent modèle peut devenir un mauvais ouvrier s'il est enfermé dans une interface sans Git, sortie structurée ou reprise. À l'inverse, un bon agent reste limité par son modèle et ses permissions.

Le routeur note donc séparément :

1. qualité du modèle ;
2. capacités de l'agent ;
3. qualité du transport ;
4. coût réellement accessible à l'utilisateur ;
5. résultats mesurés sur le projet et le rôle.

## Décision Pi

Le Raspberry Pi n'exécute aucun modèle local dans le MVP. Il peut exécuter les programmes CLI des agents, lesquels utilisent leurs services distants officiels ou le fournisseur configuré. Les modèles locaux restent un laboratoire futur séparé.

## Rôles recommandés au démarrage

| IA / famille | Rôle conseillé | Points utiles | Limites à surveiller |
|---|---|---|---|
| **Codex CLI** | intégrateur principal, corrections complexes, tests, livraison | agent terminal, lecture/écriture/commandes, sandbox et approbations, accès possible via forfait ChatGPT selon l'offre | quotas variables ; ne doit pas fusionner directement sans garde-fou |
| **Claude Code** | gros refactor cohérent, architecture applicative, frontend, documentation technique | mode non interactif, JSON/stream JSON, reprise de session, limites de tours et permissions fines | abonnement ou facturation ; traitement distant ; coût à surveiller |
| **Mistral Vibe** | second constructeur, audit, planification | agents personnalisés, sous-agent d'exploration, modes plan/accept-edits, mode script et ACP | qualité à mesurer par tâche ; accès et quotas variables |
| **Gemini CLI** | éclaireur de dépôt, recherche, contexte long, seconde opinion | sessions reprises, sorties JSON, extensions, sous-agents, worktrees et mémoire selon version | fonctions expérimentales susceptibles de changer ; quotas variables |
| **Qwen Code** | travail parallèle économique, sous-agents spécialisés | shell, fichiers, tâches structurées, sandbox, MCP et sous-agents | qualité et coût dépendent du modèle/fournisseur configuré |
| **DeepSeek** | raisonnement, audit, comparaison d'architectures | candidat économique via web assisté ou endpoint compatible | l'interface web n'est pas un agent Git ; automatisation web à garder assistée et conforme |
| **Aider** | modification Git ciblée, lint/tests, pont vers plusieurs modèles | repo map, commits, nombreux backends, workflow copier/coller possible | dépend du modèle configuré ; ne remplace pas l'orchestrateur global |
| **OpenCode** | backend multi-fournisseurs et mode plan/build | ouvert, intégrable, plusieurs fournisseurs | formats et comportements à versionner et benchmarker |
| **mini-SWE-agent** | exécuteur minimal, référence de benchmark | boucle simple, historique linéaire, bash, sandboxes interchangeables | demande un fournisseur de modèle ; politique shell à renforcer |

## Profil par type de mission

### Exploration et compréhension

Priorité initiale :

1. Gemini CLI ou Mistral Vibe en mode plan ;
2. Codex en lecture seule ;
3. ripgrep, Tree-sitter, Serena ou autre index local déterministe ;
4. Claude Code pour une analyse transversale difficile.

Le tri initial des fichiers doit rester déterministe autant que possible. Une IA n'est appelée que lorsque la recherche structurelle ne suffit pas.

### Architecture

Utiliser au moins deux avis indépendants sur les missions importantes :

- architecte principal, souvent Codex ou Claude ;
- contradicteur, souvent Gemini, Mistral ou DeepSeek ;
- arbitre déterministe comparant contraintes, tests, sécurité et coût.

L'architecture retenue devient un artefact Git.

### Implémentation

- petite correction : agent disponible le moins coûteux avec de bons résultats mesurés ;
- fonction multi-fichiers : Codex, Claude, Vibe ou Qwen dans un worktree ;
- refactor large : un constructeur principal puis revue indépendante ;
- travail parallèle : uniquement sur lots sans chevauchement ou branches empilées ;
- modification mécanique : script déterministe avant appel IA.

### Tests et audit

Le constructeur ne valide jamais seul son travail.

- tests mécaniques : outils locaux ;
- audit du diff : agent différent ;
- sécurité : profil lecture seule spécialisé ;
- intégration finale : agent mesuré fiable + validation humaine ;
- findings reliés à des chemins, lignes, commandes ou résultats.

### Documentation

- Claude, Gemini et Mistral sont de bons candidats pour transformer code et décisions en documentation ;
- les index, changelogs et résumés mécaniques doivent être produits localement lorsque possible ;
- toute documentation générée référence le commit observé.

## Capacité déclarée versus qualité mesurée

Chaque couple `agent + modèle` possède un profil :

```text
planification
exploration
édition ciblée
refactor multi-fichiers
frontend
backend
infrastructure
sécurité
tests
documentation
revue
```

Le profil commence comme hypothèse, puis est mis à jour par les résultats.

## Score interne futur

```text
qualité fonctionnelle
respect des fichiers autorisés
réussite des tests
nombre de corrections nécessaires
coût estimé ou quota consommé
temps d'exécution
volume de contexte envoyé
commandes risquées proposées
qualité du rapport final
capacité de reprise
stabilité du transport
```

Le routeur choisit le meilleur **rapport qualité/coût/risque disponible**, pas la marque la plus connue.

## Laboratoire local futur

Un modèle local sur Pi 4/5 ne sera testé que pour une tâche précise, par exemple classement ou extraction, et comparé à :

- règle déterministe ;
- outil de parsing ;
- appel distant économique.

Il ne rejoint le registre de routage que si son avantage est reproductible. Son absence ne doit retirer aucune fonction à Super IA.

## Sources principales

- Codex : https://developers.openai.com/codex/
- Claude Code : https://docs.anthropic.com/en/docs/claude-code/cli-usage
- Mistral Vibe : https://docs.mistral.ai/vibe/code/cli/agents
- Gemini CLI : https://github.com/google-gemini/gemini-cli
- Qwen Code : https://qwenlm.github.io/qwen-code-docs/
- Aider : https://github.com/Aider-AI/aider
- OpenCode : https://github.com/anomalyco/opencode
- mini-SWE-agent : https://github.com/SWE-agent/mini-swe-agent

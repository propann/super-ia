# Paysage concurrentiel 2026 — orchestrateurs et agents de code

Dernière revue : 14 août 2026.

## Objectif

Cette étude compare les projets qui peuvent concurrencer, inspirer ou compléter Super IA. Elle distingue :

1. les **orchestrateurs de cycle de développement** ;
2. les **gestionnaires de sessions d'agents** ;
3. les **plans de contrôle et tableaux de bord** ;
4. les **agents de code individuels** ;
5. les **briques de contexte, mémoire, sécurité et protocoles**.

Les descriptions sont fondées sur les dépôts et documentations disponibles à la date de revue. Les fonctions, licences et architectures peuvent évoluer. Les affirmations de performance propres aux projets doivent être reproduites avant d'être utilisées comme critères de décision.

---

# 1. Résumé exécutif

Le marché se répartit en quatre familles.

| Famille | Exemples | Force principale | Limite habituelle |
|---|---|---|---|
| Orchestrateurs SDLC | Shep, Mozzie | idée → tâches → worktrees → PR/CI | dépendance à une interface lourde ou à un LLM orchestrateur |
| Gestionnaires de sessions | Agent of Empires, Claude Squad, Agent Deck | plusieurs terminaux persistants, visibilité et contrôle | peu de mémoire sémantique ou de planification structurée |
| Plans de contrôle | Mission Control, OpenHands Agent Canvas, ADHDev | gouvernance, observabilité, API et équipes | surface lourde pour un petit serveur personnel |
| Collaboration spécialisée | Squad, The Pair | bus SQLite ou revue croisée explicite | couverture partielle du cycle complet |

Aucun projet étudié ne combine parfaitement les objectifs de Super IA :

- fonctionnement permanent sur un Raspberry Pi sans inférence locale obligatoire ;
- utilisation prioritaire des abonnements et CLI légitimes déjà disponibles ;
- suivi de plusieurs dépôts et de leur histoire complète ;
- mémoire projet reproductible et indépendante des conversations des fournisseurs ;
- sélection et sauvegarde du contexte transmis ;
- routeur coût/capacité/qualité mesurée ;
- exécution déterministe avec agents interchangeables ;
- preuves de validation et reprise après panne ;
- console terminal légère puis interface web facultative.

La concurrence valide cependant presque toutes les briques séparément. Le travail de Super IA consiste donc moins à inventer chaque mécanisme qu'à les **combiner dans un noyau plus léger et plus contrôlable**.

---

# 2. Concurrents directs

## 2.1 Shep

Dépôt : `shep-ai/shep`  
Licence : MIT  
Technologies : TypeScript, Node.js, pnpm, SQLite, CLI/TUI/Next.js, LangGraph.

### Positionnement

Shep est l'un des concurrents les plus proches. Il exécute des agents en parallèle dans des worktrees, peut faire passer une fonctionnalité par des phases de spécification, implémentation, commit, push, surveillance CI et création de PR brouillon.

### Forces

- pipeline rapide ou spec-driven ;
- worktree et branche par fonctionnalité ;
- interface CLI, TUI et web ;
- SQLite local ;
- adaptateurs d'agents derrière des interfaces ;
- architecture en couches propre ;
- graphes d'état, checkpoints, approbations et boucles de réparation bornées ;
- stratégie intéressante « déterministe d'abord, appel LLM seulement en dernier recours » ;
- surveillance de CI et tentatives de correction ;
- séparation nette domaine/application/infrastructure/présentation.

### Risques ou limites

- surface fonctionnelle et architecture déjà importantes ;
- dépendances de plateforme plus lourdes que notre MVP ;
- usage de LangGraph alors que notre boucle initiale peut être une machine à états plus simple ;
- certains modes non interactifs utilisent des options de contournement des confirmations et reposent ensuite sur worktree, PR brouillon et CI ;
- risque de multiplier les couches avant de maîtriser parfaitement contexte, permissions et reprise.

### À récupérer

- port `AgentExecutor` agnostique ;
- états typés et transitions explicites ;
- checkpoints par étape ;
- tentatives de réparation limitées ;
- fast path déterministe avant recours à une IA ;
- séparation stricte du cœur, des adaptateurs et des interfaces ;
- approbation par type d'effet externe.

### À ne pas copier immédiatement

- LangGraph comme dépendance centrale ;
- TypeSpec pour tous les modèles du domaine ;
- trois interfaces complètes dès le MVP ;
- permissions contournées par défaut.

Sources :

- https://github.com/shep-ai/shep
- https://github.com/shep-ai/shep/blob/main/ARCHITECTURE.md
- https://github.com/shep-ai/shep/blob/main/docs/architecture/agent-system.md

---

## 2.2 Mozzie

Dépôt : `usemozzie/mozzie`  
Licence : MIT  
Technologies : Tauri, Rust, React, SQLite, ACP/CLI.

### Positionnement

Application desktop local-first qui transforme une demande en work items, assigne des agents, gère les dépendances, crée les worktrees et présente les résultats pour revue.

### Forces

- cycle de vie clair : draft → ready → running → review → done → archived ;
- graphe de dépendances avec détection des cycles ;
- lancement automatique des tâches débloquées ;
- sous-tâches et branches empilées ;
- historique de rejet réinjecté dans une nouvelle tentative ;
- persistance SQLite ;
- flux d'événements temps réel ;
- support ACP lorsqu'il est disponible, CLI sinon ;
- worktree et branche par work item ;
- interface de revue intégrée.

### Risques ou limites

- application desktop Tauri, moins adaptée à un service Pi headless ;
- orchestration en langage naturel dépendante d'une clé API OpenAI, Anthropic ou Gemini ;
- davantage de composants frontend et Rust que nécessaire au premier noyau ;
- pas conçu en priorité autour d'abonnements web/CLI sans API pour l'orchestrateur.

### À récupérer

- DAG de tâches et détection de cycles ;
- historique des tentatives et raisons de rejet ;
- branches enfant/parent pour grands chantiers ;
- transport ACP avec repli CLI ;
- événements de processus normalisés ;
- état explicite et reprise d'une tâche.

Source : https://github.com/usemozzie/mozzie

---

## 2.3 Agetor

Dépôt : `alamops/agetor`  
Licence : MIT  
Technologies : Bun, Electrobun, React, SQLite, tmux, JSONL.

### Positionnement

Kanban local-first pour Claude Code, Codex et d'autres harnesses. Chaque carte devient un processus dans un worktree, avec sortie en direct, approbations et historique.

### Forces

- base SHA épinglée pour rendre les relances reproductibles ;
- SQLite local pour tâches, runs, événements et préférences ;
- Claude interactif conservé dans tmux ;
- lecture des transcriptions JSONL natives de Claude ;
- Codex utilisé en exécution one-shot ;
- questions et approbations remontées sous forme de cartes structurées ;
- API locale protégée par jeton aléatoire ;
- démon headless partagé entre interface et CLI ;
- profils séparés avec répertoires HOME distincts pour des comptes légitimes distincts ;
- réconciliation au démarrage des sessions orphelines.

### Risques ou limites

- pas de sandbox : les agents héritent des droits du shell ;
- forte dépendance à tmux et aux formats internes de transcription ;
- support agent encore concentré sur Claude/Codex ;
- Electrobun et l'application graphique ne sont pas idéaux comme cœur Pi.

### À récupérer

- SHA de départ enregistrée dans chaque mission ;
- réconciliation des processus et états après redémarrage ;
- récupération structurée des questions utilisateur ;
- distinction agent interactif persistant / agent one-shot ;
- identités d'exécution et HOME isolés ;
- fichier de découverte local protégé en mode `0600`.

### Attention

La séparation de HOME peut servir à isoler des comptes réellement possédés par l'utilisateur. Elle ne doit jamais devenir un mécanisme de création massive de comptes ou de contournement de quotas.

Source : https://github.com/alamops/agetor

---

## 2.4 Agent of Empires

Dépôt : `agent-of-empires/agent-of-empires`  
Licence : MIT  
Technologies : Rust, tmux, TUI, serveur web/PWA, ACP.

### Positionnement

Gestionnaire de nombreuses sessions d'agents accessible en terminal ou navigateur, avec worktrees, sandboxes facultatives et reprise après déconnexion.

### Forces

- grand nombre d'agents CLI détectés ;
- sessions tmux qui survivent aux coupures SSH ;
- TUI et interface web/PWA mobile ;
- vue structurée via ACP et vue terminal brute ;
- worktrees et espaces multi-repos ;
- Docker, Podman et autres wrappers de sandbox ;
- revue de diff et édition ;
- API HTTP pour pilotage externe ;
- détection d'état : en cours, attente utilisateur, inactif, erreur ;
- reprise des conversations prises en charge ;
- notifications et contrôle depuis téléphone.

### Risques ou limites

- excellent gestionnaire de sessions mais moins centré sur la mémoire projet, le routage économique et les preuves de validation ;
- tmux reste une session d'exécution, pas une base de vérité ;
- interface web et accès distant augmentent la surface de sécurité ;
- gestion de tâches et dépendances moins riche que les orchestrateurs SDLC.

### À récupérer

- session persistante séparée de la mission persistante ;
- statut agent normalisé ;
- interface mobile structurée ;
- wrapper sandbox configurable par agent ;
- support multi-repos ;
- distinction terminal brut / événements ACP.

Source : https://github.com/agent-of-empires/agent-of-empires

---

## 2.5 Claude Squad

Dépôt : `smtg-ai/claude-squad`  
Licence : AGPL-3.0  
Technologies : Go, tmux, Git worktrees, TUI.

### Positionnement

Gestionnaire TUI simple pour lancer Claude Code, Codex, Gemini, Aider ou une commande personnalisée dans plusieurs workspaces.

### Forces

- simplicité ;
- binaire léger en Go ;
- worktree par tâche ;
- tmux pour les sessions persistantes ;
- profils de commandes ;
- vue diff et possibilité de reprendre une session ;
- bon modèle UX pour créer, attacher, suspendre, reprendre et pousser.

### Risques ou limites

- pas de véritable graphe de tâches ;
- peu de mémoire sémantique ou de contrôle des coûts ;
- dépendance à tmux ;
- AGPL : les idées sont utiles, mais le code ne peut pas être copié dans un projet MIT sans respecter la licence ;
- les modes auto-accept doivent rester explicitement opt-in.

### À récupérer

- ergonomie TUI ;
- profils simples de commandes ;
- gestion claire des sessions ;
- aperçu du diff avant publication.

Source : https://github.com/smtg-ai/claude-squad

---

## 2.6 Squad

Dépôt : `mco-org/squad`  
Licence : MIT  
Technologies : Rust, SQLite, commandes one-shot.

### Positionnement

Bus de collaboration entre agents CLI. Les agents rejoignent un espace, s'envoient des messages et gèrent une file de tâches dans SQLite. Aucun démon n'est requis.

### Forces

- architecture extrêmement légère ;
- SQLite comme bus et journal partagé ;
- commandes courtes et scriptables ;
- aucun socket ni processus permanent obligatoire ;
- rôles manager, worker, inspector ;
- tâches structurées : création, accusé, achèvement, remise en file ;
- sorties JSON ;
- métadonnées de capacités et version de protocole ;
- attente bloquante pour recevoir une mission ;
- modèles de rôles Markdown et équipes YAML ;
- installation de commandes/skills dans plusieurs agents.

### Risques ou limites

- l'IA manager reste responsable de la coordination logique ;
- pas de moteur complet de contexte, sécurité, Git ou revue ;
- plusieurs agents qui modifient le même dépôt exigent une isolation externe ;
- le polling conversationnel peut consommer des tours si mal conçu.

### À récupérer en priorité

- bus SQLite minimal ;
- protocole versionné ;
- capacités déclarées ;
- commandes idempotentes ;
- tâches `ack/complete/requeue` ;
- rôles et équipes stockés comme fichiers versionnables ;
- fonctionnement sans démon comme mode dégradé.

Source : https://github.com/mco-org/squad

---

## 2.7 The Pair

Dépôt : `timwuhaotian/the-pair`  
Licence : Apache-2.0  
Technologies : Tauri, Rust, React.

### Positionnement

Deux agents aux responsabilités séparées : Mentor en lecture seule et Executor avec droit d'écriture. Le Mentor prépare, observe et valide le travail de l'Executor.

### Forces

- séparation explicite plan/revue et exécution ;
- modèles/fournisseurs différents possibles entre les deux rôles ;
- handoffs structurés ;
- budget d'itérations ;
- récupération complète des sessions ;
- suivi des ressources et tokens ;
- visualisation de l'activité et des changements Git ;
- pause humaine lorsque le budget est atteint.

### Risques ou limites

- deux agents sur chaque mission peuvent doubler le coût ;
- une boucle agent-agent peut s'allonger sans preuve de progression ;
- application desktop lourde pour un serveur Pi ;
- la revue par modèle ne remplace pas les tests déterministes.

### À récupérer

- rôle contrôleur réellement séparé ;
- contrôleur en lecture seule ;
- budget strict de tours et de temps ;
- verdict PASS/FAIL accompagné de preuves ;
- possibilité d'utiliser deux fournisseurs indépendants.

Source : https://github.com/timwuhaotian/the-pair

---

## 2.8 Mission Control

Dépôt : `builderz-labs/mission-control`  
Licence : MIT  
Technologies : Next.js, React, TypeScript, SQLite, REST/OpenAPI, MCP, SSE, WebSocket.

### Positionnement

Plan de contrôle auto-hébergé au-dessus de plusieurs runtimes d'agents. Il gère tâches, présence, sessions, coûts, mémoire, rôles, audits, alertes, horaires et qualité.

### Forces

- excellente vision « opérations » ;
- tâches, affectations, revues et reçus d'achèvement ;
- activités, alertes, journaux, tokens et coûts ;
- mémoire et graphe de relations ;
- registre de skills ;
- rôles, clés, événements de sécurité, approbations et audits ;
- plusieurs interfaces : web, CLI, MCP, OpenAPI REST, WebSocket, SSE ;
- SQLite en WAL ;
- conseils de durcissement réseau ;
- distinction claire entre plan de contrôle et boucle de raisonnement des agents.

### Risques ou limites

- projet alpha ;
- beaucoup plus lourd que le noyau nécessaire au Pi ;
- authentification, web, API et temps réel agrandissent fortement la surface d'attaque ;
- plusieurs intégrations ont une profondeur variable ;
- ne gère pas nécessairement la construction du contexte de code aussi finement que notre cible.

### À récupérer

- reçu d'achèvement vérifiable ;
- registre d'audit et identité des acteurs ;
- coûts et tokens comme événements de première classe ;
- OpenAPI/CLI pour l'automatisation ;
- séparation plan de contrôle/runtimes ;
- qualité et approbation avant passage à `done`.

Source : https://github.com/builderz-labs/mission-control

---

## 2.9 OpenHands Agent Canvas

Dépôt : `OpenHands/OpenHands`  
Licence : consulter le dépôt pour les composants utilisés.

### Positionnement

Centre de contrôle pour agents locaux, VM, conteneurs ou cloud. Le frontend peut piloter différents Agent Servers et automatisations.

### Forces

- séparation frontend, serveur agent et serveur d'automatisation ;
- backends sur différentes machines ;
- compatibilité OpenHands, Claude, Codex, Gemini et agents ACP ;
- intégrations et automatisations ;
- modèle adapté aux workers distants.

### Risques ou limites

- plateforme complète et plus gourmande ;
- déploiement et durcissement plus complexes ;
- accès direct au système de fichiers dangereux sans sandbox ;
- disproportionné pour notre MVP personnel.

### À récupérer

- backends d'exécution enregistrables ;
- worker local ou distant derrière la même interface ;
- séparation contrôle/exécution ;
- compatibilité ACP.

Source : https://github.com/OpenHands/OpenHands

---

## 2.10 Agent Orchestrator

Dépôt actuel : `Untrivial-ai/agent-orchestrator`  
Licence : Apache-2.0.

### Positionnement

IDE d'agents avec démon, worktrees parallèles, surveillance PR/CI/reviews, nombreux adaptateurs et reviewers externes.

### Forces

- couverture large des agents ;
- démon séparé ;
- worktrees, PR, CI, commentaires et conflits ;
- adaptateurs de reviewers distincts ;
- processus de reviewer frais à chaque passe ;
- interfaces chat et terminal natif ;
- suivi d'état de longue durée.

### Risques ou limites

- application très riche et donc plus complexe ;
- certains reviewers sont explicitement considérés comme « host-trusted » faute d'isolation système ;
- risque d'être trop proche d'un IDE complet plutôt que d'un noyau portable et headless.

### À récupérer

- reviewer jetable pour éviter une mémoire biaisée ;
- événements GitHub/CI comme entrées de mission ;
- adaptateur générique de terminal ;
- suivi des conflits entre worktrees.

Source : https://github.com/Untrivial-ai/agent-orchestrator

---

# 3. Projets adjacents importants

## 3.1 Agents individuels

| Projet | Catégorie | Apport principal | Usage Super IA |
|---|---|---|---|
| Codex CLI | agent officiel | code, tests, sandbox, abonnement ChatGPT selon offre | adaptateur prioritaire |
| Claude Code | agent officiel | sessions, refactors, JSON/stream, permissions | adaptateur prioritaire |
| Mistral Vibe | agent officiel | modes plan/build, script, sous-agents, ACP | adaptateur prioritaire |
| Gemini CLI | agent officiel | grand contexte, JSON, reprise, extensions, sous-agents | adaptateur prioritaire |
| Qwen Code | agent ouvert | outils, tâches, sous-agents, MCP | adaptateur secondaire |
| Aider | agent Git | repo map, commits, lint/tests, nombreux modèles | backend et source d'idées |
| OpenCode | agent ouvert | multi-fournisseurs, modes plan/build | backend universel potentiel |
| mini-SWE-agent | boucle minimale | bash, histoire linéaire, sandbox interchangeable | référence du moteur minimal |
| Cline | IDE/SDK/CLI | agent autonome et écosystème mature | worker adjacent, pas cœur |
| Roo Code | IDE multi-agent | modes/rôles dans l'éditeur | idées UX ; dépôt observé archivé lors de la revue |

## 3.2 Contexte et mémoire

| Projet | Apport | Décision |
|---|---|---|
| Repomix | paquet de dépôt, tokens, compression, secrets | intégration rapide puis fonctions natives ciblées |
| Serena | LSP/symboles, édition sémantique, mémoire MCP | excellent moteur de navigation optionnel |
| codebase-memory-mcp | graphe Tree-sitter/SQLite local | benchmark avant adoption ; index dérivé reconstruisible |
| Tree-sitter | parsing incrémental multi-langages | brique native probable |
| Beads | graphe de tâches agent-friendly | reproduire d'abord un DAG SQLite minimal ; import possible plus tard |
| Spec Kit | constitution/spec/plan/tasks | conventions de documents et gates |
| AGENTS.md | instructions hiérarchiques par dossier | support obligatoire avec règle du fichier le plus proche |

## 3.3 Sécurité et validation

| Projet / outil | Apport | Décision |
|---|---|---|
| Gitleaks | détection de secrets dans fichiers, historique et CI | gate obligatoire avant contexte distant |
| bubblewrap | sandbox légère Linux | premier choix sur Pi pour tâches limitées |
| Podman | conteneurs rootless | option pour isolation forte |
| Docker | compatibilité projets existants | facultatif, pas obligatoire au noyau |
| Restic | sauvegarde chiffrée et dédupliquée | recommandé pour états et artefacts critiques |
| SWE-bench | benchmark de corrections réelles | mesure externe, pas unique critère |
| Terminal-Bench | tâches terminal reproductibles | test des runners et sandboxes |

---

# 4. Matrice de comparaison

Échelle qualitative : fort, moyen, faible ou absent. Elle décrit la surface annoncée et observée dans la documentation, pas une garantie de qualité.

| Projet | Pi/headless | Worktrees | DAG tâches | Mémoire durable | Multi-agent | Revue croisée | Coûts | Web/mobile | Sandbox | PR/CI |
|---|---|---|---|---|---|---|---|---|---|---|
| Shep | moyen | fort | moyen | fort | fort | moyen | moyen | fort | moyen | fort |
| Mozzie | faible à moyen | fort | fort | fort | fort | moyen | faible | desktop | faible | moyen |
| Agetor | moyen | fort | faible | fort | moyen | faible | faible | desktop/CLI | absent | moyen |
| Agent of Empires | fort | fort | faible | session | fort | faible | faible | fort | fort | faible |
| Claude Squad | fort | fort | absent | session | fort | faible | absent | TUI | absent | moyen |
| Squad | très fort | option | fort | messages/tâches | fort | rôle inspector | absent | CLI | externe | absent |
| The Pair | faible à moyen | variable | faible | fort | deux rôles | fort | tokens | desktop | permissions | faible |
| Mission Control | moyen | runtime | fort | très fort | fort | gates | fort | très fort | déploiement | moyen |
| OpenHands Canvas | moyen | backend | moyen | fort | fort | variable | variable | fort | fort | intégrations |
| Super IA cible | très fort | fort | fort | très fort | fort | fort | très fort | TUI + web optionnel | fort | fort |

---

# 5. Espace de différenciation de Super IA

## 5.1 Noyau Pi-first, interface facultative

Le service doit être utilisable entièrement par CLI/SSH. La console web ne doit pas être nécessaire à l'exécution, à la reprise ou à la sauvegarde.

## 5.2 Aucun LLM local obligatoire

Le Pi exécute les programmes agents et garde les dépôts, états, index, tests et sauvegardes. Les modèles restent fournis par les abonnements/CLIs distants. L'inférence locale sur Pi 4/5 est une expérience future séparée.

## 5.3 Mémoire indépendante des fournisseurs

Une conversation Claude, Codex ou Gemini n'est pas la mémoire officielle. La mémoire officielle contient :

- commit de départ ;
- spécification et décisions ;
- manifeste de contexte ;
- événements et commandes ;
- patches et commits ;
- tests et preuves ;
- transcriptions brutes ;
- résumé de reprise dérivé.

## 5.4 Contexte explicable

Chaque fichier envoyé doit avoir une raison : demandé par l'utilisateur, modifié, importé, référencé, proche dans le graphe ou requis par les instructions. Le manifeste doit permettre de reconstruire exactement le paquet.

## 5.5 Coût et légitimité comme contraintes du routeur

Le routeur doit privilégier :

1. abonnement déjà payé ;
2. accès gratuit officiel ;
3. outil open source avec fournisseur configuré ;
4. web assisté légitime ;
5. API plafonnée après consentement.

## 5.6 Preuves avant statut `done`

Un agent qui affirme avoir terminé ne suffit pas. Une mission se termine avec un reçu :

- SHA de départ et SHA final ;
- diff ;
- commandes exécutées ;
- codes de sortie ;
- tests ;
- audit ;
- risques restants ;
- approbation humaine lorsque requise.

## 5.7 Routage mesuré

Super IA doit apprendre quel **couple outil + modèle** réussit sur chaque type de tâche du dépôt, plutôt que graver un classement universel.

---

# 6. Décisions de construction

## Adopté pour le MVP

- TypeScript/Node ;
- Git CLI natif ;
- SQLite en WAL ;
- événement JSONL append-only ;
- machine à états déterministe ;
- worktree et branche par mission ;
- runner de processus one-shot ;
- reprise et réconciliation au démarrage ;
- adaptateurs CLI ;
- sortie structurée lorsque disponible ;
- tests et gates locales ;
- console TUI légère ;
- merge humain.

## À intégrer comme outil externe

- Gitleaks ;
- Repomix ;
- bubblewrap ;
- Restic ;
- éventuellement Serena/codebase-memory pour l'index sémantique ;
- gh pour PR/CI quand disponible.

## À expérimenter après le MVP

- ACP comme transport principal ;
- serveur web mobile ;
- workers distants ;
- A2A entre machines ;
- graphes de workflow externes ;
- modèles locaux sur une autre machine ou Pi de laboratoire ;
- sandbox Podman/Docker complète ;
- import/export Beads.

## Explicitement hors MVP

- Kubernetes ;
- base réseau ;
- vector database obligatoire ;
- modèle local obligatoire ;
- conversation libre permanente entre plusieurs agents ;
- permissions dangereuses activées automatiquement ;
- fusion automatique sur `main` ;
- dépendance obligatoire à une API d'orchestration payante.

---

# 7. Risques concurrentiels

1. **Shep peut couvrir rapidement une grande partie du cycle SDLC.** Notre réponse : rester plus léger, orienté coût, contexte et Pi.
2. **Agent of Empires offre déjà une excellente UX multi-session/mobile.** Notre réponse : ne pas réécrire son terminal manager ; pouvoir l'utiliser comme backend ou s'inspirer de son API.
3. **Mission Control couvre davantage la gouvernance.** Notre réponse : commencer par les reçus, audits et coûts essentiels sans reproduire une plateforme d'entreprise.
4. **Mozzie possède un DAG et une revue très aboutis.** Notre réponse : adopter le DAG, mais sans LLM orchestrateur payant obligatoire.
5. **Les fournisseurs améliorent constamment leurs propres sous-agents.** Notre réponse : faire de Super IA une couche portable de mémoire, coût, Git et preuves, non un concurrent du raisonnement natif de chaque agent.
6. **Les protocoles évoluent vite.** Notre réponse : adaptateurs versionnés et fallback CLI stable.

---

# 8. Veille à maintenir

À chaque revue mensuelle :

- activité récente du dépôt ;
- licence et changement de propriétaire ;
- plateformes ARM64/Linux ;
- formats de sortie structurée ;
- reprise de session ;
- mécanismes de permission ;
- support ACP/MCP/A2A ;
- stockage et migrations ;
- sandbox réelle ou simple worktree ;
- télémétrie coût/tokens ;
- incidents de sécurité ;
- dépendance à une API payante ;
- fonctions nouvelles à reproduire, intégrer ou ignorer.

## Liste de veille initiale

- `shep-ai/shep`
- `usemozzie/mozzie`
- `alamops/agetor`
- `agent-of-empires/agent-of-empires`
- `smtg-ai/claude-squad`
- `mco-org/squad`
- `timwuhaotian/the-pair`
- `builderz-labs/mission-control`
- `OpenHands/OpenHands`
- `Untrivial-ai/agent-orchestrator`
- `vilmire/adhdev`
- `mixpeek/amux`
- `asheshgoplani/agent-deck`
- `Aider-AI/aider`
- `anomalyco/opencode`
- `SWE-agent/mini-swe-agent`
- `oraios/serena`
- `yamadashy/repomix`
- `gastownhall/beads`
- `gitleaks/gitleaks`
- `github/spec-kit`
- `cline/cline`

---

# Conclusion

Le concept de Super IA est validé par plusieurs projets indépendants, mais le produit idéal pour notre usage n'existe pas encore sous la forme voulue. La meilleure direction n'est pas de cloner le concurrent le plus riche. Elle est de construire un cœur minimal, observable et reproductible, puis de connecter les meilleurs workers et outils existants.

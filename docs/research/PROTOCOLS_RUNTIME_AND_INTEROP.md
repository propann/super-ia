# Protocoles, runtimes et interopérabilité

Dernière revue : 14 août 2026.

## But

Super IA doit connecter des agents hétérogènes sans coupler le cœur à leurs interfaces internes. Cette étude compare les protocoles et transports utilisables pour :

- lancer un agent ;
- suivre sa progression ;
- transmettre du contexte ;
- recevoir des questions et approbations ;
- arrêter et reprendre une session ;
- échanger des tâches entre plusieurs workers ;
- exposer des outils locaux ;
- conserver un journal auditable.

---

# 1. Ne pas confondre les protocoles

| Protocole / interface | Relation principale | Ce qu'il standardise | Ce qu'il ne remplace pas |
|---|---|---|---|
| ACP — Agent Client Protocol | client/éditeur ↔ agent de code | sessions, événements, capacités, outils et interactions | le moteur de tâches global et la mémoire projet |
| MCP — Model Context Protocol | application IA ↔ outils/contexte | tools, resources, prompts, transports et capacités | l'orchestration multi-agent et Git |
| A2A — Agent2Agent | agent autonome ↔ agent autonome | découverte, tâches, messages, streaming, travaux longs | l'exécution locale simple d'un CLI |
| CLI JSON / JSONL | orchestrateur ↔ processus | entrée/sortie structurée propre au fournisseur | un standard commun entre fournisseurs |
| terminal/tmux | humain/orchestrateur ↔ programme interactif | session terminal persistante | événements sémantiques fiables |
| REST/OpenAPI | service ↔ service | API réseau explicite et documentée | les garanties locales de Git et sandbox |
| SQLite | processus locaux ↔ état partagé | stockage, files et transactions | le transport d'outils ou de tokens du modèle |

La première règle d'architecture est donc : **un seul protocole ne résoudra pas tout**.

---

# 2. Agent Client Protocol — ACP

Sources :

- https://agentclientprotocol.com/
- https://github.com/agentclientprotocol/agent-client-protocol
- https://agentclientprotocol.github.io/typescript-sdk/

## Rôle

ACP standardise la relation entre un client — éditeur, interface ou orchestrateur — et un agent de code. Il vise un effet comparable à LSP pour les agents : éviter une intégration différente pour chaque couple client/agent.

## Avantages pour Super IA

- transport structuré plutôt que scraping du terminal ;
- négociation de capacités ;
- sessions locales ou distantes ;
- événements et appels d'outils structurés ;
- SDK TypeScript officiel ;
- registre d'agents stabilisé pour découverte/configuration ;
- adopté ou utilisé par plusieurs outils étudiés.

## Risques

- le protocole évolue ;
- ACP v2 reste expérimental lors de la revue ;
- tous les agents ne l'implémentent pas ;
- certains agents exposent moins de fonctions via ACP que dans leur CLI native ;
- il ne définit pas notre cycle `mission → test → audit → merge`.

## Décision

ACP devient le **transport préféré**, pas une dépendance exclusive.

Ordre de connexion prévu :

```text
1. ACP stable si l'agent le fournit
2. mode CLI natif JSON ou stream-json
3. transcription JSONL documentée
4. CLI one-shot texte avec parseur strict
5. terminal interactif/tmux avec détection heuristique
6. web assisté manuel
```

Chaque adaptateur doit annoncer le niveau réellement disponible.

---

# 3. Model Context Protocol — MCP

Sources :

- https://modelcontextprotocol.io/docs/learn/architecture
- https://modelcontextprotocol.io/specification/

## Rôle

MCP connecte une application IA à des outils et données. L'architecture comprend un host, un client par serveur et des serveurs locaux ou distants. Les échanges utilisent JSON-RPC et des transports tels que stdio ou HTTP.

## Utilité dans Super IA

MCP est utile pour exposer :

- lecture structurée des missions ;
- recherche Git et symboles ;
- état des worktrees ;
- résultats de tests ;
- file de tâches ;
- documentation et mémoire ;
- coûts et rapports ;
- actions limitées comme demander une validation.

Un agent connecté à Super IA pourrait ainsi utiliser des outils comme :

```text
superia_repository_scan
superia_context_search
superia_task_get
superia_task_claim
superia_checkpoint_write
superia_test_run
superia_diff_get
superia_review_submit
```

## Ce que MCP ne doit pas faire

- décider seul du workflow ;
- devenir la base de données officielle ;
- exposer toutes les commandes shell ;
- remplacer le système de permissions ;
- transporter des centaines d'outils simultanément.

La documentation MCP précise que le protocole traite l'échange de contexte ; il ne dicte pas comment l'application orchestre les LLM. La version 2026 formalise notamment un noyau stateless et des extensions. L'état métier reste donc dans Super IA.

## Risques

- serveurs communautaires non audités ;
- prompt injection par ressources ou descriptions d'outils ;
- confusion entre identité utilisateur, identité agent et identité serveur ;
- trop grand nombre d'outils proposé au modèle ;
- outils aux effets trop larges ;
- changement de spécification et compatibilité de versions.

## Décision

- MCP facultatif dans le MVP ;
- serveur MCP Super IA en lecture seule d'abord ;
- outils d'écriture ajoutés un par un avec politiques ;
- registre allowlist et version épinglée ;
- descriptions et sorties traitées comme données non fiables ;
- jamais de serveur MCP installé automatiquement sans revue.

---

# 4. Agent2Agent — A2A

Sources :

- https://a2a-protocol.org/
- https://github.com/a2aproject/A2A

## Rôle

A2A vise la communication entre agents indépendants, potentiellement distants et construits avec des technologies différentes. Il couvre découverte, capacités, tâches, artefacts, streaming et opérations longues.

## Cas utile futur

```text
Pi 5 de contrôle
    ├── worker laptop Linux
    ├── worker VPS
    ├── worker machine GPU
    └── worker d'un autre utilisateur ou service
```

A2A pourrait servir lorsque ces workers deviennent de vrais services autonomes avec leurs propres politiques et files de tâches.

## Pourquoi pas dans le MVP

- notre premier système est local et sous un seul contrôle ;
- SQLite + processus locaux suffisent ;
- authentification, découverte réseau et compatibilité ajoutent beaucoup de complexité ;
- le protocole ne remplace pas la sandbox ni les règles Git.

## Décision

A2A est placé dans une couche future `remote-worker`. Le contrat interne des missions doit toutefois rester suffisamment propre pour permettre un pont A2A plus tard.

---

# 5. Sorties CLI structurées

## Types observés

### JSON one-shot

Le processus reçoit un prompt et retourne un objet final. Idéal pour planification, audit ou petite mission.

### JSONL / stream-json

Chaque ligne décrit un événement : message, outil, résultat, usage, erreur ou fin. C'est le meilleur fallback à ACP.

### Transcription native

Certains agents écrivent leurs propres fichiers de session. Ils peuvent aider à la reprise, mais leur format interne peut changer.

### Texte terminal

Ultime fallback. Il faut éviter d'inférer des états critiques depuis des couleurs ANSI ou des phrases variables.

## Contrat normalisé Super IA

Tous les adaptateurs doivent produire les mêmes événements internes :

```ts
interface AgentEvent {
  id: string;
  missionId: string;
  runId: string;
  sequence: number;
  timestamp: string;
  kind:
    | "run.started"
    | "agent.message"
    | "agent.thought-summary"
    | "tool.requested"
    | "tool.started"
    | "tool.completed"
    | "file.changed"
    | "command.started"
    | "command.completed"
    | "user.question"
    | "approval.requested"
    | "usage.reported"
    | "checkpoint.created"
    | "run.completed"
    | "run.failed"
    | "run.cancelled";
  payload: unknown;
  rawRef?: string;
}
```

Les pensées privées détaillées ne sont pas nécessaires. Super IA conserve les messages, actions, preuves, résumés fournis et événements observables.

---

# 6. Contrat d'adaptateur agent

```ts
interface AgentAdapter {
  identity: {
    id: string;
    name: string;
    version?: string;
    transport: "acp" | "json" | "jsonl" | "text" | "terminal" | "web-assisted";
  };

  capabilities: {
    plan: boolean;
    write: boolean;
    shell: boolean;
    resume: boolean;
    askUser: boolean;
    approvals: boolean;
    modelSelection: boolean;
    usageTelemetry: boolean;
    nativeSandbox: boolean;
    structuredDiff: boolean;
  };

  detect(): Promise<DetectionResult>;
  authenticate(): Promise<AuthState>;
  prepare(run: RunRequest): Promise<PreparedRun>;
  start(run: PreparedRun, sink: EventSink): Promise<RunHandle>;
  send?(handle: RunHandle, message: AgentInput): Promise<void>;
  approve?(handle: RunHandle, approval: ApprovalDecision): Promise<void>;
  stop(handle: RunHandle): Promise<void>;
  resume?(checkpoint: AgentCheckpoint, sink: EventSink): Promise<RunHandle>;
  collect(handle: RunHandle): Promise<AgentRunResult>;
}
```

## Informations obligatoires

- commande exacte et arguments ;
- version détectée ;
- mode d'authentification ;
- modèle demandé et modèle réellement rapporté ;
- dossier de travail ;
- variables d'environnement autorisées ;
- niveau de permission ;
- chemin des transcriptions ;
- PID et groupe de processus ;
- heure de départ/fin ;
- code de sortie ;
- usage et coût lorsque fournis.

---

# 7. Processus et sessions

## Processus one-shot par défaut

Inspiré de mini-SWE-agent : une action indépendante est plus facile à journaliser, interrompre et sandboxer qu'un shell permanent opaque.

## Session interactive seulement lorsque nécessaire

Les sessions longues sont utiles pour :

- questions de clarification ;
- modes plan interactifs ;
- reprise native d'un agent ;
- tâches longues nécessitant plusieurs tours.

Elles doivent rester secondaires par rapport à l'état officiel de mission.

## Arbre de processus

Le runner doit :

- créer un groupe de processus ;
- capturer stdout/stderr séparément ;
- plafonner la taille des flux ;
- envoyer SIGTERM puis SIGKILL après délai ;
- tuer les descendants ;
- conserver les dernières lignes en cas d'échec ;
- ne jamais considérer la fermeture du terminal comme preuve d'achèvement.

## Réconciliation au redémarrage

Pour chaque run marqué `running` :

1. vérifier PID, verrou et worktree ;
2. vérifier si le processus appartient encore à Super IA ;
3. rattacher le flux si possible ;
4. sinon marquer `interrupted` ;
5. conserver worktree et artefacts ;
6. proposer `resume`, `retry`, `inspect` ou `cancel`.

---

# 8. Bus local et communication multi-agent

## Option retenue : SQLite + événements append-only

Le modèle de Squad confirme qu'une collaboration locale peut fonctionner sans broker réseau.

Tables minimales :

```text
agents
agent_capabilities
missions
mission_dependencies
runs
events
messages
questions
approvals
checkpoints
artifacts
receipts
locks
```

## Garanties nécessaires

- transactions courtes ;
- WAL ;
- monotonic sequence par run ;
- identifiants ULID/UUIDv7 ;
- claim atomique des tâches ;
- lease avec expiration pour workers ;
- idempotency key par commande ;
- événements immuables ;
- vues matérialisées ou colonnes d'état dérivées ;
- aucune coordination importante uniquement dans un prompt.

## Message libre versus tâche structurée

Les agents peuvent s'envoyer des notes, mais le travail important utilise :

```text
create → claim → acknowledge → progress → submit → review → accept/reject → complete
```

Cette structure évite les conversations infinies et facilite la reprise.

---

# 9. Graphes et workflows

## Machine à états avant framework

Le MVP doit utiliser une machine à états déterministe :

```text
DRAFT
  → PLANNED
  → READY
  → RUNNING
  → VALIDATING
  → REVIEW
  → APPROVAL
  → DONE
```

Sorties alternatives :

```text
BLOCKED
FAILED_RETRYABLE
FAILED_FINAL
CANCELLED
INTERRUPTED
```

## Graphes de dépendances

Chaque mission peut dépendre d'autres missions. Le moteur doit :

- refuser les cycles ;
- lancer uniquement les nœuds dont les dépendances sont acceptées ;
- limiter le parallélisme ;
- détecter les chevauchements de fichiers ;
- interrompre les descendants si une dépendance critique échoue ;
- recalculer l'état après reprise.

## LangGraph, Mastra et autres frameworks

Ils offrent persistance, graphes, interruptions et observabilité. Ils restent des candidats futurs. Le MVP doit d'abord prouver que notre modèle d'état est juste avec du TypeScript et SQLite. Une abstraction de workflow permettra ensuite de brancher un moteur sans réécrire le domaine.

---

# 10. Versionnement du protocole interne

Chaque événement et commande doit inclure :

```json
{
  "schemaVersion": 1,
  "producer": "adapter.codex",
  "producerVersion": "x.y.z",
  "missionId": "TASK-0042",
  "runId": "RUN-...",
  "idempotencyKey": "..."
}
```

Les migrations doivent être ascendantes. Les événements bruts ne sont jamais réécrits ; les projections peuvent être reconstruites.

---

# 11. Sécurité des protocoles

## Frontières de confiance

```text
utilisateur
  ↓
Super IA control plane
  ↓
adaptateur agent
  ↓
processus agent
  ↓
outils / dépôt / réseau
```

Chaque frontière applique ses propres contrôles.

## Menaces principales

- prompt injection dans le dépôt ou une issue ;
- outil MCP empoisonné ;
- serveur distant usurpé ;
- sortie terminal conçue pour tromper le parseur ;
- agent qui demande une permission plus large ;
- processus enfant qui survit à l'annulation ;
- événement dupliqué ou rejoué ;
- message d'un agent se faisant passer pour l'utilisateur ;
- contexte contenant un secret ;
- confusion entre approbation de lecture, commande, réseau et fusion.

## Contrôles

- identité signée ou session locale authentifiée ;
- capacités allowlistées ;
- validation de schéma ;
- limites de taille ;
- timeouts ;
- idempotency keys ;
- permissions séparées par type d'action ;
- secret scan ;
- journal d'audit ;
- confirmation humaine explicite ;
- serveur local lié à `127.0.0.1` par défaut ;
- TLS et authentification forte avant accès réseau.

---

# 12. Décision finale

## MVP

```text
SQLite + JSONL
Git worktrees
processus CLI one-shot
sorties JSON/JSONL natives
fallback texte strict
machine à états interne
```

## V0.x suivante

```text
ACP client
MCP server lecture seule
sessions interactives reprises
websocket/SSE pour la console web
```

## Futur distribué

```text
A2A ou protocole worker dédié
workers signés
files distantes
artefacts transférés par hash
```

Super IA ne choisit donc pas un protocole unique. Il utilise le protocole le plus structuré disponible, normalise tout en événements internes et garde l'état officiel dans un modèle local indépendant.

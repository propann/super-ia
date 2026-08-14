# Architecture de référence Super IA

Dernière revue : 14 août 2026.

## Décision principale

Le Raspberry Pi 5 est le **plan de contrôle permanent**. Il n'héberge aucun modèle IA dans le MVP.

Il exécute :

- Git et les worktrees ;
- la base SQLite ;
- le journal d'événements ;
- la console Matrix ;
- les agents CLI qui utilisent leurs services distants officiels ;
- les tests raisonnables ;
- les sauvegardes ;
- la surveillance et la reprise des missions.

Un Pi 4 ou Pi 5 pourra servir plus tard de laboratoire pour un petit modèle local si un benchmark démontre un bénéfice réel. Ce scénario est isolé du cœur et n'est jamais requis.

---

# 1. Objectifs non négociables

1. **Git est la vérité du code.**
2. **SQLite est la vérité de l'état des missions.**
3. **Les événements bruts sont append-only.**
4. **Chaque run est reproductible depuis un SHA et un manifeste de contexte.**
5. **Chaque agent est remplaçable.**
6. **Aucune API payante n'est nécessaire pour démarrer.**
7. **Aucune fusion automatique sur la branche protégée.**
8. **Le constructeur ne valide pas seul son propre travail.**
9. **Une affirmation d'agent n'est pas une preuve.**
10. **Le système doit reprendre après coupure électrique ou perte SSH.**
11. **Les secrets ne quittent jamais silencieusement la machine.**
12. **Le système doit rester utilisable sans interface web.**

---

# 2. Vue générale

```text
Téléphone / ordinateur
       │ SSH, TUI ou web local optionnel
       ▼
┌─────────────────────────────────────────────────────┐
│ Raspberry Pi 5 — SUPER IA CONTROL PLANE            │
│                                                     │
│  CLI / Matrix TUI / API locale                      │
│             │                                       │
│  Mission Service ─── Workflow Engine                │
│       │                 │                            │
│  Context Builder       Scheduler                    │
│       │                 │                            │
│  Git Service       Agent Runtime Manager            │
│       │                 │                            │
│  SQLite + JSONL + artefacts + sauvegardes            │
└───────────┬─────────────────────────────┬───────────┘
            │ processus CLI              │ futur worker distant
            ▼                            ▼
   Codex / Claude / Vibe /         laptop / VPS / machine GPU
   Gemini / Qwen / Aider / etc.
            │
            ▼
   services modèles officiels
```

Le plan de contrôle ne dépend pas d'un fournisseur. Les agents s'exécutent comme des workers avec des capacités et permissions déclarées.

---

# 3. Couches logicielles

## 3.1 Domaine

Objets indépendants de GitHub, SQLite et des agents :

```text
Repository
Project
Mission
Task
Dependency
Run
AgentDefinition
AgentCapability
ContextManifest
Checkpoint
Artifact
Evidence
Review
Approval
Receipt
Budget
Policy
```

Le domaine définit les invariants :

- une mission possède un commit de départ ;
- un run appartient à une mission ;
- un run d'écriture possède un worktree ;
- un reviewer ne peut pas être le même run que le constructeur ;
- un statut `done` exige un receipt valide ;
- un merge exige une approbation selon la politique ;
- un événement ne peut pas être modifié après écriture.

## 3.2 Application

Cas d'usage :

```text
RegisterRepository
ScanRepository
CreateMission
BuildContext
AssignAgent
StartRun
StopRun
ResumeRun
CreateCheckpoint
ValidateRun
RequestReview
SubmitReview
ApproveMission
PublishBranch
CreatePullRequest
ArchiveMission
RestoreMission
```

## 3.3 Infrastructure

Adaptateurs :

```text
GitCliAdapter
SQLiteMissionRepository
JsonlEventStore
FileArtifactStore
ResticBackupAdapter
GitleaksSecretScanner
RepomixContextAdapter
TreeSitterIndexAdapter
BubblewrapSandboxAdapter
PodmanSandboxAdapter
CodexAdapter
ClaudeAdapter
VibeAdapter
GeminiAdapter
GenericCliAdapter
GitHubAdapter
```

## 3.4 Présentation

- CLI scriptable ;
- TUI Matrix ;
- API locale ;
- web mobile facultatif ;
- exports JSON/Markdown.

Les interfaces ne contiennent aucune logique métier majeure.

---

# 4. Organisation des données

```text
/srv/superia/
├── config/
│   ├── superia.json
│   ├── policies/
│   └── providers/
├── repos/
│   ├── mirrors/
│   └── checkouts/
├── worktrees/
│   └── <project>/<mission>/
├── state/
│   ├── superia.sqlite
│   ├── events/
│   ├── locks/
│   └── runtime/
├── contexts/
│   └── <mission>/<context-hash>/
├── transcripts/
│   └── <run>/
├── artifacts/
│   ├── patches/
│   ├── test-results/
│   ├── reviews/
│   └── receipts/
├── caches/
│   ├── indexes/
│   ├── package-managers/
│   └── provider-metadata/
└── backups/
```

## Sauvegardé en priorité

- base SQLite ;
- événements ;
- manifests de contexte ;
- spécifications et décisions ;
- receipts ;
- configuration sans secrets ;
- clés de chiffrement stockées séparément ;
- branches Git non publiées importantes.

## Reconstructible et exclu des sauvegardes fréquentes

- `node_modules` ;
- caches de package managers ;
- index Tree-sitter ;
- sorties de build ;
- worktrees terminés ;
- clones déjà présents sur origin, sauf branches locales non poussées.

---

# 5. Schéma SQLite initial

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  remote_url TEXT,
  default_branch TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL,
  base_ref TEXT NOT NULL,
  base_sha TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  worktree_path TEXT,
  budget_json TEXT NOT NULL,
  policy_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE mission_dependencies (
  mission_id TEXT NOT NULL,
  depends_on_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  PRIMARY KEY (mission_id, depends_on_id)
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL,
  transport TEXT NOT NULL,
  status TEXT NOT NULL,
  pid INTEGER,
  started_at TEXT,
  finished_at TEXT,
  exit_code INTEGER,
  context_hash TEXT,
  checkpoint_id TEXT
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  run_id TEXT,
  mission_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (run_id, sequence)
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  run_id TEXT,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  run_id TEXT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  decision TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE receipts (
  mission_id TEXT PRIMARY KEY,
  base_sha TEXT NOT NULL,
  result_sha TEXT,
  validation_json TEXT NOT NULL,
  review_json TEXT NOT NULL,
  risks_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

La première migration restera plus petite ; ce schéma décrit la cible logique.

---

# 6. Cycle d'une mission

```text
1. CREATE
2. INSPECT
3. SPECIFY
4. PLAN
5. CONTEXTUALIZE
6. ASSIGN
7. PREPARE WORKTREE
8. EXECUTE
9. VALIDATE
10. REVIEW
11. REPAIR si nécessaire
12. APPROVE
13. PUBLISH
14. ARCHIVE
```

## Transitions

```text
DRAFT
 └─> INSPECTING
      └─> PLANNED
           └─> READY
                └─> RUNNING
                     ├─> BLOCKED
                     ├─> INTERRUPTED
                     ├─> FAILED_RETRYABLE
                     └─> VALIDATING
                          ├─> FAILED_RETRYABLE
                          └─> REVIEW
                               ├─> REJECTED → READY
                               └─> APPROVAL
                                    └─> DONE
```

Chaque transition est un cas d'usage transactionnel et produit un événement.

---

# 7. Inspection du dépôt

Le scanner local produit un instantané :

```json
{
  "repository": "super-ia",
  "baseSha": "...",
  "dirty": false,
  "languages": ["TypeScript"],
  "manifests": ["package.json"],
  "instructions": ["AGENTS.md", "README.md"],
  "checks": ["npm test", "npm run build"],
  "riskSignals": [],
  "size": {
    "files": 0,
    "bytes": 0,
    "estimatedTokens": 0
  }
}
```

## Instructions hiérarchiques

Ordre :

1. règles système Super IA ;
2. politique globale utilisateur ;
3. `AGENTS.md` racine ;
4. `AGENTS.md` le plus proche de chaque fichier ;
5. instructions spécifiques de mission.

Les conflits sont affichés, jamais silencieusement résolus par le modèle.

---

# 8. Constructeur de contexte

## Entrées

- objectif ;
- base SHA ;
- fichiers explicitement cités ;
- diff courant ;
- erreurs de tests ;
- instructions ;
- symboles et dépendances ;
- historique récent pertinent ;
- budget de tokens.

## Pipeline

```text
Git ls-files
  ↓
exclusions et politique
  ↓
scan Gitleaks
  ↓
recherche ripgrep
  ↓
imports et symboles Tree-sitter/LSP
  ↓
classement des fichiers
  ↓
compression structurelle optionnelle
  ↓
manifest + hash
  ↓
paquet fournisseur
```

## Score initial d'un fichier

```text
+100 explicitement demandé
+90 actuellement modifié
+80 contient une erreur de test
+70 définit le symbole recherché
+60 import direct
+40 test associé
+30 récemment modifié dans Git
+20 même module
-100 fichier secret/interdit
-50 généré ou vendored
```

Ce score sera affiné par les benchmarks.

## Manifeste

```json
{
  "version": 1,
  "missionId": "TASK-0042",
  "baseSha": "...",
  "createdAt": "...",
  "budgetTokens": 50000,
  "estimatedTokens": 18420,
  "secretScan": "passed",
  "files": [
    {
      "path": "src/auth.ts",
      "sha256": "...",
      "reason": ["explicit", "symbol:AuthService"],
      "mode": "full"
    }
  ]
}
```

Aucune IA ne reçoit « le dépôt entier » sans justification et consentement.

---

# 9. Agent Registry

Chaque agent est enregistré avec :

```yaml
id: codex-cli
displayName: OpenAI Codex CLI
command: codex
transports:
  - native-json
roles:
  - planner
  - builder
  - reviewer
auth:
  type: account-login
cost:
  type: included-quota
permissions:
  supportsReadOnly: true
  supportsWorktreeWrite: true
  supportsShellPolicy: true
resume:
  supported: true
telemetry:
  tokens: partial
  cost: partial
```

## Détection

- binaire présent ;
- version ;
- architecture ;
- état de connexion lorsque vérifiable sans exposer de secret ;
- modes disponibles ;
- formats de sortie ;
- tests de santé non facturés lorsque possible.

## Aucun quota gravé en dur

Les offres changent. Le registre conserve seulement :

- source de coût ;
- plafond configuré par l'utilisateur ;
- usage observé ;
- erreurs de quota récentes ;
- prochaine fenêtre connue si le fournisseur l'indique.

---

# 10. Routeur

Le routeur filtre d'abord, puis classe.

## Filtres durs

- installé et authentifié ;
- transport compatible ;
- capacité demandée ;
- budget restant ;
- politique réseau ;
- confidentialité ;
- architecture ARM64 ;
- niveau d'autonomie autorisé ;
- pas de conflit de fichiers.

## Score

```text
score =
  qualité_mesurée * 0.35
+ réussite_sur_ce_dépôt * 0.20
+ respect_des_permissions * 0.15
+ coût_normalisé * 0.10
+ vitesse * 0.05
+ qualité_du_rapport * 0.05
+ disponibilité * 0.05
+ indépendance_du_reviewer * 0.05
```

Les coefficients deviennent configurables.

## Règles

- le reviewer doit être différent du constructeur quand deux agents sont disponibles ;
- les tâches triviales ne lancent pas plusieurs grands modèles ;
- une mission à haut risque exige tests + review + approbation ;
- une tâche sans agent éligible reste bloquée et explique pourquoi ;
- aucun fallback payant silencieux.

---

# 11. Exécution et sandbox

## Niveaux

### Niveau 0 — lecture seule

- dépôt monté en lecture seule lorsque possible ;
- aucun réseau sauf besoin explicite ;
- aucun secret.

### Niveau 1 — worktree contrôlé

- écriture limitée au worktree ;
- commandes allowlistées ou approuvées ;
- pas de merge/push.

### Niveau 2 — sandbox Linux

- bubblewrap ;
- HOME temporaire ;
- réseau désactivé par défaut ;
- montages ciblés ;
- limites CPU/mémoire/temps.

### Niveau 3 — conteneur

- Podman rootless ou Docker ;
- image définie par le projet ;
- volumes minimaux ;
- aucune socket Docker exposée à l'agent.

## Worktree ≠ sandbox

Un worktree évite les conflits Git, mais n'empêche pas un processus de lire `$HOME`, les clés SSH ou les autres dépôts. La documentation et l'interface doivent le rappeler explicitement.

---

# 12. Validation

## Gates déterministes

- `git diff --check` ;
- format ;
- lint ;
- typecheck ;
- tests ciblés ;
- tests complets selon risque ;
- build ;
- scan de secrets ;
- scan de dépendances optionnel ;
- vérification des fichiers autorisés ;
- taille du diff et fichiers binaires.

## Audit agent

Le reviewer reçoit :

- mission et critères ;
- diff ;
- tests et logs ;
- liste des fichiers ;
- décisions d'architecture ;
- limites connues.

Réponse structurée :

```json
{
  "verdict": "pass|fail|needs-human",
  "findings": [
    {
      "severity": "blocker|high|medium|low",
      "path": "src/file.ts",
      "line": 42,
      "claim": "...",
      "evidence": "...",
      "recommendedAction": "..."
    }
  ],
  "residualRisks": []
}
```

Les findings non reliés à une preuve sont marqués non confirmés.

---

# 13. Receipt d'achèvement

```json
{
  "missionId": "TASK-0042",
  "baseSha": "...",
  "resultSha": "...",
  "branch": "task/TASK-0042-auth",
  "contextHash": "...",
  "builder": {
    "agent": "codex-cli",
    "version": "...",
    "model": "..."
  },
  "validation": {
    "commands": [],
    "passed": true
  },
  "review": {
    "agent": "mistral-vibe",
    "verdict": "pass"
  },
  "approvals": [],
  "risks": [],
  "artifacts": []
}
```

Le receipt est signé par hash des artefacts. Il ne garantit pas l'absence absolue de bug, mais prouve ce qui a réellement été exécuté et observé.

---

# 14. Reprise après panne

Au démarrage :

1. ouvrir SQLite en WAL ;
2. vérifier migrations ;
3. lire les leases expirés ;
4. inspecter les groupes de processus ;
5. inspecter worktrees et branches ;
6. marquer les runs orphelins `interrupted` ;
7. reconstruire les projections depuis les événements si nécessaire ;
8. vérifier l'intégrité des artefacts ;
9. afficher les missions nécessitant une décision ;
10. démarrer la sauvegarde seulement après cohérence.

## Checkpoint

Un checkpoint contient :

- état de mission ;
- dernier événement ;
- SHA du worktree ;
- diff non commité ;
- transcript offset ;
- identifiant de session fournisseur ;
- prompt/résumé de reprise ;
- prochaine action attendue.

---

# 15. Git et publication

## Branches

```text
task/TASK-0042-slug
audit/TASK-0042-slug
integration/TASK-0042-slug
```

## Publication

- commit local contrôlé ;
- push uniquement après validation ou règle explicite ;
- PR brouillon ;
- surveillance CI ;
- correction bornée ;
- aucun merge sans accord humain dans le mode personnel par défaut.

## Conflits

Avant parallélisation, Super IA calcule les zones probables. Si deux missions ciblent les mêmes fichiers ou symboles, elles sont sérialisées ou placées dans des branches empilées.

---

# 16. Observabilité

Métriques essentielles :

```text
missions par état
runs actifs
agents disponibles
temps par phase
coût/tokens rapportés
nombre de retries
validation pass/fail
questions en attente
approbations en attente
worktrees orphelins
disques et sauvegardes
```

Les logs textuels ne remplacent pas les événements structurés.

---

# 17. Services systemd

```text
superia.service
  API locale + scheduler + état

superia-worker@.service
  workers isolables si nécessaire

superia-backup.timer
  sauvegarde SQLite, événements et artefacts

superia-health.timer
  Git, worktrees, espace disque, DB, agents
```

Le MVP peut commencer dans un seul processus. La séparation worker arrive lorsque l'isolation et la reprise l'exigent.

---

# 18. Plan de livraison

## Phase A — état fiable

- SQLite ;
- migrations ;
- événements JSONL ;
- machine à états ;
- reprise et leases ;
- receipts simples.

## Phase B — contexte

- scan Git ;
- AGENTS.md hiérarchique ;
- ripgrep ;
- Gitleaks ;
- manifest et hash ;
- Repomix optionnel ;
- index Tree-sitter.

## Phase C — exécution

- runner de processus ;
- Generic CLI Adapter ;
- Codex ;
- Mistral Vibe ;
- Claude ;
- Gemini ;
- stop/reprise ;
- permissions.

## Phase D — qualité

- gates ;
- reviewer indépendant ;
- budgets de retries ;
- receipts complets ;
- benchmark interne.

## Phase E — interfaces

- Matrix TUI interactive ;
- API locale ;
- web mobile ;
- notifications.

## Phase F — distribution

- workers distants ;
- A2A ou protocole dédié ;
- multi-machine ;
- haute disponibilité seulement si utile.

---

# 19. Ce que nous réutilisons et ce que nous construisons

## Réutiliser

- agents de code existants ;
- Git ;
- SQLite ;
- Gitleaks ;
- Restic ;
- Repomix ;
- bubblewrap/Podman ;
- gh ;
- ACP/MCP SDKs lorsque stables ;
- Tree-sitter.

## Construire

- modèle de mission commun ;
- mémoire projet ;
- manifest de contexte ;
- routeur coût/qualité ;
- événements normalisés ;
- politique de permissions ;
- receipt de preuve ;
- reprise multi-fournisseurs ;
- console Matrix ;
- benchmark spécifique aux projets.

## Ne pas construire

- un nouveau grand modèle ;
- un nouveau Git ;
- un IDE complet ;
- un terminal multiplexer complet ;
- un système de conteneurs ;
- un moteur vectoriel obligatoire ;
- une plateforme cloud propriétaire.

---

# Conclusion

L'architecture idéale est volontairement moins spectaculaire qu'un essaim libre : un plan de contrôle déterministe, une mémoire durable, des workers remplaçables et des preuves à chaque étape. Cette discipline permet d'utiliser davantage d'IA sans rendre le projet plus fragile ni plus coûteux.

# Adaptateurs d'agents

Super IA 0.9 possède deux adaptateurs exécutables : OpenAI Codex CLI et Mistral Vibe CLI.

Ils utilisent le même pipeline :

```text
mission TASK-XXXX
    ↓
contexte Git ciblé + manifeste SHA-256
    ↓
lease SQLite exclusif
    ↓
runner sans shell implicite
    ↓
CLI officielle
    ↓
JSONL + dernière réponse + logs
    ↓
validation séparée
    ↓
receipt vérifiable
```

Les tests automatisés utilisent de faux exécutables locaux. Ils valident le transport, les arguments, les budgets, les artefacts et la persistance sans consommer de quota. Une exécution réelle avec les comptes du Pi reste à effectuer.

## Codex CLI

Prévisualisation :

```bash
superia agent run codex TASK-0001 --mode plan --dry-run
```

Exécution :

```bash
superia agent run codex TASK-0001 --mode plan
```

Modes :

- `plan` : lecture seule ;
- `review` : lecture seule ;
- `build` : écriture dans un worktree existant.

Le mode build est refusé si la mission ne possède pas de worktree.

Le prompt est envoyé par stdin. L'adaptateur utilise le mode `codex exec`, la sortie JSONL, une session éphémère et la sandbox officielle :

- `read-only` pour plan/review ;
- `workspace-write` pour build.

Les options de contournement de sandbox ou d'approbation sont interdites par validation interne.

Options utiles :

```bash
--model <nom>
--timeout-minutes 60
--max-context-bytes 300000
```

Artefacts :

```text
.superia/contexts/CTX-.../
├── MISSION.md
├── CONTEXT.md
├── MANIFEST.json
├── CODEX_EVENTS.json
├── CODEX_LAST_MESSAGE.md
└── AGENT_RESULT.json
```

## Mistral Vibe

Prévisualisation :

```bash
superia agent run vibe TASK-0001 --mode plan --dry-run
```

Exécution avec budget strict :

```bash
superia agent run vibe TASK-0001 \
  --mode plan \
  --max-turns 8 \
  --max-tokens 50000 \
  --max-price 0.25
```

Politique :

- plan/review utilisent le profil `plan` ;
- build utilise `accept-edits` ;
- `auto-approve` n'est jamais utilisé ;
- le shell Vibe est explicitement désactivé avec `bash*` ;
- plan/review n'obtiennent que lecture et recherche ;
- build obtient lecture, recherche et édition de fichiers ;
- les tests sont lancés ensuite par le runner Super IA, pas par Vibe.

Le mode programmatique est forcé avec un prompt CLI vide, tandis que le vrai paquet est transmis par stdin. Le contenu de la mission n'apparaît donc pas dans la liste des processus.

Le modèle optionnel est transmis via `VIBE_ACTIVE_MODEL`, pas dans les arguments de ligne de commande.

Plafonds :

- prix par défaut : 0,25 USD ;
- maximum accepté par Super IA : 5 USD ;
- tours par défaut : 8 ;
- tokens par défaut : 50 000.

Artefacts :

```text
.superia/contexts/CTX-.../
├── MISSION.md
├── CONTEXT.md
├── MANIFEST.json
├── VIBE_EVENTS.json
├── VIBE_OUTPUT.json
└── AGENT_RESULT.json
```

## Verrou de mission

Un lease SQLite protège :

```text
agent:<project-id>:<task-id>
```

Deux workers ne peuvent pas exécuter simultanément la même mission. Le lease possède une expiration et peut être repris après expiration.

## Environnement

Le runner ne transmet qu'une liste réduite de variables. Les clés spécifiques doivent être explicitement autorisées par l'adaptateur.

Codex :

```text
CODEX_HOME
```

Vibe :

```text
MISTRAL_API_KEY
VIBE_HOME
VIBE_ACTIVE_MODEL
```

Les valeurs de secrets ne sont jamais enregistrées dans les métadonnées du run.

## Limites actuelles

- pas encore de benchmark réel Codex contre Vibe sur le même dépôt ;
- pas de routeur automatique qualité/coût ;
- pas de reprise de session native après interruption ;
- pas de sandbox système générale pour les futurs agents ;
- Vibe build ne possède volontairement aucun shell ;
- aucun merge automatique.

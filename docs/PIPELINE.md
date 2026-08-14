# Pipeline multi-agent contrôlé

## Objectif

Exécuter une mission avec deux agents distincts sans conversation libre infinie :

```text
builder → contrôles Git → validations → reviewer → receipt → humain
```

Le pipeline n'effectue aucune fusion automatique.

## Prérequis

La mission doit posséder :

- un worktree ;
- au moins un chemin autorisé ;
- des commandes de validation détectables dans le dépôt ;
- Gitleaks et Bubblewrap, sauf dérogation explicite et journalisée ;
- deux fournisseurs différents.

Exemple :

```bash
superia task create "Ajouter une validation de jeton"

superia task update TASK-0001 \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "les tests d'authentification passent"

superia worktree TASK-0001
```

## Lancer

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe
```

Ou :

```bash
superia pipeline run TASK-0001 \
  --builder vibe \
  --reviewer codex \
  --max-turns 8 \
  --max-tokens 50000 \
  --max-price 0.25
```

Le builder et le reviewer identiques sont refusés avant tout lancement.

## Étapes

### 1. Builder

Le builder travaille en mode `build` dans le worktree. Il passe par :

- Gitleaks ;
- Bubblewrap ;
- lease exclusif ;
- contexte vérifiable ;
- limites propres au fournisseur.

### 2. Change guard

Super IA compare l'état Git avant et après le builder. Tout fichier hors `allowedPaths` fait échouer le run.

Artefacts :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

### 3. Validations locales

Les commandes détectées dans le dépôt sont exécutées dans le runner local. Un échec empêche le lancement du reviewer.

### 4. Reviewer indépendant

Le reviewer :

- utilise un autre fournisseur ;
- travaille en lecture seule ;
- ne peut modifier aucun fichier ;
- analyse le diff et la mission ;
- retourne un JSON structuré.

Schéma :

```json
{
  "verdict": "approve",
  "findings": [],
  "residualRisks": ["validation matérielle nécessaire"]
}
```

Un finding comprend :

```json
{
  "severity": "high",
  "category": "security",
  "summary": "Contrôle absent",
  "evidence": "src/auth.ts accepte un jeton sans vérifier son expiration",
  "recommendation": "Valider exp avant de créer la session",
  "file": "src/auth.ts",
  "line": 42
}
```

Une sortie non structurée produit automatiquement un verdict `blocked`.

### 5. Receipt

Le receipt du builder inclut :

- contexte et empreinte ;
- logs ;
- résultat agent ;
- patch ;
- change guard ;
- validations ;
- review ;
- identité et run du reviewer ;
- verdict ;
- empreintes SHA-256.

`humanApprovalRequired` reste toujours à `true`.

## Checkpoints

État par mission :

```text
.superia/pipelines/TASK-XXXX.json
```

Étapes possibles :

```text
initialized
builder-completed
validation-completed
review-completed
receipt-created
```

Afficher l'état :

```bash
superia pipeline status TASK-0001
superia pipeline status TASK-0001 --json
```

## Reprise

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

Règles :

- les fournisseurs doivent correspondre au checkpoint ;
- le worktree doit être identique ;
- un builder terminé n'est pas relancé ;
- des validations terminées avec succès ne sont pas relancées ;
- une review terminée n'est pas relancée ;
- un receipt manquant peut être recréé ;
- sans checkpoint builder complet, la reprise est refusée.

Cette dernière règle évite de relancer un agent sur un worktree potentiellement partiellement modifié après une coupure.

## Statuts de mission

```text
running  pendant builder et validations
review   pendant ou après une review approuvée
blocked  si le reviewer demande des changements
failed   si une étape technique échoue
```

Une mission en `review` attend encore une décision humaine.

## Dry-run

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --dry-run
```

Le dry-run prépare les deux invocations et les préflights sans démarrer de processus d'agent.

## Limites actuelles

- pas de boucle automatique de correction ;
- pas encore de budget maximal de retries ;
- pas encore de détection de patch identique ;
- pas de coût cumulé universel entre fournisseurs ;
- pas de fusion automatique ;
- les fournisseurs réels restent à tester sur le Pi cible.

# Pipeline multi-agent contrôlé

## Objectif

Exécuter une mission avec deux agents distincts sans conversation libre infinie :

```text
builder → contrôles Git → validations → reviewer → receipt → humain
```

Le pipeline n'effectue aucune fusion automatique.

## Prérequis

La mission possède :

- un worktree ;
- au moins un chemin autorisé ;
- des commandes de validation détectables ;
- Gitleaks et Bubblewrap, sauf dérogation explicite et journalisée ;
- deux fournisseurs différents.

```bash
superia task create "Ajouter une validation de jeton"

superia task update TASK-0001 \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "les tests d'authentification passent"

superia worktree TASK-0001
```

## Premier lancement

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Ou dans l'autre sens :

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

Le builder travaille en mode `build` dans le worktree. Il passe par Gitleaks, Bubblewrap, le lease exclusif, le contexte vérifiable et les limites propres au fournisseur.

### 2. Change guard

Super IA compare l'état Git avant et après le builder. Tout fichier hors `allowedPaths` fait échouer le run.

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

### 3. Validations locales

Les commandes détectées sont exécutées dans le runner local. Un échec empêche le reviewer de démarrer.

### 4. Reviewer indépendant

Le reviewer :

- utilise un autre fournisseur ;
- travaille en lecture seule ;
- ne peut modifier aucun fichier ;
- analyse le diff et la mission ;
- retourne un JSON structuré.

```json
{
  "verdict": "approve",
  "findings": [],
  "residualRisks": ["validation matérielle nécessaire"]
}
```

Un finding valide contient sévérité, catégorie, résumé, preuve et recommandation. Une sortie non structurée produit automatiquement `blocked`. Une approbation contenant un finding moyen, élevé ou critique devient `changes-requested`.

### 5. Receipt

Le receipt inclut contexte, logs, résultat agent, patch, change guard, validations, review, identité du reviewer et empreintes SHA-256. `humanApprovalRequired` reste toujours à `true`.

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

```bash
superia pipeline status TASK-0001
superia pipeline status TASK-0001 --json
```

## Reprise technique

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

Règles :

- fournisseurs et worktree identiques au checkpoint ;
- builder, validations et review déjà terminés non relancés ;
- receipt manquant recréable ;
- reprise refusée sans checkpoint builder complet.

## Correction bornée

Une review `changes-requested` peut être corrigée explicitement :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --retry
```

`--resume` reprend une interruption technique. `--retry` ouvre une nouvelle tentative de correction. Ils sont incompatibles dans la même commande.

La review précédente est transmise au builder via `feedbackPath`. Son contenu ne passe pas dans `argv`.

### Budgets immuables

Au premier lancement, Super IA fige :

```text
maxAttempts
maxTotalPriceUsd
reservedPerAttemptUsd
```

Une commande de retry ne peut pas augmenter ces plafonds. Chaque builder terminé consomme une tentative et son plafond réservé, même si les validations échouent ensuite.

Le coût enregistré est un **prix maximal réservé pour Vibe**, et non une affirmation de dépense réelle. L'extraction des coûts facturés reste à implémenter après les essais réels.

### Détection de boucle

Chaque `AGENT_CHANGES.patch` reçoit une empreinte SHA-256. Si une tentative reproduit un patch déjà vu :

```text
stopReason = loop-detected
mission    = blocked
reviewer   = non relancé
```

Le système évite ainsi de payer une nouvelle review pour une correction identique.

### Causes d'arrêt

```text
approved
changes-requested
review-blocked
retry-limit
price-limit
loop-detected
technical-failure
```

Ces informations restent visibles avec :

```bash
superia pipeline status TASK-0001
```

## Statuts de mission

```text
running  pendant builder et validations
review   après une review approuvée, en attente de l'humain
blocked  si le reviewer demande des changements ou si une boucle est détectée
failed   si une étape technique échoue
```

## Dry-run

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --dry-run
```

Le dry-run prépare les deux invocations et préflights sans démarrer d'agent.

## Garanties testées

- fournisseurs distincts ;
- garde Git avant validation ;
- reviewer non lancé après échec ;
- review structurée et cohérente ;
- reprise après builder ;
- reprise après review ;
- review précédente injectée au retry ;
- plafonds immuables ;
- chaque builder comptabilisé ;
- patch identique bloquant avant nouvelle review ;
- aucune fusion automatique.

## Limites actuelles

- correction déclenchée manuellement avec `--retry` ;
- prix réel non encore extrait des fournisseurs ;
- taille maximale des diffs à renforcer ;
- liste globale de fichiers toujours interdits à renforcer ;
- fournisseurs réels à tester sur le Pi cible.

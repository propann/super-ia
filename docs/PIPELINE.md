# Pipeline multi-agent contrôlé

## Objectif

Exécuter une mission avec deux agents distincts sans conversation libre infinie :

```text
builder → garde Git → validations → reviewer → receipt → humain
```

Le pipeline n’effectue aucune fusion automatique.

## Prérequis

La mission possède :

- un worktree ;
- au moins un chemin autorisé ;
- des commandes de validation détectables ;
- des dépendances DAG terminées ;
- Gitleaks et Bubblewrap, sauf dérogation explicite et journalisée ;
- deux fournisseurs différents ;
- des plafonds explicites pour tout pipeline réel utilisant Vibe.

```bash
superia task create "Ajouter une validation de jeton"

superia task update TASK-0001 \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "les tests d'authentification passent"

superia worktree TASK-0001
```

## Prévisualisation

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --dry-run
```

Le dry-run prépare les deux invocations et les préflights sans démarrer d’agent et sans accès facturable.

## Premier lancement réel

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Ou dans l’autre sens :

```bash
superia pipeline run TASK-0001 \
  --builder vibe \
  --reviewer codex \
  --max-turns 8 \
  --max-tokens 50000 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Pour un pipeline réel, la CLI refuse l’exécution sans :

- `--max-price` : plafond Vibe réservé par tentative ;
- `--max-total-price` : plafond cumulé du pipeline.

Aucune valeur facturable n’est autorisée silencieusement. Le builder et le reviewer identiques sont refusés avant tout lancement.

## Étapes

### 1. Builder

Le builder travaille en mode `build` dans le worktree. Il passe par :

- le DAG et le lease exclusif ;
- le contexte vérifiable ;
- Gitleaks ;
- Bubblewrap ;
- le masquage des fichiers privés suivis, non suivis et ignorés ;
- les limites propres au fournisseur.

### 2. Garde des modifications

Super IA compare l’état Git avant et après le builder. Le run échoue si :

- un fichier sort de `allowedPaths` ;
- un chemin critique est touché ;
- les plafonds de fichiers ou d’octets sont dépassés ;
- le garde rencontre une erreur.

Artefacts :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

### 3. Validations locales

Les commandes détectées sont exécutées dans le runner local. Un échec empêche le reviewer de démarrer.

Le runner borne le temps d’exécution. Après timeout, il envoie `SIGTERM`, attend la période de grâce puis envoie `SIGKILL` au groupe avant de poursuivre.

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

Le receipt inclut contexte, logs, résultat agent, patch, garde, validations, review, identité du reviewer et empreintes SHA-256. `humanApprovalRequired` reste toujours à `true`.

## Checkpoints

État par mission :

```text
.superia/pipelines/TASK-XXXX.json
```

Étapes :

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
  --max-price 0.25 \
  --max-total-price 0.75 \
  --resume
```

Règles :

- fournisseurs et worktree identiques au checkpoint ;
- builder, validations et review déjà terminés non relancés ;
- receipt manquant recréable ;
- reprise refusée sans checkpoint builder complet ;
- plafonds du checkpoint conservés.

## Correction bornée

Une review `changes-requested` peut être corrigée explicitement :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-price 0.25 \
  --max-total-price 0.75 \
  --retry
```

`--resume` reprend une interruption technique. `--retry` ouvre une nouvelle tentative. Ils sont incompatibles dans la même commande.

La review précédente est transmise au builder via un fichier `feedbackPath`. Son contenu ne passe pas dans `argv`.

### Budgets immuables

Au premier lancement, Super IA fige :

```text
maxAttempts
maxTotalPriceUsd
reservedPerAttemptUsd
```

Une commande de retry ne peut pas augmenter ces plafonds. Chaque builder terminé consomme une tentative et son plafond réservé, même si les validations échouent ensuite.

Le coût enregistré est un **prix maximal réservé pour Vibe**, et non une affirmation de dépense réelle. L’extraction des coûts facturés reste à implémenter après les essais réels.

### Détection de boucle

Chaque `AGENT_CHANGES.patch` reçoit une empreinte SHA-256. Si une tentative reproduit un patch déjà vu :

```text
stopReason = loop-detected
mission    = blocked
reviewer   = non relancé
```

Le système évite ainsi une nouvelle review pour une correction identique.

### Causes d’arrêt

```text
approved
changes-requested
review-blocked
retry-limit
price-limit
loop-detected
technical-failure
```

## Statuts de mission

```text
running  pendant builder et validations
review   après une review approuvée, en attente de l'humain
blocked  si le reviewer demande des changements ou si une boucle est détectée
failed   si une étape technique échoue
```

## Garanties testées

- fournisseurs distincts ;
- budget réel explicite ;
- dépendances DAG ;
- fichiers privés masqués dans Bubblewrap ;
- garde Git avant validation ;
- reviewer non lancé après échec ;
- review structurée et cohérente ;
- reprise après builder ;
- reprise après review ;
- review précédente injectée au retry ;
- plafonds immuables ;
- chaque builder comptabilisé ;
- patch identique bloquant avant nouvelle review ;
- descendants arrêtés après timeout ;
- aucune fusion automatique.

## Limites actuelles

- correction déclenchée manuellement avec `--retry` ;
- prix réellement facturé non extrait des fournisseurs ;
- fournisseurs réels à tester sur le Pi cible ;
- compatibilité noyau Bubblewrap à confirmer sur ARM64 ;
- approbation et fusion finales toujours humaines.

# Contrôle des modifications d'agents

## Objectif

Un worktree et une sandbox limitent la zone d'écriture, mais ne prouvent pas qu'un agent a modifié uniquement les fichiers demandés. Le change guard compare donc l'état Git avant et après chaque run Codex ou Vibe.

Il vérifie désormais quatre dimensions :

1. périmètre autorisé ;
2. chemins toujours interdits ;
3. nombre maximal de fichiers modifiés ;
4. volume maximal du patch et des fichiers non suivis.

## Déclarer le périmètre d'un build

```bash
superia task update TASK-0001 \
  --allow-path "src/**" \
  --allow-path "tests/**" \
  --allow-path "package.json"
```

Plusieurs `--allow-path` peuvent être utilisés. Les chemins absolus, motifs vides et segments `..` sont refusés.

Un build sans chemin autorisé est refusé avant le lancement de l'agent.

## Fonctionnement

1. capture de l'état Git avant le run ;
2. exécution contrôlée dans le worktree ;
3. nouvelle capture Git porcelain v2 ;
4. comparaison des statuts et empreintes ;
5. comparaison avec les motifs autorisés ;
6. comparaison avec les chemins interdits ;
7. calcul du nombre de fichiers et du volume effectif ;
8. génération du patch et du rapport ;
9. passage du run en échec à la moindre violation.

Les modes `plan` et `review` ont une liste autorisée vide. Toute modification est donc une violation.

## Chemins toujours interdits

Même un périmètre large tel que `**` ne permet pas de modifier :

```text
.env
.env.*
**/.env
**/.env.*
.npmrc
**/.npmrc
.pypirc
**/.pypirc
*.pem
**/*.pem
*.key
**/*.key
id_rsa
**/id_rsa
id_ed25519
**/id_ed25519
.git-credentials
**/.git-credentials
```

Ces règles complètent Gitleaks. Elles bloquent aussi les fichiers de configuration d'identifiants qui pourraient être vides ou ne pas encore contenir un secret détectable.

## Limites par défaut

```text
fichiers modifiés maximum : 50
volume effectif maximum   : 1 000 000 octets
```

Le volume effectif inclut :

- le diff binaire Git des fichiers suivis ;
- le contenu complet des fichiers non suivis ;
- l'annexe listant les fichiers non suivis.

Un fichier non suivi volumineux ne peut donc pas contourner le plafond simplement parce qu'il n'apparaît pas entièrement dans `git diff`.

## Artefacts

Chaque contexte de run contient :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Exemple de rapport :

```json
{
  "schemaVersion": 1,
  "passed": false,
  "allowedPaths": ["src/**"],
  "forbiddenPatterns": [".env", "**/.env", "*.pem"],
  "changedFiles": [".env", "src/app.ts"],
  "outOfScopeFiles": [],
  "forbiddenFiles": [".env"],
  "limits": {
    "maxChangedFiles": 50,
    "maxDiffBytes": 1000000,
    "changedFiles": 2,
    "diffBytes": 728
  },
  "limitViolations": [],
  "diffPath": ".../AGENT_CHANGES.patch",
  "reportPath": ".../CHANGE_GUARD.json"
}
```

Violations de limite :

```text
too-many-files:75>50
diff-too-large:1300000>1000000
```

Le statut final du run devient `failed`, même lorsque l'exécutable de l'agent sort avec le code 0.

## Règles de sécurité

- aucun périmètre implicite pour un build ;
- aucune modification admise en plan/review ;
- chemin interdit prioritaire sur le périmètre autorisé ;
- limite invalide ou non positive = erreur fail-closed ;
- erreur du contrôleur = run échoué ;
- fichiers `.superia/` ignorés pour éviter que les artefacts internes se signalent eux-mêmes ;
- diff binaire Git archivé ;
- contenu non suivi compté dans la limite ;
- aucune fusion automatique après un rapport réussi.

## Preuves automatiques

Les tests vérifient :

- fichier autorisé accepté ;
- fichier hors périmètre détecté ;
- `.env` bloqué malgré `allowedPaths: ["**"]` ;
- dépassement du nombre de fichiers ;
- dépassement du nombre d'octets avec un fichier non suivi ;
- limite nulle refusée ;
- patch archivé ;
- build sans `--allow-path` refusé avant lancement ;
- faux build Codex avec violation ;
- statut SQLite transformé en `failed` ;
- violation présente dans `AGENT_RESULT.json`.

## Limites restantes

- le garde vérifie la surface du changement, pas sa sémantique ;
- le reviewer indépendant reste nécessaire ;
- les sous-modules Git nécessiteront une politique dédiée ;
- les limites sont actuellement des valeurs sûres globales et ne sont pas encore personnalisables par projet.

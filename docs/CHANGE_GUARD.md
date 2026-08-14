# Contrôle des modifications d'agents

## Objectif

Un worktree et une sandbox limitent la zone d'écriture, mais ne prouvent pas qu'un agent a modifié uniquement les fichiers demandés. Le change guard compare donc l'état Git avant et après chaque run Codex ou Vibe.

## Déclarer le périmètre d'un build

```bash
superia task update TASK-0001 \
  --allow-path "src/**" \
  --allow-path "tests/**" \
  --allow-path "package.json"
```

Plusieurs `--allow-path` peuvent être utilisés. Les chemins absolus, les motifs vides et les segments `..` sont refusés.

Un build sans chemin autorisé est refusé avant le lancement de l'agent :

```text
La mission TASK-0001 doit déclarer au moins un --allow-path avant le mode build.
```

## Fonctionnement

1. capture de l'état Git avant le run ;
2. exécution contrôlée dans le worktree ;
3. nouvelle capture après le run ;
4. comparaison des statuts et empreintes des fichiers ;
5. comparaison avec les motifs autorisés ;
6. génération d'un patch et d'un rapport ;
7. passage du run en échec si un chemin sort du périmètre.

Les modes `plan` et `review` ont une liste autorisée vide. Toute modification est donc une violation.

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
  "changedFiles": ["README.md", "src/app.ts"],
  "outOfScopeFiles": ["README.md"],
  "diffPath": ".../AGENT_CHANGES.patch",
  "reportPath": ".../CHANGE_GUARD.json"
}
```

Le statut final du run devient `failed`, même lorsque l'exécutable de l'agent est sorti avec le code 0.

## Règles de sécurité

- aucun périmètre implicite pour un build ;
- aucune modification admise en plan/review ;
- erreur du contrôleur = run échoué ;
- fichiers `.superia/` ignorés pour éviter que les artefacts internes se signalent eux-mêmes ;
- diff binaire Git archivé ;
- fichiers non suivis listés dans le patch ;
- aucune fusion automatique après un rapport réussi.

## Preuves automatiques

Les tests vérifient :

- fichier autorisé accepté ;
- fichier hors périmètre détecté ;
- patch archivé ;
- build sans `--allow-path` refusé avant lancement ;
- faux build Codex modifiant un fichier autorisé et un fichier interdit ;
- statut SQLite du run transformé en `failed` ;
- violation présente dans `AGENT_RESULT.json`.

## Limites actuelles

- le change guard vérifie les fichiers, pas encore la sémantique du changement ;
- le reviewer indépendant reste nécessaire ;
- les règles de taille maximale du diff et de fichiers interdits absolus seront ajoutées au pipeline qualité ;
- les sous-modules Git nécessiteront une politique dédiée.

# Arène persistante

L'arène n'utilise pas `localStorage` et ne considère pas la page comme une base de données. Les IA, les machines et les groupes sont écrits sur le disque de la machine qui exécute Super IA :

```text
$SUPERIA_HOME/connections.json
$SUPERIA_HOME/machines.json
$SUPERIA_HOME/arena.json
```

Quand Super IA tourne sur le Pi 5, ces fichiers sont donc sur son NVMe. `arena.json` est privé (`0600`) et est inclus dans les sauvegardes/restaurations.

## Groupes libres

Une carte peut être glissée sur une autre carte, quel que soit son type :

- IA + console Linux ;
- IA + console Windows ;
- IA + IA ;
- console + console ;
- groupe + carte ;
- groupe + groupe.

Les groupes peuvent être dissous depuis leur bouton `DISSOUT` : les cartes redeviennent disponibles sans supprimer l'IA, la console ou le projet.

Le backend fusionne les groupes et refuse les références inconnues ou les doublons. La page ne conserve qu'un affichage temporaire : chaque mouvement est envoyé à `/api/arena`, authentifié par la session locale, puis écrit sur disque.

## Ajouter un dépôt Git

```bash
superia project clone https://github.com/propann/super-ia.git \
  --workspace "$HOME/superia-work/super-ia"
```

Le dossier doit être absent : le clone ne remplace jamais un travail existant. Le dépôt est ensuite enregistré dans SQLite et apparaît comme carte projet déplaçable dans l'arène. Les modifications et worktrees restent dans le dossier de travail choisi.

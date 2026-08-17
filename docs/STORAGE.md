# Stockage local et migration PC → Pi

Super IA ne dépend pas du navigateur pour conserver sa configuration. La page web est uniquement une interface authentifiée ; les données sont écrites sur le disque de la machine qui exécute le backend.

## Démarrage sur l'ordinateur

```bash
export SUPERIA_HOME="$HOME/superia-data"
superia machine init
superia connection init
superia web
```

Le dossier contient notamment :

```text
SUPERIA_HOME/
├── control.sqlite
├── connections.json
├── machines.json
├── arena.json
├── events/
├── runs/
└── backups/
```

`connections.json`, `machines.json` et `arena.json` sont privés (`0600`). Les mots de passe et clés privées ne sont jamais écrits dans ces fichiers.

## Migration vers le Pi 5

Après validation sur le PC, créer une sauvegarde puis copier le dossier vers le NVMe du Pi avec une deuxième connexion SSH ouverte :

```bash
superia backup create
rsync -a --chmod=Du=rwx,Dg=,Do=,Fu=rw,Fg=,Fo= \
  "$SUPERIA_HOME/" azoth@pi-5-Azoth:/opt/azoth-ai/data/superia/
```

Sur le Pi :

```bash
export SUPERIA_HOME=/opt/azoth-ai/data/superia
superia control status
superia machine doctor
superia connection doctor
superia web
```

Le backend garde le même registre : projets, IA, consoles, groupes, événements et sauvegardes suivent le dossier. Seuls les chemins de clés SSH et les commandes réellement installées doivent être vérifiés sur la nouvelle machine.

# Notifications locales

## Objectif

Super IA produit des notifications **locales, dédupliquées et expurgées** pour les événements qui demandent une attention humaine :

- run terminé ;
- run en échec ;
- run annulé ;
- run interrompu après perte de heartbeat ;
- mission bloquée.

Aucun canal réseau n’est activé. Les reçus sont lisibles avec la CLI et dans l’interface web locale.

## Démarrage

Initialiser et afficher l’état :

```bash
superia notify status
```

Traiter immédiatement les nouveaux événements :

```bash
superia notify run
```

Lister les reçus :

```bash
superia notify list --limit 50
```

Sortie JSON :

```bash
superia notify status --json
superia notify run --json
superia notify list --limit 100 --json
```

Le daemon exécute aussi le moteur à chaque tick :

```bash
superia daemon --once
```

## Configuration

Activer ou désactiver entièrement le moteur :

```bash
superia notify enable
superia notify disable
```

Configurer les catégories :

```bash
superia notify configure --runs --blocked-tasks
superia notify configure --no-runs
superia notify configure --no-blocked-tasks
```

La sortie console du daemon est désactivée par défaut :

```bash
superia notify configure --stdout
superia notify configure --no-stdout
```

## Stockage

Les fichiers sont placés dans :

```text
SUPERIA_HOME/notifications/config.json
SUPERIA_HOME/notifications/state.json
SUPERIA_HOME/notifications/records/*.json
```

Par défaut :

```text
~/.superia/notifications/
```

La configuration, le curseur et chaque reçu sont protégés en `0600`.

## Déduplication

Chaque notification possède une clé déterministe :

- événement de run : identifiant d’événement, type et identifiant du run ;
- mission bloquée : projet, mission et date de mise à jour.

La clé est transformée en nom de fichier SHA-256. Le reçu est créé avec une écriture exclusive. Même si le processus s’arrête avant de mettre à jour le curseur, le même événement ne peut pas produire un second reçu.

Le curseur `lastEventId` est mis à jour atomiquement.

## Protection des données

Les messages ne copient jamais :

- prompt ;
- objectif ou titre libre de mission ;
- notes ;
- payload d’événement ;
- métadonnées de run ;
- diagnostic d’erreur ;
- nom de fournisseur arbitraire ;
- valeur de secret.

Les reçus utilisent uniquement :

- identifiant de run ;
- identifiant de mission ;
- identifiant de projet ;
- statut contrôlé ;
- date de l’événement.

Les identifiants sont filtrés et limités en longueur.

## Comportement au premier lancement

Lors de la première initialisation, le curseur est positionné sur le dernier événement existant. Super IA ne génère donc pas une rafale de notifications historiques.

Dans le daemon, le curseur est initialisé avant la récupération des runs abandonnés. Une interruption détectée pendant ce tick produit bien une notification, sans reprendre tous les anciens événements.

## Retard important

Le moteur lit au maximum les 1000 événements les plus récents. S’il détecte que le retard dépasse cette fenêtre, il échoue explicitement au lieu de sauter silencieusement des événements.

Une erreur du moteur :

- est journalisée dans le plan de contrôle ;
- apparaît dans `daemon-status.json` ;
- n’arrête pas la synchronisation des projets ni la récupération des runs.

## Interface web

L’interface locale affiche les reçus dans la section **Notifications locales** :

```bash
superia web
```

Elle reste en lecture seule. Aucun acquittement, suppression, envoi réseau ou lancement d’agent n’est possible depuis le navigateur.

## Validation CI

Les tests vérifient :

- création d’un reçu pour un run en échec ;
- création d’un reçu pour une mission bloquée ;
- absence de doublon au second passage ;
- intégration au daemon pour un run interrompu ;
- permissions privées ;
- conservation d’une configuration invalide ;
- absence de prompts, notes, payloads, métadonnées, diagnostics et chaînes ressemblant à des secrets ;
- affichage des reçus dans l’API et la page web locales.

## Limites actuelles

- aucun webhook, e-mail, Telegram, Signal ou autre canal distant ;
- aucune notification desktop native ;
- aucun acquittement ;
- aucune politique de rétention des reçus ;
- aucune notification sur les reviews ou budgets ;
- validation réelle du comportement systemd encore à faire sur le Raspberry Pi.

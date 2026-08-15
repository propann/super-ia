# Interface web locale

## Objectif

L’interface web donne une vue mobile et desktop du plan de contrôle sans framework ni dépendance runtime.

Elle affiche en lecture seule :

- état SQLite ;
- projets ;
- missions ;
- runs récents ;
- notifications expurgées ;
- arrêt d’urgence ;
- événements ;
- rapport `readiness` hors ligne.

## Démarrage

```bash
superia web
superia web --port 3210
```

Adresse par défaut :

```text
http://127.0.0.1:3210
```

Le serveur refuse toute écoute hors `127.0.0.1` ou `::1`.

## Token local

```text
SUPERIA_HOME/web/access.token
```

Le fichier est en `0600`.

```bash
superia web token
superia web token --json
```

Un token existant mais invalide n’est jamais remplacé automatiquement.

## Authentification

Après vérification en temps constant, le serveur crée une session mémoire distincte du token avec un cookie :

```text
HttpOnly
SameSite=Strict
Path=/
```

L’API accepte aussi explicitement :

```text
Authorization: Bearer <token>
```

## Routes

```text
GET  /healthz
GET  /login
POST /session
POST /logout
GET  /
GET  /api/overview
```

Paramètres facultatifs :

```text
projectId=<ID>
runs=<1..200>
events=<1..500>
notifications=<1..200>
```

## Arrêt d’urgence

L’overview expose :

```text
engaged
category
generation
updatedAt
engagedAt
releasedAt
```

Lorsque l’arrêt est engagé, la page affiche un bandeau rouge et indique que seuls les diagnostics et dry-runs restent autorisés.

Aucune route web ne permet :

- d’engager l’arrêt ;
- de le libérer ;
- de tuer un processus ;
- de lancer un agent ;
- de fusionner une branche.

Les commandes safety restent réservées à la CLI locale.

## Sécurité

Garanties :

- boucle locale uniquement ;
- aucune CORS ;
- aucune route métier d’écriture ;
- token privé ;
- sessions en mémoire ;
- expiration des sessions ;
- `Cache-Control: no-store` ;
- CSP locale ;
- anti-frame ;
- no-referrer ;
- limite du formulaire de connexion ;
- readiness sans réseau ni lecture de secrets ;
- notifications sans payloads libres ;
- état safety informatif uniquement.

Pour un accès depuis une autre machine, utiliser un tunnel SSH explicite plutôt qu’une écoute LAN.

## Validation CI

`tests/web.test.mjs` vérifie :

- refus sans session ;
- mauvais token ;
- cookie HttpOnly et SameSite ;
- bearer explicite ;
- données SQLite réelles ;
- notifications ;
- état safety libre puis engagé ;
- absence de CORS ;
- refus d’une méthode destructive ;
- refus de `0.0.0.0` ;
- conservation d’un token invalide.

## Limites

- pas de service systemd web séparé ;
- pas d’accès distant ;
- pas de WebSocket ;
- rafraîchissement toutes les 30 secondes ;
- aucune approbation ni commande d’agent depuis le navigateur ;
- rendu réel à vérifier sur le Pi et mobile.

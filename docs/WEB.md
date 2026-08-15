# Interface web locale

## Objectif

L’interface web donne une vue mobile et desktop du plan de contrôle sans ajouter de framework ni de dépendance runtime.

Elle affiche en lecture seule :

- état SQLite du plan de contrôle ;
- projets enregistrés ;
- missions du projet sélectionné ;
- runs récents ;
- notifications locales expurgées ;
- événements récents ;
- rapport `readiness` hors ligne.

## Démarrage

```bash
superia web
```

Port personnalisé :

```bash
superia web --port 3210
```

Adresse par défaut :

```text
http://127.0.0.1:3210
```

Le serveur refuse toute écoute hors `127.0.0.1` ou `::1`.

## Token local

Le premier démarrage crée :

```text
SUPERIA_HOME/web/access.token
```

Par défaut :

```text
~/.superia/web/access.token
```

Le fichier est protégé en `0600`.

Afficher volontairement le token :

```bash
superia web token
```

Sortie JSON :

```bash
superia web token --json
```

Un fichier de token existant mais invalide n’est jamais remplacé automatiquement.

## Authentification

La page `/login` reçoit le token local. Après vérification en temps constant, le serveur crée une session mémoire distincte du token et renvoie un cookie :

```text
HttpOnly
SameSite=Strict
Path=/
```

Le token n’est donc pas conservé comme cookie de session.

L’API accepte aussi explicitement :

```text
Authorization: Bearer <token>
```

Cette méthode est destinée aux outils locaux contrôlés.

## Routes

```text
GET  /healthz       état minimal, sans données de projet
GET  /login         formulaire local
POST /session       ouverture de session
POST /logout        fermeture de session
GET  /              tableau de bord
GET  /api/overview  état agrégé authentifié
```

Paramètres facultatifs de l’overview :

```text
projectId=<ID>
runs=<1..200>
events=<1..500>
notifications=<1..200>
```

Les notifications exposées par l’API sont les reçus déjà expurgés du moteur local. L’API ne reconstruit pas les messages à partir des payloads d’événements.

## Sécurité

Garanties actuelles :

- écoute sur boucle locale uniquement ;
- aucune CORS ;
- aucune route d’écriture métier ;
- aucune action de fusion, suppression ou exécution ;
- token privé en `0600` ;
- sessions uniquement en mémoire ;
- expiration des sessions ;
- `Cache-Control: no-store` ;
- CSP locale ;
- `frame-ancestors 'none'` et `X-Frame-Options: DENY` ;
- `Referrer-Policy: no-referrer` ;
- limite de taille sur le formulaire de connexion ;
- readiness sans réseau et sans lecture de valeurs de secrets ;
- notifications sans prompts, notes, payloads, métadonnées ou diagnostics.

Le serveur n’est pas un service distant. Pour un accès depuis une autre machine, utiliser ultérieurement un tunnel SSH explicite plutôt que modifier l’adresse d’écoute.

## Arrêt

Dans un terminal :

```text
Ctrl+C
```

Le serveur ferme les sessions mémoire et le socket HTTP.

## Validation CI

`tests/web.test.mjs` vérifie notamment :

- refus d’accès sans session ;
- refus d’un mauvais token ;
- cookie HttpOnly et SameSite ;
- accès par bearer explicite ;
- lecture de vraies données SQLite ;
- rendu de la page Matrix ;
- exposition des reçus de notifications ;
- absence de CORS ;
- refus d’une méthode destructive ;
- refus d’écouter sur `0.0.0.0` ;
- conservation d’un fichier de token invalide.

## Limites actuelles

- pas encore de service systemd séparé pour le web ;
- pas d’accès distant ;
- pas de WebSocket ;
- rafraîchissement toutes les 30 secondes ;
- aucune approbation, suppression, acquittement ou commande d’agent depuis le navigateur ;
- l’interface réelle reste à vérifier sur le Pi et sur mobile.

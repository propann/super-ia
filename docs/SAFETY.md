# Arrêt d’urgence global

## Objectif

L’arrêt d’urgence de Super IA permet de bloquer immédiatement les nouvelles exécutions réelles et de demander l’arrêt des processus déjà gérés par le plan de contrôle.

Il est local, privé, persistant, audité et **fail-closed**.

## Commandes

Afficher l’état :

```bash
superia safety status
superia safety status --json
```

Engager l’arrêt :

```bash
superia safety engage --category security
```

Catégories disponibles :

```text
manual
security
budget
maintenance
```

Lever explicitement l’arrêt :

```bash
superia safety release
```

Alias court :

```bash
superia stop status
superia stop engage --category budget
superia stop release
```

## Effet sur les lancements

Lorsque l’arrêt est engagé, Super IA refuse :

- un run Codex réel ;
- un run Mistral Vibe réel ;
- un pipeline réel ;
- un run manuel créé avec `superia run start`.

Restent disponibles :

- diagnostics ;
- lecture du plan de contrôle ;
- `readiness` ;
- interface web locale en lecture seule ;
- sauvegardes ;
- dry-runs des agents et pipelines ;
- consultation des événements et notifications.

La levée de l’arrêt est toujours une commande distincte et volontaire.

## Arrêt des processus actifs

À l’engagement, Super IA examine les runs `queued` ou `running`.

Un processus n’est signalé que si :

- le run possède un PID ;
- le PID est supérieur à 1 ;
- le PID n’est pas celui de Super IA ;
- le heartbeat date de moins de 60 secondes ;
- le groupe de processus répond encore au probe local.

Séquence :

```text
SIGTERM
  → délai de 1 seconde
  → SIGKILL si le groupe existe encore
```

Cette vérification réduit le risque de tuer un PID ancien réutilisé par le système.

Les runs sans PID, avec heartbeat ancien ou PID jugé dangereux sont ignorés et consignés dans le rapport.

## Stockage privé

État :

```text
SUPERIA_HOME/safety/emergency-stop.json
```

Par défaut :

```text
~/.superia/safety/emergency-stop.json
```

Le fichier est écrit atomiquement et protégé en `0600`.

Un fichier existant invalide n’est jamais remplacé automatiquement. Les lancements réels échouent alors par sécurité jusqu’à réparation explicite.

## Audit

Les opérations produisent des événements :

```text
safety.emergency_stop_engaged
safety.active_runs_termination_requested
safety.emergency_stop_released
```

Les événements contiennent uniquement :

- catégorie contrôlée ;
- génération de l’état ;
- identifiants internes des runs ;
- compteurs de signaux, skips et échecs.

Ils ne copient pas les prompts, notes, payloads, métadonnées de run, secrets ou diagnostics arbitraires.

## Readiness

Sous arrêt :

```text
readyForLocalControl = true
readyForRealAgents   = false
```

Le rapport global passe en échec afin qu’un lancement réel ne puisse pas être considéré comme autorisé.

## Interface web

L’interface locale affiche :

- l’état libre ou engagé ;
- la catégorie ;
- la génération ;
- un bandeau d’alerte lorsque l’arrêt est actif.

Aucune route web ne permet de l’engager ou de le libérer. Ces actions restent réservées à la CLI locale.

## Sauvegardes

La sauvegarde locale inclut, lorsqu’ils existent :

```text
emergency-stop.json
notifications-config.json
notifications-state.json
```

Ils sont stockés en `0600` et intégrés au manifeste SHA-256 avec SQLite et le journal JSONL.

Les reçus individuels de notifications ne sont pas copiés dans chaque sauvegarde locale afin d’éviter une croissance non bornée. Une sauvegarde Restic du répertoire de contrôle peut les conserver hors machine.

## Validation automatisée

La CI vérifie :

- permissions privées ;
- écritures atomiques ;
- engagement et libération idempotents ;
- état invalide conservé et bloquant ;
- blocage Codex, Vibe, pipeline et run manuel ;
- disponibilité des dry-runs ;
- visibilité dans readiness et dans le web ;
- audit événementiel ;
- lancement d’un vrai groupe de processus qui ignore `SIGTERM` ;
- escalade réelle jusqu’à `SIGKILL` ;
- preuve du run concerné dans le journal ;
- présence de l’état dans une sauvegarde vérifiable.

## Limites actuelles

- seuls les processus enregistrés par Super IA peuvent être ciblés ;
- un run sans PID ne peut pas être signalé ;
- un heartbeat ancien est volontairement ignoré pour éviter les erreurs de PID réutilisé ;
- sous Windows, la terminaison vise le PID direct plutôt qu’un groupe Unix ;
- l’exécution réelle sur le Raspberry Pi et sous son service systemd reste à valider ;
- l’arrêt ne désactive pas le réseau de la machine entière et ne remplace pas un pare-feu ou un arrêt système.

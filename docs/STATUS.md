# État vérifié du projet

Date du contrôle : **15 août 2026**  
Version : **0.18.0**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat vérifié

| Élément | Résultat |
|---|---|
| CI GitHub | réussie sur le lot fonctionnel v0.18 |
| Build TypeScript | réussi |
| Tests | **89 réussis, 0 échec** |
| Audit npm | **0 vulnérabilité signalée** |
| Système CI | Ubuntu 24.04.4 |
| Node / npm | 22.23.2 / 10.9.8 |
| Scripts Pi + toolchain | valides |
| Actions GitHub | permissions lecture seule, SHA épinglés |
| Téléchargement directement pipé vers un shell | interdit par la CI |
| Dry-run Core / Standard / Full | réussi et non destructif |
| Commande `sudo` cachée dans le paquet Pi | aucune |

## Architecture

Le Raspberry Pi 5 est un **plan de contrôle léger** :

- SQLite WAL et journal JSONL ;
- registre multi-projets ;
- missions, dépendances, runs, événements et leases ;
- contexte ciblé ;
- agents distants contrôlés ;
- validation, receipts et sauvegardes ;
- console, web local, notifications et arrêt d’urgence ;
- daemon systemd utilisateur.

Aucun profil n’installe de modèle local ni de poids IA.

## Socle livré

- SQLite WAL, migrations et reprise ;
- DAG avec cycles et dépendances inconnues refusés ;
- branches et worktrees Git ;
- contexte ciblé et manifestes SHA-256 ;
- runner avec heartbeat, timeout et arrêt du groupe ;
- Codex et Mistral Vibe contrôlés ;
- budgets explicites et retries bornés ;
- Gitleaks obligatoire ;
- Bubblewrap, HOME jetable et masquage des fichiers privés ;
- garde Git, chemins critiques et plafonds de diff ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- receipts vérifiables ;
- console Matrix et daemon ;
- interface web locale authentifiée et en lecture seule ;
- notifications locales privées et dédupliquées ;
- arrêt d’urgence global ;
- Connection Matrix universelle ;
- politique anti-SSRF ;
- readiness hors ligne ;
- sauvegardes locales cohérentes ;
- plans Restic non destructifs ;
- service Pi respectant `SUPERIA_HOME` ;
- CI durcie et Dependabot.

## Arrêt d’urgence v0.18

Commandes :

```bash
superia safety status
superia safety engage --category security
superia safety release
```

Garanties vérifiées :

- état privé en `0600` ;
- écriture atomique ;
- état invalide conservé et bloquant ;
- engagement et libération idempotents ;
- Codex, Vibe, pipeline et run manuel réels refusés ;
- diagnostics et dry-runs encore disponibles ;
- `readiness` conserve le contrôle local mais refuse les agents réels ;
- état visible dans le web sans route de modification ;
- événements d’audit sans prompt, payload libre ou secret ;
- processus gérés ciblés uniquement avec PID sûr et heartbeat récent ;
- `SIGTERM`, délai d’une seconde, puis `SIGKILL` si nécessaire ;
- test CI avec un vrai groupe de processus résistant à `SIGTERM` ;
- état safety intégré au manifeste de sauvegarde.

Limites :

- seuls les processus enregistrés par Super IA sont ciblés ;
- les runs sans PID ou avec heartbeat ancien ne sont pas signalés ;
- le comportement réel sous systemd sur le Pi reste à prouver ;
- l’arrêt ne remplace pas un pare-feu ni l’arrêt de la machine.

## Interface web et notifications

Le serveur web :

- écoute uniquement sur `127.0.0.1` ou `::1` ;
- utilise un token `0600` et une session HttpOnly ;
- n’active aucune CORS ;
- refuse les méthodes destructives ;
- affiche projets, missions, runs, notifications, safety, événements et readiness.

Les notifications :

- couvrent runs terminés, échoués, annulés et interrompus ;
- couvrent les missions bloquées ;
- sont dédupliquées par SHA-256 ;
- ne copient ni prompts, notes, payloads, métadonnées ni diagnostics ;
- n’utilisent aucun canal réseau.

## Sauvegardes

La sauvegarde locale vérifiée contient :

- `control.sqlite` produit par l’API SQLite ;
- `events.jsonl` ;
- `emergency-stop.json` lorsqu’il existe ;
- `notifications-config.json` lorsqu’il existe ;
- `notifications-state.json` lorsqu’il existe ;
- `MANIFEST.json` avec tailles et SHA-256.

Tous les fichiers produits sont en `0600`.

Les reçus individuels de notifications ne sont pas dupliqués dans chaque sauvegarde locale. Restic peut conserver le répertoire de contrôle complet hors machine.

## Ce qui attend encore le Pi ou les comptes

- installer réellement la v0.18 et le profil Standard sur ARM64 ;
- exécuter l’autotest Bubblewrap sur le noyau du Pi ;
- confirmer le service après déconnexion ;
- tester l’arrêt d’urgence avec un run géré sous systemd ;
- vérifier web et notifications sur le Pi et mobile ;
- choisir le coffre de secrets ;
- restaurer une sauvegarde sur copie ;
- configurer un dépôt Restic réel ;
- authentifier Codex et Vibe ;
- tester les fournisseurs avec des requêtes bornées ;
- tester MCP, ACP, A2A et SSH ;
- simuler une coupure brutale ;
- produire un pipeline réel avec receipts ;
- mesurer coût, qualité et latence.

## Limites volontaires

- aucune clé créée automatiquement ;
- aucune connexion activée automatiquement ;
- aucune dépense sans plafond explicite ;
- aucun modèle local installé ;
- aucun navigateur automatisé ;
- aucune interface web distante ;
- aucune notification réseau par défaut ;
- aucune fusion automatique ;
- `node:sqlite` reste signalé expérimental sous Node 22.

## Commandes de contrôle sur le Pi

```bash
superia doctor
superia connection policy
superia security sandbox-check
superia safety status
superia readiness
superia control status --json
superia backup create
superia backup list
superia notify status
superia daemon --once
superia web token
superia web
```

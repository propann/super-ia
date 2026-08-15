# État vérifié du projet

Date du contrôle : **15 août 2026**  
Version : **0.19.0**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat vérifié

| Élément | Résultat |
|---|---|
| CI GitHub | réussie sur le lot fonctionnel v0.19 |
| Build TypeScript | réussi |
| Tests | **95 réussis, 0 échec** |
| Audit npm | **0 vulnérabilité signalée** |
| Système CI | Ubuntu 24.04.4 |
| Node / npm | 22.23.2 / 10.9.8 |
| Scripts Pi + toolchain | valides |
| Préflight Pi/HDD/SSH | valide et en lecture seule |
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
- restauration et drills hors ligne ;
- routeur de fournisseurs explicable ;
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
- routeur hors ligne par disponibilité, capacité, coût et préférences ;
- sauvegardes locales cohérentes ;
- restauration atomique vérifiée ;
- drill de reprise isolé ;
- préflight SD/HDD/SSD/NVMe/SSH en lecture seule ;
- plans Restic non destructifs ;
- service Pi respectant `SUPERIA_HOME` ;
- CI durcie et Dependabot.

## Restauration et reprise v0.19

Commandes :

```bash
superia backup restore <sauvegarde> --target <nouveau-SUPERIA_HOME>
superia backup drill
superia backup drill --keep
```

Garanties vérifiées :

- la cible finale doit être absente ;
- les noms de fichiers autorisés sont limités ;
- `control.sqlite` et `events.jsonl` sont obligatoires ;
- tailles et SHA-256 sont vérifiés ;
- la copie est binaire ;
- `PRAGMA integrity_check` doit retourner `ok` ;
- chaque ligne JSONL doit être valide ;
- safety et notifications sont restaurés lorsqu’ils existent ;
- l’écriture se fait dans un dossier temporaire frère ;
- le renommage final est atomique ;
- un échec supprime le temporaire sans créer la cible ;
- `restore-receipt.json` est écrit en `0600` ;
- le drill compare projets, missions, runs, événements et lignes du journal ;
- la copie du drill est supprimée par défaut.

Limites :

- la bascule d’un `SUPERIA_HOME` actif reste manuelle ;
- la restauration Restic hors machine n’est pas encore prouvée ;
- le service systemd n’est pas démarré automatiquement sur la copie ;
- le comportement du stockage réel du Pi reste à tester.

## Routeur de fournisseurs v0.19

Commande :

```bash
superia route --mode plan|build|review --budget zero|low|any
```

Le routeur :

- n’appelle aucun réseau ;
- ne lance aucun agent ;
- examine les commandes présentes dans le `PATH` ;
- exclut les adaptateurs non prêts ;
- vérifie les capacités requises ;
- respecte le budget, la politique API et les préférences du projet ;
- expose les raisons de sélection ou de rejet ;
- distingue `recommendedProviderId` de `launchAllowed` ;
- laisse `readiness` et l’arrêt d’urgence décider si un lancement réel est autorisé.

Il ne contient pas encore de score de qualité mesuré. Les benchmarks réels restent nécessaires avant un routage automatique.

## Préflight Raspberry Pi

```bash
sh install/pi/preflight.sh
sh install/pi/preflight.sh --strict
```

Le script vérifie en lecture seule :

- Linux et architecture ;
- distribution ;
- source et type de la racine ;
- SD, USB/HDD/SSD, NVMe ou environnement virtuel ;
- espace libre ;
- Git, npm et Node >= 22.5 ;
- outils locaux ;
- client et serveur SSH ;
- systemd utilisateur et linger.

La CI exécute ce préflight en mode strict. Le Pi ARM64 et son support réel restent à vérifier après SSH.

## Arrêt d’urgence

```bash
superia safety status
superia safety engage --category security
superia safety release
```

Garanties vérifiées :

- état privé en `0600` et écriture atomique ;
- état invalide conservé et bloquant ;
- engagement et libération idempotents ;
- Codex, Vibe, pipeline et run manuel réels refusés ;
- diagnostics et dry-runs encore disponibles ;
- `readiness` conserve le contrôle local mais refuse les agents réels ;
- état visible dans le web sans route de modification ;
- processus gérés ciblés uniquement avec PID sûr et heartbeat récent ;
- `SIGTERM`, délai d’une seconde, puis `SIGKILL` si nécessaire ;
- test CI avec un vrai groupe résistant à `SIGTERM` ;
- état safety intégré au manifeste de sauvegarde.

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

## Ce qui attend encore le Pi ou les comptes

- démarrer réellement le Pi sur son HDD/SSD ou NVMe ;
- installer la v0.19 et le profil Standard sur ARM64 ;
- exécuter l’autotest Bubblewrap sur le noyau du Pi ;
- confirmer le service après déconnexion ;
- tester l’arrêt d’urgence avec un run géré sous systemd ;
- vérifier web et notifications sur le Pi et mobile ;
- choisir le coffre de secrets ;
- restaurer une sauvegarde v0.19 sur le stockage réel ;
- configurer un dépôt Restic réel et restaurer hors machine ;
- authentifier Codex et Vibe ;
- tester les fournisseurs avec des requêtes bornées ;
- tester MCP, ACP, A2A et worker SSH ;
- simuler une coupure brutale ;
- produire un pipeline réel avec receipts ;
- mesurer coût, qualité et latence ;
- enrichir le routeur avec ces mesures.

## Limites volontaires

- aucune clé créée automatiquement ;
- aucune connexion activée automatiquement ;
- aucune dépense sans plafond explicite ;
- aucun modèle local installé ;
- aucun navigateur automatisé ;
- aucune interface web distante ;
- aucune notification réseau par défaut ;
- aucun formatage ou clonage automatique de disque ;
- aucune fusion automatique ;
- `node:sqlite` reste signalé expérimental sous Node 22.

## Commandes de contrôle sur le Pi

```bash
sh install/pi/preflight.sh
superia doctor
superia connection policy
superia security sandbox-check
superia safety status
superia readiness
superia route --mode plan --budget zero
superia control status --json
superia backup create
superia backup drill
superia notify status
superia daemon --once
superia web token
superia web
```

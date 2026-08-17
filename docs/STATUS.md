# État vérifié du projet

Date du contrôle : **15 août 2026**  
Version : **0.20.0**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat vérifié

| Élément | Résultat |
|---|---|
| CI GitHub | réussie sur le lot fonctionnel v0.20 |
| Build TypeScript | réussi |
| Tests | **103 réussis, 0 échec** |
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
- routeur explicable avec mesures locales bornées ;
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
- routeur hors ligne par disponibilité, capacité, coût, préférences et benchmarks ;
- registre privé de mesures avec seuil de confiance ;
- sauvegardes locales cohérentes ;
- restauration atomique vérifiée ;
- drill de reprise isolé incluant les benchmarks ;
- préflight SD/HDD/SSD/NVMe/SSH en lecture seule ;
- plans Restic non destructifs ;
- service Pi respectant `SUPERIA_HOME` ;
- CI durcie et Dependabot.

## Benchmarks et routeur v0.20

Commandes :

```bash
superia benchmark record <provider> --mode plan|build|review \
  --success|--failure --duration-ms N --cost-eur N [--quality 0..100]
superia benchmark list
superia benchmark summary
superia route --mode plan|build|review --budget zero|low|any
```

Garanties vérifiées :

- stockage dans `SUPERIA_HOME/providers/benchmarks.json` ;
- permissions `0600` ;
- écriture atomique ;
- fournisseurs connus uniquement ;
- valeurs numériques bornées ;
- maximum 10 000 mesures ;
- fichier invalide conservé et nouvelles écritures refusées ;
- aucune donnée libre : pas de prompt, code, réponse, fichier, diagnostic ou secret ;
- résumés par fournisseur et par mode ;
- taux de succès, durée médiane, coût moyen et qualité moyenne optionnelle ;
- trois échantillons minimum avant influence ;
- influence secondaire bornée entre -40 et +45 points ;
- mesures insuffisantes visibles mais ignorées ;
- une mesure ne peut jamais rendre éligible un adaptateur interdit ;
- `readiness`, budget, capacités, politique API et arrêt d’urgence restent prioritaires ;
- registre invalide ignoré par le routeur avec avertissement, sans réinitialisation ;
- benchmarks inclus dans la sauvegarde et validés pendant la restauration.

Limites :

- l’enregistrement reste manuel ;
- l’import depuis les receipts n’est pas encore livré ;
- les essais CI sont synthétiques et ne prouvent pas la qualité d’un modèle ;
- les benchmarks réels exigent les comptes et un corpus commun ;
- aucun routage automatique de production n’est activé.

## Restauration et reprise

```bash
superia backup restore <sauvegarde> --target <nouveau-SUPERIA_HOME>
superia backup drill
superia backup drill --keep
```

Garanties vérifiées :

- cible finale obligatoirement absente ;
- noms de fichiers autorisés limités ;
- `control.sqlite` et `events.jsonl` obligatoires ;
- tailles et SHA-256 vérifiés ;
- copie binaire ;
- `PRAGMA integrity_check` ;
- validation ligne par ligne du JSONL ;
- safety, notifications et benchmarks restaurés lorsqu’ils existent ;
- registre de benchmarks revalidé après copie ;
- dossier temporaire frère et renommage atomique ;
- suppression du temporaire en cas d’échec ;
- reçu `0600` ;
- drill comparant projets, missions, runs, événements, journal et nombre de benchmarks.

La bascule d’un `SUPERIA_HOME` actif reste volontairement manuelle.

## Préflight Raspberry Pi

```bash
sh install/pi/preflight.sh
sh install/pi/preflight.sh --strict
```

Le script vérifie sans modification ni réseau : Linux, architecture, distribution, source de `/`, SD/HDD/SSD/NVMe, espace, Node, outils, SSH, systemd utilisateur et linger.

La CI l’exécute en mode strict. L’exécution ARM64 sur le stockage réel reste à faire après SSH.

## Arrêt d’urgence

```bash
superia safety status
superia safety engage --category security
superia safety release
```

Garanties vérifiées : état privé fail-closed, blocage des agents/pipelines/runs réels, diagnostics disponibles, visibilité web/readiness, PID et heartbeat sûrs, `SIGTERM` puis `SIGKILL`, audit expurgé et sauvegarde de l’état.

## Ce qui attend encore le Pi ou les comptes

- démarrer réellement le Pi sur son HDD/SSD ou NVMe ;
- installer la v0.20 et le profil Standard sur ARM64 ;
- exécuter l’autotest Bubblewrap sur le noyau du Pi ;
- confirmer le service après déconnexion ;
- tester l’arrêt d’urgence sous systemd ;
- vérifier web et notifications sur Pi et mobile ;
- choisir le coffre de secrets ;
- restaurer une sauvegarde v0.20 sur le stockage réel ;
- configurer Restic et restaurer hors machine ;
- authentifier Codex et Vibe ;
- exécuter des requêtes bornées et un pipeline réel ;
- tester MCP, ACP, A2A et worker SSH ;
- simuler une coupure brutale ;
- produire au moins trois mesures comparables par fournisseur et par mode ;
- définir une grille de qualité commune ;
- importer automatiquement les mesures depuis les receipts.

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
superia benchmark summary
superia route --mode plan --budget zero
superia control status --json
superia backup create
superia backup drill
superia notify status
superia daemon --once
superia web token
superia web
```

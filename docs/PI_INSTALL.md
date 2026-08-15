# Installation sur Raspberry Pi 5

Super IA s’installe comme **plan de contrôle utilisateur**. Le Pi stocke et orchestre l’état ; aucun modèle IA local n’est obligatoire. L’installateur Pi lui-même n’utilise pas `sudo`.

## Prérequis

- Raspberry Pi 5 sous Linux 64 bits ;
- NVMe recommandé ;
- Git ;
- Node.js 22.5 ou supérieur ;
- npm ;
- systemd utilisateur ;
- Gitleaks et Bubblewrap pour les agents réels ;
- Restic facultatif.

## Installation v0.18

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
bash install/pi/install.sh
```

L’installateur :

1. vérifie Git, npm et Node ;
2. détecte Bubblewrap et Gitleaks ;
3. installe les dépendances ;
4. compile et exécute les tests ;
5. initialise le plan de contrôle ;
6. installe `~/.local/bin/superia` ;
7. crée le service systemd utilisateur ;
8. lance un tick du daemon ;
9. crée et vérifie une sauvegarde locale ;
10. exécute l’autotest Bubblewrap lorsqu’il est disponible ;
11. enregistre `sandbox-status.json` en `0600` ;
12. active le service lorsque systemd utilisateur est disponible.

## Répertoire de contrôle personnalisé

```bash
export SUPERIA_HOME=/mnt/nvme/superia-control
bash install/pi/install.sh
```

La même valeur est utilisée par :

- wrapper CLI ;
- service systemd ;
- SQLite et journal ;
- sauvegardes ;
- preuve Bubblewrap ;
- token web ;
- notifications ;
- arrêt d’urgence.

## Vérification initiale

```bash
superia control status --json
superia doctor
superia connection policy
superia security scan --required
superia security sandbox-check --json
superia safety status
superia readiness
superia notify status
superia daemon --once --json
superia backup create
superia backup list
superia matrix --once
superia web token
systemctl --user status superia.service
journalctl --user -u superia.service -n 100 --no-pager
```

## Interface web locale

```bash
superia web
```

Ouvrir depuis le navigateur du Pi :

```text
http://127.0.0.1:3210
```

Vérifier :

- connexion avec le token ;
- projets, missions et runs ;
- notifications ;
- état de l’arrêt d’urgence ;
- readiness ;
- fermeture de session ;
- refus sans session ;
- affichage mobile.

Le serveur refuse `0.0.0.0` et toute écoute LAN.

## Notifications locales

```bash
superia notify status
superia notify configure --runs --blocked-tasks --no-stdout
superia notify run
superia notify list --limit 50
```

Permissions attendues :

```bash
find "$SUPERIA_HOME/notifications" -type f -maxdepth 2 -printf '%m %p\n'
```

Les fichiers doivent être en `600`.

## Arrêt d’urgence sur le Pi

État initial :

```bash
superia safety status
```

Engager sans run actif :

```bash
superia safety engage --category maintenance
superia safety status
superia readiness
```

Résultat attendu :

- état `ENGAGÉ` ;
- `readyForLocalControl=true` ;
- `readyForRealAgents=false` ;
- interface web avec bandeau rouge ;
- run réel refusé ;
- dry-run encore disponible.

Lever ensuite :

```bash
superia safety release
superia readiness
```

### Test avec un run géré

Ce test doit être fait sur un projet de démonstration et sous surveillance :

1. ouvrir un run contrôlé produisant un PID et un heartbeat ;
2. confirmer sa présence avec `superia run list` ;
3. exécuter `superia safety engage --category security` ;
4. vérifier le rapport `SIGTERM` / `SIGKILL` ;
5. consulter `superia events --limit 50` ;
6. vérifier qu’aucun processus du groupe ne subsiste ;
7. libérer avec `superia safety release`.

Ne pas tester en enregistrant manuellement le PID d’un service système ou d’un processus non créé par Super IA.

## Missions et pipeline

```bash
cd /chemin/du/projet
superia init
superia task create "Modifier le module d'authentification"
superia task update TASK-0001 \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "tests réussis"
superia worktree TASK-0001
```

Prévisualisation :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --dry-run
```

Pipeline réel après authentification :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Aucun plafond n’est inventé silencieusement.

## Test de coupure et reprise

```bash
systemctl --user restart superia.service
superia recover --stale-minutes 1
superia run list
superia events --limit 100
superia notify list --limit 20
```

Résultat attendu :

- run abandonné marqué `interrupted` ;
- base SQLite intacte ;
- daemon reparti ;
- une seule notification ;
- aucun doublon au tick suivant.

## Sauvegarde locale

```bash
superia backup create
superia backup list
superia backup verify "$SUPERIA_HOME/backups/backup-YYYYMMDDHHMMSS"
```

Vérifier que le manifeste contient, lorsqu’ils existent :

```text
control.sqlite
events.jsonl
emergency-stop.json
notifications-config.json
notifications-state.json
```

Tous les fichiers et le manifeste doivent être en `600`.

## Restic

```bash
superia restic init
superia restic status
superia restic backup
superia restic retention-preview
superia restic check
```

Exécution volontaire :

```bash
export RESTIC_REPOSITORY='...'
export RESTIC_PASSWORD_FILE='/chemin/protege/restic-password'
superia restic backup --execute --network
superia restic check --execute --network
```

Aucun `--prune` automatique n’est généré.

## Fonctionnement après déconnexion

```bash
loginctl enable-linger "$USER"
```

Cette opération peut demander une autorisation administrative. L’installateur ne la force pas.

## Mise à jour

```bash
cd /chemin/vers/super-ia
git pull
npm install
npm test
bash install/pi/install.sh
superia security sandbox-check
superia safety status
superia readiness
```

Ne pas automatiser `git pull` lorsqu’il existe des modifications locales.

## Désinstallation

```bash
bash install/pi/uninstall.sh
```

Le service et le wrapper sont retirés. Le répertoire de contrôle, les receipts, sauvegardes, notifications, safety, dépôts et worktrees sont conservés.

## Ce que la CI prouve

- build TypeScript ;
- **89 tests réussis** sur le lot fonctionnel v0.18 ;
- audit npm sans vulnérabilité signalée ;
- arrêt d’urgence fail-closed ;
- blocage des agents et pipelines réels ;
- groupe de processus réel arrêté par escalade ;
- état safety visible dans readiness et web ;
- sauvegarde privée de l’état safety ;
- interface web locale authentifiée ;
- notifications dédupliquées ;
- DAG, réseau et sauvegardes ;
- Gitleaks, Bubblewrap et garde Git ;
- pipeline, checkpoints et budgets ;
- scripts Pi valides ;
- propagation de `SUPERIA_HOME` ;
- absence de `sudo` caché.

## Ce que le Pi doit encore prouver

- installation ARM64 complète ;
- namespaces Bubblewrap opérationnels ;
- service après déconnexion ;
- arrêt d’urgence sous systemd ;
- web et notifications après redémarrage ;
- Codex et Vibe authentifiés ;
- pipeline réel ;
- reprise après coupure ;
- dépôt Restic et restauration sur copie.

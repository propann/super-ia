# Installation sur Raspberry Pi 5

Super IA s’installe comme **plan de contrôle utilisateur**. Le Pi stocke et orchestre l’état ; aucun modèle IA local n’est obligatoire. L’installateur Pi lui-même n’utilise pas `sudo`.

La préparation du support et de SSH est détaillée dans [PI_BOOTSTRAP.md](PI_BOOTSTRAP.md).

## Prérequis

- Raspberry Pi 5 sous Linux 64 bits ;
- système démarré sur HDD/SSD ou NVMe recommandé ;
- accès SSH opérationnel ;
- Git ;
- Node.js 22.5 ou supérieur ;
- npm ;
- systemd utilisateur ;
- Gitleaks et Bubblewrap pour les agents réels ;
- Restic facultatif.

## Préflight en lecture seule

```bash
sh install/pi/preflight.sh
sh install/pi/preflight.sh --strict
```

Le script vérifie architecture, distribution, source de `/`, SD/HDD/SSD/NVMe, espace libre, Git, npm, Node, outils, SSH, systemd utilisateur et linger. Il ne contacte aucun serveur, ne demande aucun privilège et ne modifie aucun fichier.

## Installation v0.20

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
bash install/pi/install.sh
```

L’installateur :

1. vérifie Git, npm et Node ;
2. détecte Bubblewrap et Gitleaks ;
3. installe les dépendances JavaScript ;
4. compile et exécute les tests ;
5. initialise le plan de contrôle ;
6. installe `~/.local/bin/superia` ;
7. crée le service systemd utilisateur ;
8. lance un tick du daemon ;
9. crée et vérifie une sauvegarde locale ;
10. exécute l’autotest Bubblewrap lorsqu’il est disponible ;
11. enregistre `sandbox-status.json` en `0600` ;
12. active le service lorsque systemd utilisateur est disponible.

## Préparation complète du profil Standard

```bash
bash install/tools/prepare-machine.sh --phase plan --profile standard
sudo bash install/tools/prepare-machine.sh --phase system --profile standard
bash install/tools/prepare-machine.sh --phase user --profile standard
bash install/tools/prepare-machine.sh --phase superia
bash install/tools/prepare-machine.sh --phase verify --profile standard
```

Le privilège administrateur apparaît uniquement dans la phase système explicitement lancée par l’utilisateur.

## Répertoire de contrôle personnalisé

```bash
export SUPERIA_HOME=/mnt/stockage/superia-control
bash install/pi/install.sh
```

La même valeur est utilisée par le wrapper, le service, SQLite, le journal, les sauvegardes, la restauration, les benchmarks, Bubblewrap, le web, les notifications et l’arrêt d’urgence.

Le chemin choisi doit être sur un stockage monté de manière stable avant le démarrage du service.

## Vérification initiale

```bash
sh install/pi/preflight.sh
superia control status --json
superia doctor
superia connection policy
superia security scan --required
superia security sandbox-check --json
superia safety status
superia readiness
superia benchmark summary
superia route --mode plan --budget zero
superia notify status
superia daemon --once --json
superia backup create
superia backup list
superia backup drill
superia matrix --once
superia web token
systemctl --user status superia.service
journalctl --user -u superia.service -n 100 --no-pager
```

## Routeur et mesures locales

```bash
superia route --mode plan --budget zero
superia route --mode build --budget low --require-commands
superia route --mode review --budget any --json
superia benchmark summary
```

Après les premiers essais réels, enregistrer uniquement des mesures bornées :

```bash
superia benchmark record codex-cli \
  --mode plan --success \
  --duration-ms 42000 \
  --cost-eur 0 \
  --quality 85
```

Le registre ne contient aucun prompt, code, réponse ou secret. Trois échantillons comparables sont nécessaires avant d’influencer le routeur. Les exclusions de sécurité, de budget, de capacité et de readiness restent absolues.

Voir [BENCHMARKS.md](BENCHMARKS.md).

## Interface web locale

```bash
superia web
```

Adresse locale :

```text
http://127.0.0.1:3210
```

Depuis un autre ordinateur, utiliser un tunnel SSH :

```bash
ssh -L 3210:127.0.0.1:3210 UTILISATEUR@ADRESSE_DU_PI
```

Vérifier connexion, projets, missions, runs, notifications, safety, readiness, fermeture de session et affichage mobile. Le serveur refuse l’écoute LAN.

## Notifications locales

```bash
superia notify status
superia notify configure --runs --blocked-tasks --no-stdout
superia notify run
superia notify list --limit 50
```

Les fichiers sous `SUPERIA_HOME/notifications` doivent être en `600`.

## Arrêt d’urgence sur le Pi

```bash
superia safety status
superia safety engage --category maintenance
superia readiness
superia safety release
```

Sous arrêt : contrôle local disponible, agents réels bloqués, web informatif, dry-runs disponibles.

Pour le test avec un run géré :

1. utiliser un projet de démonstration ;
2. confirmer le PID et le heartbeat avec `superia run list` ;
3. engager `superia safety engage --category security` ;
4. vérifier le rapport `SIGTERM` / `SIGKILL` ;
5. consulter les événements ;
6. confirmer qu’aucun processus du groupe ne subsiste ;
7. libérer l’arrêt.

Ne jamais enregistrer manuellement le PID d’un service système ou d’un processus non créé par Super IA.

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
superia pipeline run TASK-0001 --builder codex --reviewer vibe --dry-run
```

Pipeline réel après authentification :

```bash
superia pipeline run TASK-0001 \
  --builder codex --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Aucun plafond n’est inventé silencieusement et aucune fusion n’est automatique.

## Coupure et reprise

```bash
systemctl --user restart superia.service
superia recover --stale-minutes 1
superia run list
superia events --limit 100
superia notify list --limit 20
```

Résultat attendu : run abandonné `interrupted`, SQLite intact, daemon reparti, une seule notification et aucun doublon.

## Sauvegarde et restauration locale

```bash
superia backup create
superia backup list
superia backup verify "$SUPERIA_HOME/backups/backup-YYYYMMDDHHMMSS"
superia backup restore \
  "$SUPERIA_HOME/backups/backup-YYYYMMDDHHMMSS" \
  --target "$HOME/superia-restored-check"
superia backup drill
```

La restauration valide :

- manifeste, tailles et SHA-256 ;
- intégrité SQLite ;
- syntaxe JSONL ;
- safety ;
- configuration et curseur de notifications ;
- registre de benchmarks lorsqu’il existe.

Elle produit un reçu privé et ne remplace jamais automatiquement le contrôle actif. Le drill compare projets, missions, runs, événements, journal et nombre de benchmarks.

Voir [RECOVERY.md](RECOVERY.md).

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
git status
git pull
npm install
npm test
bash install/pi/install.sh
superia security sandbox-check
superia safety status
superia readiness
superia benchmark summary
superia backup drill
```

Ne pas automatiser `git pull` lorsqu’il existe des modifications locales.

## Désinstallation

```bash
bash install/pi/uninstall.sh
```

Le service et le wrapper sont retirés. Le répertoire de contrôle, les receipts, sauvegardes, benchmarks, notifications, safety, dépôts et worktrees sont conservés.

## Ce que la CI prouve

- build TypeScript ;
- **103 tests réussis** sur le lot fonctionnel v0.20 ;
- audit npm sans vulnérabilité signalée ;
- restauration atomique vers une nouvelle cible ;
- intégrité SQLite, JSONL et benchmarks vérifiée ;
- drill comparant les données durables ;
- registre de benchmarks privé et fail-closed ;
- seuil de confiance et influence mesurée bornée ;
- impossibilité de rendre un fournisseur interdit éligible ;
- routeur hors ligne explicable ;
- préflight Pi/HDD/SSH en lecture seule ;
- arrêt d’urgence fail-closed et escalade de groupe ;
- web local authentifié et notifications dédupliquées ;
- DAG, réseau, Gitleaks, Bubblewrap, garde Git et pipeline ;
- scripts Pi valides ;
- propagation de `SUPERIA_HOME` ;
- absence de `sudo` caché et de téléchargement pipé vers un shell.

## Ce que le Pi doit encore prouver

- installation ARM64 complète ;
- racine réellement démarrée sur le HDD/SSD cible ;
- namespaces Bubblewrap opérationnels ;
- service après déconnexion ;
- arrêt d’urgence sous systemd ;
- web et notifications après redémarrage ;
- restauration v0.20 sur le stockage réel ;
- Codex et Vibe authentifiés ;
- pipeline réel ;
- reprise après coupure ;
- dépôt Restic et restauration hors machine ;
- au moins trois mesures réelles comparables par fournisseur et par mode ;
- grille de qualité et fallback du routeur.

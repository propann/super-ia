# Installation sur Raspberry Pi 5

Super IA s’installe comme **plan de contrôle utilisateur**. Le Pi stocke et orchestre l’état ; il n’exécute aucun modèle IA local obligatoire. L’installateur Pi lui-même n’utilise pas `sudo`.

## Prérequis

- Raspberry Pi 5 sous Linux 64 bits ;
- NVMe recommandé ;
- Git ;
- Node.js 22.5 ou supérieur ;
- npm ;
- systemd utilisateur ;
- Gitleaks pour les agents réels ;
- Bubblewrap pour les agents réels ;
- Restic facultatif pour la copie chiffrée hors machine.

Le centre de contrôle reste installable sans Gitleaks ou Bubblewrap, mais Codex et Vibe sont alors bloqués par défaut.

## Installation v0.15

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
bash install/pi/install.sh
```

L’installateur :

1. vérifie Git, npm et Node ;
2. détecte Bubblewrap et Gitleaks ;
3. installe les dépendances npm ;
4. compile et exécute la suite de tests ;
5. initialise le plan de contrôle ;
6. installe `~/.local/bin/superia` ;
7. crée le service systemd utilisateur ;
8. lance un tick du daemon ;
9. crée et vérifie une sauvegarde locale ;
10. exécute l’autotest Bubblewrap lorsqu’il est disponible ;
11. enregistre `sandbox-status.json` en `0600` ;
12. active le service lorsque systemd utilisateur est disponible.

## Répertoire de contrôle personnalisé

La valeur de `SUPERIA_HOME` est conservée dans :

- le wrapper `~/.local/bin/superia` ;
- l’unité systemd utilisateur ;
- `ReadWritePaths` de l’unité ;
- l’initialisation, les sauvegardes et la preuve Bubblewrap.

Exemple :

```bash
export SUPERIA_HOME=/mnt/nvme/superia-control
bash install/pi/install.sh
```

Le daemon et la CLI utiliseront le même répertoire. Il ne faut pas déplacer ce répertoire sans régénérer le wrapper et le service.

## Vérification initiale

```bash
superia control status --json
superia doctor
superia connection policy
superia security scan --required
superia security sandbox-check --json
superia readiness
superia daemon --once --json
superia backup list
superia matrix --once
systemctl --user status superia.service
journalctl --user -u superia.service -n 100 --no-pager
```

Le rapport Bubblewrap doit avoir `passed: true`. `readiness` doit distinguer clairement le contrôle local de l’autorisation des agents réels.

## Préparer une mission et son DAG

```bash
cd /chemin/du/projet
superia init
superia task create "Modifier le module d'authentification"
superia task create "Ajouter les tests"

superia task update TASK-0001 \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "tests réussis" \
  --accept "review indépendante approuvée"

superia task update TASK-0002 --depends TASK-0001
superia task graph
superia task reconcile
superia worktree TASK-0001
```

Les cycles sont refusés. Une mission attend automatiquement ses prérequis.

## Premier pipeline

Prévisualisation sans agent ni dépense :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --dry-run
```

Après authentification officielle :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Pour tout pipeline réel utilisant Vibe, `--max-price` et `--max-total-price` sont obligatoires. Aucun plafond n’est inventé silencieusement.

## Reprise et correction

Reprise d’une interruption technique :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-price 0.25 \
  --max-total-price 0.75 \
  --resume
```

Correction après une review `changes-requested` :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-price 0.25 \
  --max-total-price 0.75 \
  --retry
```

Les plafonds du premier lancement restent immuables. Un patch identique arrête la boucle avant une nouvelle review.

## Agents séparés

Codex en lecture seule :

```bash
superia agent run codex TASK-0001 --mode plan --dry-run
superia agent run codex TASK-0001 --mode plan
```

Mistral Vibe en lecture seule :

```bash
superia agent run vibe TASK-0001 \
  --mode plan \
  --max-turns 8 \
  --max-tokens 50000 \
  --max-price 0.25
```

Un run Vibe réel sans `--max-price` est refusé.

## Fichiers privés du worktree

Avant un agent réel, Super IA recherche les fichiers sensibles suivis, non suivis et ignorés. Bubblewrap masque notamment `.env`, credentials, clés, bases locales et répertoires de configuration cloud.

Cette barrière complète Gitleaks : un fichier privé ignoré mais non reconnu comme secret reste masqué dans la sandbox.

## Test de coupure et reprise

```bash
systemctl --user restart superia.service
superia recover --stale-minutes 1
superia run list
superia events --limit 100
```

Le scénario de coupure brutale réelle reste à exécuter sur le Pi.

## Sauvegarde locale et Restic

```bash
superia backup create
superia backup list
superia backup verify "$SUPERIA_HOME/backups/backup-YYYYMMDDHHMMSS"
```

Préparer Restic sans accès réseau :

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

La rétention reste une prévisualisation `forget --dry-run`. Super IA ne génère pas de `--prune` automatique.

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
superia readiness
```

Ne pas automatiser `git pull` lorsqu’il existe des modifications locales.

## Désinstallation

```bash
bash install/pi/uninstall.sh
```

Le service et le wrapper sont retirés. Le répertoire de contrôle, les receipts, sauvegardes, dépôts et worktrees sont conservés.

## Ce que la CI prouve

- build TypeScript ;
- **79 tests réussis** sur le head vérifié ;
- audit npm sans vulnérabilité signalée ;
- DAG, readiness, réseau et sauvegardes ;
- préflight Gitleaks ;
- construction Bubblewrap et masquage des fichiers privés ;
- conservation exacte des chemins Git ;
- contrôle de périmètre Git ;
- reviewer indépendant ;
- pipeline, checkpoints et budgets ;
- arrêt des descendants après timeout ;
- scripts Pi valides ;
- propagation de `SUPERIA_HOME` ;
- absence de `sudo` dans le paquet Pi.

## Ce que le Pi doit encore prouver

- installation ARM64 complète ;
- namespaces Bubblewrap réellement opérationnels ;
- service après déconnexion ;
- Codex et Vibe authentifiés ;
- pipeline réel avec deux fournisseurs ;
- reprise après coupure ;
- dépôt Restic réel et restauration sur copie.

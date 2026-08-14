# Installation sur Raspberry Pi 5

Super IA s'installe comme **plan de contrôle utilisateur**. Aucun modèle IA local n'est requis et l'installateur n'utilise pas `sudo`.

## Prérequis

- Raspberry Pi 5 sous Linux 64 bits ;
- NVMe recommandé ;
- Git ;
- Node.js 22.5 ou supérieur ;
- npm ;
- systemd utilisateur ;
- Gitleaks pour les agents réels ;
- Bubblewrap pour les agents réels.

Le centre de contrôle reste installable sans Gitleaks ou Bubblewrap, mais Codex et Vibe sont alors bloqués par défaut.

## Installation v0.13

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
bash install/pi/install.sh
```

L'installateur :

1. vérifie Git, npm et Node ;
2. détecte Bubblewrap et Gitleaks ;
3. installe les dépendances npm ;
4. compile et exécute les **32 tests** ;
5. initialise `~/.superia` ;
6. installe `~/.local/bin/superia` ;
7. crée le service systemd utilisateur ;
8. lance un tick du daemon ;
9. crée et vérifie une sauvegarde ;
10. exécute l'autotest Bubblewrap lorsqu'il est disponible ;
11. écrit `~/.superia/sandbox-status.json` ;
12. active le service lorsque systemd utilisateur est disponible.

## Vérification initiale

```bash
superia control status --json
superia doctor
superia security scan --required
superia security sandbox-check --json
superia daemon --once --json
superia backup list
superia matrix --once
systemctl --user status superia.service
journalctl --user -u superia.service -n 100 --no-pager
```

Le rapport Bubblewrap doit avoir `passed: true` avant validation matérielle.

## Préparer un vrai build

Un build exige un worktree et un périmètre explicite :

```bash
cd /chemin/du/projet
superia init
superia task create "Modifier le module d'authentification"

superia task update TASK-0001 \
  --provider codex-cli \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "tests réussis"

superia worktree TASK-0001
superia agent run codex TASK-0001 --mode build
```

Après le run, vérifier :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Toute modification hors périmètre transforme le run en échec.

## Tester Codex en lecture seule

```bash
superia doctor
superia security sandbox-check
superia agent run codex TASK-0001 --mode plan --dry-run
superia agent run codex TASK-0001 --mode plan
```

Politique : sandbox native Codex conservée, Bubblewrap externe, dépôt en lecture seule et seule sortie technique montée en écriture.

## Tester Mistral Vibe

```bash
superia doctor
superia security sandbox-check
superia agent run vibe TASK-0001 \
  --mode plan \
  --max-turns 8 \
  --max-tokens 50000 \
  --max-price 0.25
```

Vibe n'obtient aucun shell. Bubblewrap limite son HOME et son accès au workspace.

## Test de reprise

Après un premier run contrôlé :

```bash
systemctl --user restart superia.service
superia recover --stale-minutes 1
superia run list
superia events --limit 100
```

Le scénario complet de coupure brutale reste à exécuter et à documenter dans `SIA-102`.

## Sauvegarde et restauration

```bash
superia backup create
superia backup list
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS
```

La restauration dans un nouvel emplacement et Restic restent à valider.

## Fonctionnement après déconnexion

```bash
loginctl enable-linger "$USER"
```

Cette opération peut demander une autorisation administrative. L'installateur ne la force pas.

## Mise à jour

```bash
cd /chemin/vers/super-ia
git pull
npm install
npm test
systemctl --user restart superia.service
superia security sandbox-check
```

Ne pas automatiser `git pull` lorsqu'il existe des modifications locales.

## Désinstallation

```bash
bash install/pi/uninstall.sh
```

Le service et le wrapper sont retirés. `~/.superia`, les receipts, sauvegardes, dépôts et worktrees sont conservés.

## Ce que la CI prouve

- build TypeScript ;
- 32 tests ;
- préflight Gitleaks ;
- politique Bubblewrap avec mocks ;
- contrôle de périmètre Git de bout en bout ;
- scripts Pi valides ;
- absence de `sudo`.

## Ce que le Pi doit encore prouver

- namespaces Bubblewrap réellement opérationnels ;
- installation complète ;
- Codex et Vibe authentifiés ;
- reprise après coupure ;
- restauration ;
- service après déconnexion.

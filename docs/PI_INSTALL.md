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

## Installation v0.14

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
4. compile et exécute les **44 tests** ;
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

## Préparer une mission

```bash
cd /chemin/du/projet
superia init
superia task create "Modifier le module d'authentification"

superia task update TASK-0001 \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "tests réussis" \
  --accept "review indépendante approuvée"

superia worktree TASK-0001
```

## Premier pipeline

Commencer sans appel réel :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75 \
  --dry-run
```

Après authentification officielle des deux CLI :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Le sens inverse est possible : Vibe builder et Codex reviewer.

## Contrôler le pipeline

```bash
superia pipeline status TASK-0001
superia task board
superia run list
superia events --limit 100
```

Artefacts attendus :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
REVIEW.json
RECEIPT.json
.superia/pipelines/TASK-0001.json
```

Toute modification hors périmètre transforme le run en échec.

## Reprise après interruption

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --resume
```

Les étapes déjà terminées ne sont pas relancées.

## Correction après review

Une correction exige un verdict `changes-requested` et une action explicite :

```bash
superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --retry
```

Les plafonds du premier lancement sont immuables. La review précédente est injectée au builder. Un patch identique à une tentative antérieure arrête la boucle avant une nouvelle review.

Le prix affiché est le plafond Vibe réservé, pas une dépense réelle supposée.

## Tester les agents séparément

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

Vibe n'obtient aucun shell. Codex conserve sa sandbox native. Les deux passent par Gitleaks et Bubblewrap.

## Test de coupure et reprise

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

Le service et le wrapper sont retirés. `~/.superia`, receipts, sauvegardes, dépôts et worktrees sont conservés.

## Ce que la CI prouve

- build TypeScript ;
- 44 tests ;
- préflight Gitleaks ;
- politique Bubblewrap avec mocks ;
- contrôle de périmètre Git ;
- reviewer indépendant ;
- pipeline et checkpoints ;
- reprise sans double exécution ;
- budgets de retry immuables ;
- détection de patch identique ;
- scripts Pi valides ;
- absence de `sudo`.

## Ce que le Pi doit encore prouver

- namespaces Bubblewrap réellement opérationnels ;
- installation complète ;
- Codex et Vibe authentifiés ;
- pipeline réel avec deux fournisseurs ;
- reprise après coupure ;
- restauration ;
- service après déconnexion.

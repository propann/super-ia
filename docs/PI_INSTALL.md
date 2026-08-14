# Installation sur Raspberry Pi 5

Ce paquet installe Super IA comme **plan de contrôle utilisateur**. Il n'installe aucun modèle IA local et n'utilise pas `sudo`.

## Cible

- Raspberry Pi 5 ;
- Linux 64 bits ;
- stockage NVMe recommandé ;
- Git ;
- Node.js 22.5 ou supérieur ;
- npm ;
- systemd utilisateur ;
- Bubblewrap pour les agents réels ;
- Gitleaks pour les agents réels.

Le centre de contrôle peut être installé sans Bubblewrap ou Gitleaks, mais Codex et Vibe seront alors refusés par défaut.

## Installation

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
4. compile et lance tous les tests ;
5. initialise `~/.superia` ;
6. installe `~/.local/bin/superia` ;
7. génère un service systemd utilisateur durci ;
8. lance un tick du daemon ;
9. crée et vérifie la première sauvegarde ;
10. exécute l'autotest Bubblewrap lorsqu'il est disponible ;
11. enregistre le résultat dans `~/.superia/sandbox-status.json` ;
12. active le daemon lorsque systemd utilisateur est disponible.

Aucune commande root n'est exécutée.

## Fichiers installés

```text
~/.local/bin/superia
~/.config/systemd/user/superia.service
~/.superia/
├── control.sqlite
├── events/events.jsonl
├── runs/<RUN-ID>/
├── providers/
├── security/
├── backups/
├── sandbox-status.json
└── daemon-status.json
```

## Vérification initiale

```bash
superia control status --json
superia doctor
superia security scan --required
superia security sandbox-check
superia daemon --once --json
superia backup list
superia matrix --once
systemctl --user status superia.service
journalctl --user -u superia.service -n 100 --no-pager
```

Le contrôle Bubblewrap doit afficher tous les checks en réussite avant de considérer la sandbox matériellement validée.

## Ce que vérifie l'autotest Bubblewrap

```bash
superia security sandbox-check --json
```

Le rapport couvre :

- démarrage de Bubblewrap ;
- espaces de noms demandés ;
- HOME jetable ;
- fichier extérieur invisible ;
- écriture autorisée dans un workspace `read-write` ;
- écriture dans l'état explicitement autorisé ;
- refus d'écriture dans un workspace `read-only` ;
- namespace réseau isolé demandé.

Un échec peut indiquer que les espaces de noms utilisateur sont désactivés par le noyau ou la politique de la distribution.

## Fonctionnement après déconnexion

```bash
loginctl enable-linger "$USER"
```

Cette opération peut demander une autorisation administrative. L'installateur ne la force pas.

## Sécurité du service

Le service applique notamment :

- `NoNewPrivileges=true` ;
- système en lecture seule ;
- dossier personnel en lecture seule sauf `~/.superia` ;
- noyau, modules et groupes de contrôle protégés ;
- interdiction SUID/SGID ;
- redémarrage seulement en cas d'échec.

Le daemon synchronise les projets et récupère les runs abandonnés. Il ne lance aucun agent IA automatiquement.

## Enregistrer un projet

```bash
cd /chemin/du/projet
superia init
superia task create "Analyser le projet"
superia project list
```

Pour un build :

```bash
superia worktree TASK-0001 --dry-run
superia worktree TASK-0001
```

## Codex

Après installation et authentification officielles :

```bash
superia doctor
superia security sandbox-check
superia agent run codex TASK-0001 --mode plan --dry-run
superia agent run codex TASK-0001 --mode plan
```

Politique :

- sandbox native Codex conservée ;
- Bubblewrap externe obligatoire ;
- dépôt en lecture seule en mode plan/review ;
- seul le fichier de dernière réponse est monté en écriture ;
- build refusé sans worktree.

## Mistral Vibe

Après installation et authentification officielles :

```bash
superia doctor
superia security sandbox-check
superia agent run vibe TASK-0001 --mode plan --dry-run
superia agent run vibe TASK-0001 \
  --mode plan \
  --max-turns 8 \
  --max-tokens 50000 \
  --max-price 0.25
```

Vibe n'obtient aucun shell. Bubblewrap limite son HOME et l'accès au workspace.

## Dérogations

```bash
superia agent run codex TASK-0001 \
  --mode plan \
  --allow-without-gitleaks \
  --allow-without-bwrap
```

Les dérogations sont visibles et journalisées. Elles ne doivent servir qu'au diagnostic et ne valident pas la machine.

## Receipts

```bash
superia receipt create <RUN-ID>
superia receipt verify ~/.superia/runs/<RUN-ID>/RECEIPT.json
```

Un receipt valide prouve que ses artefacts n'ont pas changé. Il ne supprime jamais l'approbation humaine.

## Sauvegardes

```bash
superia backup create
superia backup list
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS
```

Une copie hors du Pi reste nécessaire. Restic et la restauration automatisée seront ajoutés ultérieurement.

## Mise à jour

```bash
cd /chemin/vers/super-ia
git pull
npm install
npm test
systemctl --user restart superia.service
superia security sandbox-check
```

Ne pas automatiser `git pull` sur une branche contenant des modifications locales.

## Désinstallation

```bash
bash install/pi/uninstall.sh
```

Le service et le wrapper sont retirés. `~/.superia`, les receipts, sauvegardes, dépôts et worktrees restent conservés.

## Statut de validation

La CI vérifie :

- compilation ;
- **28 tests** ;
- génération de la politique Bubblewrap ;
- branchement Codex/Vibe ;
- syntaxe des scripts ;
- absence de `sudo` dans le paquet.

La CI utilise des mocks pour Bubblewrap. L'installation, l'autotest noyau et les connexions Codex/Vibe doivent encore être exécutés sur le Pi 5 réel avant validation matérielle.

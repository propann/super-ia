# Installation sur Raspberry Pi 5

Ce paquet installe Super IA comme **plan de contrôle utilisateur**. Il n'installe aucun modèle IA local et n'utilise pas `sudo`.

## Cible

- Raspberry Pi 5 ;
- Linux 64 bits ;
- stockage NVMe recommandé ;
- Git ;
- Node.js 22.5 ou supérieur ;
- npm ;
- systemd utilisateur.

Le Pi conserve les dépôts, missions, contextes, runs, événements, receipts et sauvegardes. Codex et Mistral Vibe sont installés et authentifiés séparément par leurs méthodes officielles.

## Installation

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
bash install/pi/install.sh
```

L'installateur :

1. vérifie Git, npm et Node ;
2. installe les dépendances ;
3. compile et lance tous les tests ;
4. initialise `~/.superia` ;
5. installe `~/.local/bin/superia` ;
6. génère un service systemd utilisateur durci ;
7. lance un tick du daemon ;
8. crée la première sauvegarde ;
9. vérifie immédiatement cette sauvegarde ;
10. active le daemon lorsque systemd utilisateur est disponible.

Aucune commande root n'est exécutée.

## Fichiers installés

```text
~/.local/bin/superia
~/.config/systemd/user/superia.service
~/.superia/
├── control.sqlite
├── events/events.jsonl
├── runs/<RUN-ID>/
├── backups/
└── daemon-status.json
```

Le dépôt cloné reste le code exécutable du service.

## Vérification initiale

```bash
superia control status --json
superia daemon --once --json
superia backup list
superia matrix --once
systemctl --user status superia.service
journalctl --user -u superia.service -n 100 --no-pager
```

## Fonctionnement après déconnexion

Selon la configuration du système, le service utilisateur peut s'arrêter à la fermeture de session. Pour un Pi serveur permanent :

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

Le daemon :

- synchronise les projets ;
- récupère les runs abandonnés ;
- écrit son état de santé ;
- ne lance aucun agent IA.

Les agents sont lancés explicitement par l'utilisateur.

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

## Installer et contrôler Codex

Après installation et authentification officielles :

```bash
superia doctor
superia agent run codex TASK-0001 --mode plan --dry-run
superia agent run codex TASK-0001 --mode plan
```

Le mode build est refusé sans worktree :

```bash
superia agent run codex TASK-0001 --mode build
```

Codex garde sa sandbox officielle.

## Installer et contrôler Mistral Vibe

Après installation et authentification officielles :

```bash
superia doctor
superia agent run vibe TASK-0001 --mode plan --dry-run
superia agent run vibe TASK-0001 \
  --mode plan \
  --max-turns 8 \
  --max-tokens 50000 \
  --max-price 0.25
```

Super IA désactive le shell de Vibe. Les validations sont lancées séparément :

```bash
superia validate
```

## Receipts

Après un run :

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

La sauvegarde contient :

- image SQLite créée avec `VACUUM INTO` ;
- journal JSONL ;
- manifeste tailles/SHA-256.

Une copie hors du Pi reste nécessaire. Restic et la restauration automatisée seront ajoutés ultérieurement.

## Mise à jour

```bash
cd /chemin/vers/super-ia
git pull
npm install
npm test
systemctl --user restart superia.service
```

Ne pas automatiser `git pull` sur une branche contenant des modifications locales.

## Désinstallation

```bash
bash install/pi/uninstall.sh
```

Le service et le wrapper sont retirés, mais les éléments suivants restent conservés :

- `~/.superia` ;
- receipts et sauvegardes ;
- dépôts Git ;
- worktrees.

## Statut de validation

La CI vérifie :

- compilation ;
- 22 tests ;
- syntaxe des scripts ;
- absence de `sudo` dans le paquet.

L'installation complète et les connexions Codex/Vibe doivent encore être testées sur le Pi 5 réel avant de déclarer le paquet matériellement validé.

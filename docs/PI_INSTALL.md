# Installation sur Raspberry Pi 5

Ce paquet installe Super IA comme **plan de contrôle utilisateur**. Il n'installe aucun modèle IA local et n'utilise pas `sudo`.

## Cible

- Raspberry Pi 5 ;
- système Linux 64 bits ;
- stockage NVMe recommandé ;
- Git ;
- Node.js 22.5 ou supérieur ;
- npm ;
- systemd utilisateur.

Le Pi conserve les dépôts, missions, contextes, runs, événements et sauvegardes. Les CLI Codex, Mistral Vibe ou autres sont ajoutées séparément et utilisent leurs voies officielles.

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
6. génère un service systemd utilisateur ;
7. lance un tick de contrôle ;
8. crée et vérifie implicitement la première sauvegarde par manifeste ;
9. active le daemon lorsque le gestionnaire systemd utilisateur est disponible.

Aucune commande n'est exécutée avec les privilèges root.

## Fichiers installés

```text
~/.local/bin/superia
~/.config/systemd/user/superia.service
~/.superia/
├── control.sqlite
├── events/events.jsonl
├── runs/
├── backups/
└── daemon-status.json
```

Le dépôt reste à son emplacement de clonage et sert de code exécutable au service.

## Vérification

```bash
superia control status --json
superia daemon --once --json
superia backup list
superia matrix --once
systemctl --user status superia.service
journalctl --user -u superia.service -n 100 --no-pager
```

## Fonctionnement après déconnexion

Un service utilisateur peut s'arrêter lorsque sa session disparaît. Pour un Pi utilisé comme serveur permanent, le compte utilisateur peut avoir besoin du mode linger :

```bash
loginctl enable-linger "$USER"
```

Cette opération dépend de la politique du système et peut demander une autorisation administrative. L'installateur ne la force pas.

## Sécurité du service

Le service applique notamment :

- `NoNewPrivileges=true` ;
- système de fichiers système en lecture seule ;
- dossier personnel en lecture seule, sauf `~/.superia` ;
- noyau, modules et groupes de contrôle protégés ;
- interdiction des exécutables SUID/SGID ;
- redémarrage uniquement en cas d'échec.

Le daemon ne lance aucun agent IA. Il synchronise les projets enregistrés, récupère les runs abandonnés et écrit son état de santé.

Les commandes `superia agent run ...` sont lancées explicitement par l'utilisateur ou, plus tard, par un ordonnanceur soumis à approbation.

## Installer Codex séparément

Super IA détecte `codex` dans le `PATH`. L'installation et l'authentification doivent utiliser la méthode officielle du fournisseur. Après installation :

```bash
superia doctor
superia agent run codex TASK-0001 --mode plan --dry-run
```

Le mode réel n'est lancé qu'après retrait de `--dry-run`.

## Sauvegardes

Créer une sauvegarde cohérente :

```bash
superia backup create
```

Vérifier une sauvegarde :

```bash
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS
```

La sauvegarde contient :

- une image SQLite créée avec `VACUUM INTO` ;
- le journal JSONL ;
- un manifeste avec tailles et SHA-256.

Une copie hors du Pi reste nécessaire. Restic sera intégré dans un lot ultérieur ; en attendant, le dossier de sauvegarde peut être copié vers un stockage externe après validation.

## Mise à jour

```bash
cd /chemin/vers/super-ia
git pull
npm install
npm test
systemctl --user restart superia.service
```

Ne pas mettre à jour automatiquement une branche contenant des modifications locales.

## Désinstallation

```bash
bash install/pi/uninstall.sh
```

Cette commande retire le service et le wrapper, mais conserve :

- `~/.superia` ;
- les sauvegardes ;
- les dépôts Git ;
- les worktrees.

## Statut de validation

Le script est vérifié par la CI pour sa syntaxe et le cœur logiciel est couvert par les tests automatisés. L'installation complète doit encore être exécutée sur le Pi 5 réel avant de déclarer le paquet matériellement validé.

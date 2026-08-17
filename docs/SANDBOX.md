# Sandbox Bubblewrap

## Objectif

La sandbox commune réduit ce qu’un agent peut voir et modifier autour de son worktree. Elle complète, sans remplacer :

- la sandbox native de Codex ;
- l’interdiction du shell dans Mistral Vibe ;
- le préflight Gitleaks ;
- les worktrees Git ;
- les validations, le garde des modifications et les receipts.

## État dans v0.15

La construction des arguments, les préflights, les dérogations, le masquage des fichiers privés et l’intégration Codex/Vibe sont validés par la CI.

L’isolation noyau réelle doit encore être vérifiée sur le Raspberry Pi 5 avec :

```bash
superia security sandbox-check
superia security sandbox-check --json
```

La commande enregistre une preuve privée en `0600` :

```text
~/.superia/sandbox-status.json
```

`superia readiness` exige une preuve réussie et récente avant de déclarer les agents réels prêts sous Linux.

## Politique

### Tous les modes

Bubblewrap reçoit notamment :

```text
--die-with-parent
--new-session
--unshare-user
--disable-userns
--unshare-ipc
--unshare-pid
--unshare-uts
--unshare-cgroup-try
--cap-drop ALL
```

Le système utile est monté en lecture seule. `/proc` et `/dev` sont recréés. `/tmp` est un tmpfs limité à 256 Mio.

Le vrai dossier personnel n’est pas monté. L’agent reçoit :

```text
HOME=/home/superia
XDG_CONFIG_HOME=/home/superia/.config
XDG_CACHE_HOME=/home/superia/.cache
XDG_DATA_HOME=/home/superia/.local/share
```

Ce HOME est supprimé à la fin du run.

### Masquage des fichiers privés du worktree

Avant un run réel, Super IA interroge Git pour obtenir :

1. les fichiers suivis ;
2. les fichiers non suivis ;
3. les fichiers ignorés.

Les chemins sensibles sont ensuite masqués **après** le montage du workspace, afin que le masque prenne priorité sur la vue complète du dépôt.

Exemples masqués :

- `.env` et variantes `.env.*` ;
- `.npmrc`, `.pypirc`, `.netrc`, `.git-credentials` ;
- clés privées et certificats sensibles ;
- `credentials.json`, `secrets.json`, `auth.json` ;
- bases `.db`, `.sqlite`, `.sqlite3` et coffres `.kdbx` ;
- fichiers Age, GPG, PGP, VPN et configurations mobiles ;
- répertoires `.ssh`, `.gnupg`, `.aws`, `.azure`, `.kube`, `.docker` et `.terraform`.

Un fichier est remplacé par un montage en lecture seule de `/dev/null`. Un répertoire sensible reçoit un tmpfs vide.

Le masque est listé dans les métadonnées de sandbox et dans le journal de préflight, mais aucune valeur du fichier n’est lue ou enregistrée.

### Mode plan ou review

Le dépôt ou worktree est monté en lecture seule.

Une sortie individuelle peut être montée en écriture. Codex utilise cette exception uniquement pour son fichier de dernière réponse.

### Mode build

Le worktree de la mission est monté en lecture-écriture. Le dépôt principal reste hors du périmètre d’écriture de la mission.

Le garde post-run vérifie ensuite les fichiers réellement modifiés et refuse les chemins hors périmètre ou critiques.

### État persistant du fournisseur

Chaque fournisseur obtient un dossier explicite :

```text
~/.superia/providers/codex-cli/
~/.superia/providers/mistral-vibe/
```

Ces dossiers remplacent l’utilisation incontrôlée du vrai HOME pour les sessions et configurations nécessaires.

### Réseau

Codex et Vibe utilisent actuellement le réseau de l’hôte parce qu’ils doivent joindre leurs services officiels.

La politique supporte aussi un réseau isolé avec `--unshare-net`. L’autotest matériel demande cette isolation pour vérifier que le noyau accepte le namespace.

Les futurs agents locaux ou validateurs qui n’ont pas besoin d’Internet devront utiliser le mode réseau isolé.

## Préflight obligatoire

Avant un run réel Codex ou Vibe :

1. Gitleaks doit réussir ;
2. Bubblewrap doit être disponible sous Linux ;
3. le worktree doit être analysé pour produire les masques privés ;
4. la politique est ajoutée aux métadonnées du run ;
5. le runner exécute le fournisseur à travers Bubblewrap ;
6. la configuration effective est inscrite dans `AGENT_RESULT.json`.

Sans Bubblewrap, l’agent est refusé par défaut.

## Dérogation exceptionnelle

```bash
superia agent run codex TASK-0001 \
  --mode plan \
  --allow-without-bwrap
```

Cette dérogation :

- doit être demandée explicitement ;
- produit l’état `waived` ;
- écrit l’événement `sandbox.preflight.waived` ;
- ne supprime ni Gitleaks, ni les worktrees, ni l’approbation humaine.

Elle retire aussi la garantie de masquage noyau du workspace. Elle ne doit donc pas être utilisée pour valider une installation de production.

## Autotest réel

`superia security sandbox-check` vérifie :

- démarrage de Bubblewrap ;
- création des namespaces demandés ;
- HOME jetable ;
- invisibilité d’un fichier extérieur ;
- écriture autorisée dans un workspace `read-write` ;
- écriture autorisée dans un état explicitement monté ;
- refus d’écriture dans un workspace `read-only` ;
- demande d’un namespace réseau isolé.

L’autotest échoue si les espaces de noms utilisateur sont désactivés par le noyau ou par la politique de la distribution.

## Timeout et descendants

Le runner crée un groupe de processus. En cas de timeout :

1. il envoie `SIGTERM` au groupe ;
2. il attend la période de grâce ;
3. il envoie `SIGKILL` au groupe ;
4. il attend cette escalade avant d’exécuter le garde des modifications ou de rendre le résultat.

Un descendant ne peut donc pas continuer à modifier le worktree après que le run a été déclaré terminé.

## Limites connues

- la CI valide les arguments et les comportements avec des exécutables contrôlés ;
- la frontière noyau réelle doit encore être prouvée sur le Pi 5 ;
- la compatibilité entre la sandbox externe et la sandbox native de Codex doit être testée sur le Pi ;
- le réseau de Codex/Vibe n’est pas encore filtré par domaine ;
- un fichier créé exactement entre la découverte des masques et le démarrage du namespace reste un cas de concurrence théorique ;
- Bubblewrap réduit l’exposition mais ne transforme pas un fournisseur distant en service local.

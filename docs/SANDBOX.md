# Sandbox Bubblewrap

## Objectif

La sandbox commune réduit ce qu'un agent peut voir et modifier autour de son worktree. Elle complète, sans remplacer :

- la sandbox native de Codex ;
- l'interdiction du shell dans Mistral Vibe ;
- le préflight Gitleaks ;
- les worktrees Git ;
- les validations et receipts.

## État dans v0.12

La construction des arguments, les préflights, les dérogations et l'intégration Codex/Vibe sont validés par la CI avec de faux exécutables.

L'isolation noyau réelle doit encore être vérifiée sur le Raspberry Pi 5 avec :

```bash
superia security sandbox-check
superia security sandbox-check --json
```

Le résultat JSON de l'installation Pi est conservé dans :

```text
~/.superia/sandbox-status.json
```

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

Le vrai dossier personnel n'est pas monté. L'agent reçoit :

```text
HOME=/home/superia
XDG_CONFIG_HOME=/home/superia/.config
XDG_CACHE_HOME=/home/superia/.cache
XDG_DATA_HOME=/home/superia/.local/share
```

Ce HOME est supprimé à la fin du run.

### Mode plan ou review

Le dépôt ou worktree est monté en lecture seule.

Une sortie individuelle peut être montée en écriture. Codex utilise cette exception uniquement pour son fichier `CODEX_LAST_MESSAGE.md`.

### Mode build

Le worktree de la mission est monté en lecture-écriture. Le dépôt principal reste hors du périmètre d'écriture de la mission.

### État persistant du fournisseur

Chaque fournisseur obtient un dossier explicite :

```text
~/.superia/providers/codex-cli/
~/.superia/providers/mistral-vibe/
```

Ces dossiers remplacent l'utilisation incontrôlée du vrai HOME pour les sessions et configurations nécessaires.

### Réseau

Codex et Vibe utilisent actuellement le réseau de l'hôte parce qu'ils doivent joindre leurs services officiels.

La politique supporte aussi un réseau isolé avec `--unshare-net`. L'autotest matériel demande cette isolation pour vérifier que le noyau accepte le namespace.

Les futurs agents locaux ou validateurs qui n'ont pas besoin d'Internet devront utiliser le mode réseau isolé par défaut.

## Préflight obligatoire

Avant un run réel Codex ou Vibe :

1. Gitleaks doit réussir ;
2. Bubblewrap doit être disponible sous Linux ;
3. la politique est ajoutée aux métadonnées du run ;
4. le runner exécute le fournisseur à travers Bubblewrap ;
5. la configuration effective est inscrite dans `AGENT_RESULT.json`.

Sans Bubblewrap, l'agent est refusé.

## Dérogation exceptionnelle

```bash
superia agent run codex TASK-0001 \
  --mode plan \
  --allow-without-bwrap
```

Cette dérogation :

- doit être demandée explicitement ;
- produit l'état `waived` ;
- écrit l'événement `sandbox.preflight.waived` ;
- ne supprime ni Gitleaks, ni les worktrees, ni l'approbation humaine.

Elle ne doit pas être utilisée pour considérer un déploiement comme validé.

## Autotest réel

`superia security sandbox-check` vérifie :

- démarrage de Bubblewrap ;
- création des namespaces demandés ;
- HOME jetable ;
- invisibilité d'un fichier extérieur ;
- écriture autorisée dans un workspace `read-write` ;
- écriture autorisée dans un état explicitement monté ;
- refus d'écriture dans un workspace `read-only` ;
- demande d'un namespace réseau isolé.

L'autotest échoue si les espaces de noms utilisateur sont désactivés par le noyau ou par la politique de la distribution.

## Limites connues

- la CI valide la politique avec des mocks, pas une frontière noyau réelle ;
- la compatibilité entre la sandbox externe et la sandbox native de Codex doit être testée sur le Pi ;
- le réseau de Codex/Vibe n'est pas filtré par domaine ;
- le contrôle post-run des chemins modifiés relève de `SIA-204` ;
- Bubblewrap réduit l'exposition mais ne transforme pas un fournisseur distant en service local.

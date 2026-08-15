# Sauvegarde, restauration et drill de reprise

Super IA fournit deux niveaux distincts :

1. une **restauration vérifiée vers un nouveau répertoire** ;
2. un **drill hors ligne** qui crée une sauvegarde, restaure une copie isolée et compare les données durables.

Aucune commande ne remplace automatiquement le `SUPERIA_HOME` actif.

## Créer et vérifier une sauvegarde

```bash
superia backup create
superia backup list
superia backup verify "$SUPERIA_HOME/backups/backup-YYYYMMDDHHMMSS"
```

Le manifeste autorise uniquement :

```text
control.sqlite
events.jsonl
emergency-stop.json
notifications-config.json
notifications-state.json
provider-benchmarks.json
```

`control.sqlite` et `events.jsonl` sont obligatoires. Les autres fichiers sont ajoutés lorsqu’ils existent dans le plan de contrôle.

## Restaurer vers une copie

```bash
superia backup restore \
  "$SUPERIA_HOME/backups/backup-YYYYMMDDHHMMSS" \
  --target "$HOME/superia-restored-check"
```

La cible doit être absente. Super IA refuse d’écraser un dossier existant.

Avant le renommage final, la restauration :

- valide la structure du manifeste ;
- refuse les chemins, noms et doublons non autorisés ;
- vérifie tailles et SHA-256 ;
- copie les fichiers en mode binaire ;
- exécute `PRAGMA integrity_check` sur SQLite ;
- parse chaque ligne du journal JSONL ;
- restaure safety et notifications lorsqu’ils existent ;
- restaure le registre de benchmarks en `0600` lorsqu’il existe ;
- revalide strictement le schéma du registre de benchmarks ;
- refuse toute la cible si ce registre est invalide, même avec un hash cohérent ;
- écrit `restore-receipt.json` en `0600` ;
- renomme atomiquement le dossier temporaire vers la cible.

En cas d’échec, le dossier temporaire est supprimé et la cible finale n’est pas créée.

## Inspecter la copie restaurée

```bash
SUPERIA_HOME="$HOME/superia-restored-check" superia control status --json
SUPERIA_HOME="$HOME/superia-restored-check" superia project list --json
SUPERIA_HOME="$HOME/superia-restored-check" superia run list --json
SUPERIA_HOME="$HOME/superia-restored-check" superia safety status --json
SUPERIA_HOME="$HOME/superia-restored-check" superia notify status --json
SUPERIA_HOME="$HOME/superia-restored-check" superia benchmark summary --json
```

Ne pas démarrer le daemon de production avec ce répertoire de test.

## Drill automatique hors ligne

```bash
superia backup drill
```

Le drill :

1. crée une nouvelle sauvegarde cohérente ;
2. restaure une copie dans le dossier de cette sauvegarde ;
3. compare projets, missions, runs, événements, lignes JSONL et nombre de benchmarks ;
4. écrit `DRILL.json` en `0600` ;
5. supprime la copie restaurée.

Pour conserver la copie :

```bash
superia backup drill --keep
```

Le rapport indique alors son emplacement exact.

## Ce que le drill prouve

- le manifeste et ses empreintes sont cohérents ;
- la base restaurée est lisible et intègre ;
- le journal restauré est syntaxiquement valide ;
- le registre de benchmarks restauré est lisible lorsqu’il existe ;
- les principaux compteurs durables sont identiques ;
- la restauration ne modifie pas le contrôle actif.

## Ce que le drill ne prouve pas

- la résistance à une panne électrique réelle ;
- la restauration depuis un dépôt Restic hors machine ;
- le démarrage du service systemd depuis la copie ;
- le comportement du stockage HDD/SSD ou NVMe du Raspberry Pi ;
- la qualité réelle des fournisseurs mesurés ;
- l’intégrité d’artefacts externes non inclus dans la sauvegarde locale.

Ces preuves restent à produire sur le Pi 5 cible.

## Passage en production après sinistre

La bascule vers une restauration doit rester manuelle :

1. arrêter le service utilisateur ;
2. conserver le répertoire actif sous un autre nom ;
3. restaurer vers une nouvelle cible ;
4. inspecter la copie avec les commandes ci-dessus ;
5. mettre à jour `SUPERIA_HOME` dans le wrapper et le service si nécessaire ;
6. redémarrer le service ;
7. lancer `superia readiness`, `superia backup drill` et consulter les journaux.

Super IA ne réalise pas cette permutation automatiquement afin d’éviter de détruire la dernière copie exploitable.

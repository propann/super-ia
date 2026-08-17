# Mise en route du Raspberry Pi : SD → HDD/SSD → SSH

Cette procédure prépare le matériel avant l’installation de Super IA.

## Ordre retenu

```text
1. démarrer sur la carte SD
2. mettre le système à jour
3. identifier précisément le HDD/SSD
4. migrer ou réinstaller le système sur le HDD/SSD
5. vérifier que la racine boote réellement sur le HDD/SSD
6. activer et sécuriser SSH
7. cloner Super IA
8. lancer le préflight en lecture seule
9. installer le profil Standard et Super IA
```

Super IA ne partitionne, ne formate et ne clone aucun disque automatiquement. Une erreur de nom de périphérique peut détruire les données ; la migration doit donc être décidée après inspection du Pi réel.

## 1. Premier démarrage sur SD

Après le démarrage, relever l’état sans modifier les disques :

```bash
uname -a
cat /etc/os-release
lsblk -o NAME,MODEL,SIZE,TYPE,FSTYPE,MOUNTPOINTS,UUID
findmnt /
df -h /
ip -br address
```

Conserver la sortie. Elle permettra de distinguer la carte SD du HDD/SSD.

## 2. Mise à jour minimale

Sur Raspberry Pi OS ou Debian :

```bash
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

Après redémarrage, refaire `lsblk` et `findmnt /`.

## 3. Migration vers HDD/SSD

Deux méthodes sont acceptables :

### Méthode recommandée — installation propre

Écrire une image 64 bits directement sur le HDD/SSD depuis une autre machine, puis démarrer le Pi dessus. Cette méthode évite de recopier les erreurs ou fichiers temporaires de la SD.

### Méthode alternative — clonage contrôlé

Utiliser un outil reconnu de la distribution ou une copie bloc/fichiers uniquement après avoir identifié sans ambiguïté source et destination. Ne jamais recopier une commande avec `/dev/sdX`, `/dev/mmcblkX` ou `/dev/nvmeX` sans la remplacer après vérification réelle.

Le dépôt ne fournit volontairement pas de script de clonage automatique.

## 4. Vérifier le démarrage sur HDD/SSD

Une fois le Pi redémarré sans dépendre de la SD :

```bash
findmnt -n -o SOURCE,FSTYPE /
lsblk -o NAME,MODEL,SIZE,TYPE,FSTYPE,MOUNTPOINTS,UUID
df -h /
```

Résultat attendu : la source de `/` doit être le HDD/SSD ou NVMe, pas `mmcblk`.

Le préflight Super IA affichera :

```text
PASS  Support de démarrage  usb-hdd-ssd
```

ou :

```text
PASS  Support de démarrage  nvme
```

## 5. Activer SSH

Installer et activer le serveur lorsque nécessaire :

```bash
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
sudo systemctl status ssh --no-pager
```

Afficher l’adresse :

```bash
hostname -I
ip -br address
```

Depuis le PC :

```bash
ssh UTILISATEUR@ADRESSE_IP
```

## 6. Ajouter une clé SSH

Sur le PC, créer une clé uniquement s’il n’en existe pas déjà une adaptée :

```bash
ssh-keygen -t ed25519 -a 64
ssh-copy-id UTILISATEUR@ADRESSE_IP
```

Tester une nouvelle connexion avant toute modification de la configuration SSH.

Après validation de la clé, la désactivation du mot de passe pourra être faite manuellement selon la politique choisie. Ne pas couper l’authentification par mot de passe avant d’avoir confirmé la connexion par clé dans un second terminal.

## 7. Cloner le dépôt

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
```

## 8. Préflight en lecture seule

```bash
sh install/pi/preflight.sh
```

Mode bloquant pour les exigences minimales :

```bash
sh install/pi/preflight.sh --strict
```

Le préflight vérifie notamment :

- Linux et architecture ;
- distribution ;
- source et type de la racine ;
- SD, USB/HDD/SSD ou NVMe ;
- espace libre ;
- Git, npm et Node >= 22.5 ;
- SQLite, jq, ripgrep, Bubblewrap, Gitleaks et Restic ;
- client et serveur SSH ;
- systemd utilisateur ;
- linger.

Il ne contacte aucun serveur, ne demande pas `sudo` et ne modifie aucun fichier.

## 9. Préparer puis installer Super IA

```bash
bash install/tools/prepare-machine.sh --phase plan --profile standard
sudo bash install/tools/prepare-machine.sh --phase system --profile standard
bash install/tools/prepare-machine.sh --phase user --profile standard
bash install/tools/prepare-machine.sh --phase superia
bash install/tools/prepare-machine.sh --phase verify --profile standard
```

## Informations à conserver après SSH

Avant le travail à distance, enregistrer :

```bash
hostname
hostname -I
whoami
findmnt /
lsblk -o NAME,MODEL,SIZE,FSTYPE,MOUNTPOINTS
systemctl --user status superia.service --no-pager
```

Ces sorties permettront de confirmer le bon disque, le compte utilisateur, l’adresse SSH et le service sans supposition.

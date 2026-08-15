# Journal de travail IA

## 14 août 2026 — fondation

- branche `agent/bootstrap-universal-cli` ;
- CLI TypeScript ;
- catalogue multi-fournisseurs ;
- scanner Git, missions et worktrees ;
- APIs désactivées par défaut ;
- aucune fusion automatique ;
- Pi 5 choisi comme plan de contrôle, sans modèle local obligatoire.

## V0.4 à v0.14 — plan de contrôle et pipeline

- SQLite WAL, projets, missions, runs, événements et reprise ;
- contexte Git ciblé et manifestes SHA-256 ;
- runner avec logs, timeout et groupes de processus ;
- Codex et Mistral Vibe ;
- sauvegardes, daemon et service Pi ;
- receipts et détection de falsification ;
- priorités, blocages, dépendances et critères d’acceptation ;
- Gitleaks obligatoire ;
- Bubblewrap et HOME jetable ;
- garde Git et chemins autorisés ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- checkpoints, reprise, budgets immuables et retry explicite ;
- patch identique détecté comme boucle ;
- limites de 50 fichiers et 1 Mo.

## V0.15 à v0.17 — réseau, web et notifications

- DAG avec cycles refusés ;
- readiness hors ligne ;
- politique HTTPS/public et anti-SSRF ;
- sondes opt-in sans authentification ni redirection ;
- preuve Bubblewrap en `0600` ;
- masquage des fichiers privés suivis, non suivis et ignorés ;
- `SUPERIA_HOME` propagé à systemd ;
- plans Restic non destructifs ;
- serveur web Node natif, loopback, token `0600`, session HttpOnly et aucune CORS ;
- notifications locales expurgées et dédupliquées ;
- aucun canal réseau par défaut.

## V0.18 — arrêt d’urgence global

- `superia safety status|engage|release` ;
- état atomique `0600` ;
- fichier invalide conservé et fail-closed ;
- blocage de Codex, Vibe, pipeline et run manuel réels ;
- diagnostics, sauvegardes et dry-runs disponibles ;
- sélection des groupes par PID sûr et heartbeat récent ;
- `SIGTERM`, délai d’une seconde, puis `SIGKILL` ;
- audit sans prompt, payload ou secret ;
- état visible dans readiness et le web ;
- état inclus dans les sauvegardes.

## V0.19 — restauration, préflight Pi et routeur statique

### Restauration atomique

- cible existante refusée ;
- manifeste et liste fermée de fichiers ;
- tailles et SHA-256 ;
- copie binaire ;
- `PRAGMA integrity_check` ;
- parsing de chaque ligne JSONL ;
- restauration safety et notifications ;
- staging frère et renommage atomique ;
- reçu privé ;
- drill comparant projets, missions, runs, événements et journal.

### Préflight SD/HDD/SSD/SSH

- script sans modification, réseau ni privilège ;
- architecture, distribution, source de `/` et type de stockage ;
- espace libre, Node, outils, SSH, systemd utilisateur et linger ;
- mode strict exécuté par la CI ;
- aucun partitionnement, formatage ou clonage automatique.

### Routeur statique

- modes plan, build et review ;
- budgets zero, low et any ;
- commandes présentes, capacités, automatisation et politique API ;
- préférences du projet ;
- recommandation séparée de l’autorisation readiness ;
- aucun réseau, lancement ou coût.

## V0.20 — mémoire de benchmarks et routeur mesuré

### Registre privé

- fichier `SUPERIA_HOME/providers/benchmarks.json` ;
- permissions `0600` ;
- écriture temporaire puis renommage atomique ;
- maximum 10 000 mesures ;
- fournisseurs connus uniquement ;
- durée, coût et qualité bornés ;
- identifiants uniques ;
- fichier invalide conservé ;
- nouvelles écritures refusées si le registre est corrompu.

Une mesure contient uniquement :

- fournisseur ;
- mode ;
- réussite ;
- durée ;
- coût ;
- qualité optionnelle ;
- date ;
- source `manual` ou `receipt`.

Aucun champ libre ne permet de stocker prompt, code, réponse, fichier, diagnostic ou secret.

### Commandes

- `superia benchmark record` ;
- `superia benchmark list` ;
- `superia benchmark summary` ;
- alias `bench`.

### Résumés

- nombre d’échantillons ;
- nombre et taux de succès ;
- durée médiane ;
- coût moyen ;
- nombre et moyenne des notes de qualité.

Trois mesures comparables sont nécessaires avant influence sur le routeur.

### Influence bornée

- signal secondaire compris entre -40 et +45 ;
- taux de succès, qualité optionnelle, durée médiane et coût moyen ;
- mesures insuffisantes visibles mais ignorées ;
- adaptateur interdit jamais rendu éligible ;
- budget, capacités, API, readiness et safety restent prioritaires ;
- registre corrompu signalé et ignoré par le routeur sans être écrasé.

### Sauvegarde et reprise

- `provider-benchmarks.json` ajouté au manifeste lorsque présent ;
- taille et SHA-256 vérifiés ;
- schéma revalidé après restauration ;
- cible entière refusée si le registre restauré est invalide ;
- nombre de mesures comparé par le drill.

### Fiabilité CI

Le test historique de descendant a été rendu déterministe : il attend maintenant jusqu’à deux secondes la disparition ou l’état zombie après `SIGKILL`, au lieu d’effectuer une seule lecture immédiate de `/proc`.

## Corrections de revue intégrées

1. budget Vibe implicite supprimé ;
2. fichiers privés masqués dans le worktree ;
3. descendants arrêtés après timeout ;
4. `SUPERIA_HOME` transmis au service Pi ;
5. registres invalides conservés ;
6. restauration interdite par-dessus une cible existante ;
7. routeur séparé du lancement réel ;
8. signal mesuré incapable de contourner les exclusions ;
9. benchmarks inclus dans sauvegarde et restauration.

## Validation GitHub v0.20

- Ubuntu 24.04.4 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- **103 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- restauration, drill et benchmarks validés ;
- routeur statique et mesuré validé ;
- préflight strict exécuté ;
- scripts Bash valides ;
- dry-run complet des profils ;
- aucune commande `sudo` cachée dans `install/pi` ;
- aucun téléchargement distant pipé vers un shell.

## État honnête

Validé en CI Linux :

- état durable, pipeline et sécurité ;
- web, notifications et arrêt d’urgence ;
- restauration atomique et drill ;
- préflight matériel non destructif ;
- registre privé de mesures ;
- seuil de confiance et influence bornée ;
- sauvegarde et restauration des benchmarks.

Non encore prouvé :

- démarrage du Pi sur HDD/SSD ou NVMe ;
- installation ARM64 ;
- Bubblewrap sur son noyau ;
- service et arrêt d’urgence sous systemd ;
- web/mobile après déconnexion ;
- restauration v0.20 sur stockage réel et depuis Restic ;
- comptes et coûts réels ;
- pipeline réel avec deux fournisseurs ;
- MCP, ACP, A2A et worker SSH ;
- coupure matérielle ;
- corpus commun et grille de qualité ;
- trois mesures réelles par fournisseur/mode ;
- import automatique depuis les receipts ;
- fallback réel contrôlé.

## Prochaine phase

1. terminer la SD puis installer ou migrer vers HDD/SSD ;
2. confirmer le support racine ;
3. activer SSH ;
4. exécuter le préflight strict ;
5. installer la v0.20 et le profil Standard ;
6. valider Bubblewrap et systemd ;
7. exécuter le drill et une restauration de copie ;
8. tester safety, web et notifications ;
9. choisir le coffre de secrets ;
10. authentifier Codex et Vibe ;
11. exécuter un pipeline réel borné ;
12. définir un corpus et une grille de qualité ;
13. enregistrer au moins trois mesures comparables ;
14. tester le fallback du routeur ;
15. tester Restic et les protocoles.

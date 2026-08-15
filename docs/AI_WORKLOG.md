# Journal de travail IA

## 14 août 2026 — fondation

- branche `agent/bootstrap-universal-cli` ;
- CLI TypeScript ;
- catalogue multi-fournisseurs ;
- scanner Git, missions et worktrees ;
- APIs désactivées par défaut ;
- aucune fusion automatique ;
- Pi 5 choisi comme plan de contrôle, sans modèle local obligatoire.

## V0.4 à v0.9 — plan de contrôle et preuves

- SQLite WAL, projets, tâches, runs, événements et reprise ;
- contexte Git ciblé et manifestes SHA-256 ;
- runner avec logs, timeout et groupes de processus ;
- Codex et Mistral Vibe ;
- sauvegardes, daemon et service Pi ;
- receipts et détection de falsification.

## V0.10 à v0.14 — suivi et pipeline

- priorités, blocages, dépendances et critères d’acceptation ;
- roadmap JSON contrôlée par la CI ;
- Gitleaks obligatoire ;
- Bubblewrap et HOME jetable ;
- garde Git et chemins autorisés ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- checkpoints, reprise et retry explicite ;
- budgets immuables ;
- patch identique détecté comme boucle ;
- limites de 50 fichiers et 1 Mo.

## V0.15 — readiness, réseau et durcissement

- DAG avec cycles refusés ;
- readiness hors ligne ;
- politique HTTPS/public ;
- blocage loopback, LAN, link-local et métadonnées cloud ;
- validation DNS ;
- sondes opt-in sans authentification ni redirection ;
- preuve Bubblewrap en `0600` ;
- masquage des fichiers privés suivis, non suivis et ignorés ;
- budget Vibe obligatoire ;
- `SIGTERM` puis `SIGKILL` après timeout ;
- `SUPERIA_HOME` propagé à systemd ;
- plans Restic non destructifs.

## V0.16 — interface web locale

- serveur HTTP Node natif ;
- design Matrix responsive ;
- projets, missions, runs, événements et readiness ;
- écoute uniquement sur loopback ;
- token `0600` ;
- comparaison en temps constant ;
- session mémoire et cookie HttpOnly ;
- aucune CORS ;
- CSP, no-store, anti-frame et no-referrer ;
- aucune action destructive.

## V0.17 — notifications locales

- runs terminés, échoués, annulés et interrompus ;
- missions bloquées ;
- traitement dans le daemon ;
- configuration, curseur et reçus en `0600` ;
- déduplication SHA-256 ;
- aucun prompt, note, payload, métadonnée ou diagnostic dans les messages ;
- affichage web en lecture seule ;
- aucun canal réseau.

## V0.18 — arrêt d’urgence global

### État et commandes

- `superia safety status` ;
- `superia safety engage --category ...` ;
- `superia safety release` ;
- alias `superia stop` ;
- état atomique dans `SUPERIA_HOME/safety/emergency-stop.json` ;
- permissions `0600` ;
- état invalide conservé et fail-closed ;
- engagement/libération idempotents.

### Barrière d’exécution

Sous arrêt, sont refusés :

- Codex réel ;
- Vibe réel ;
- pipeline réel ;
- run manuel.

Restent accessibles :

- diagnostics ;
- readiness ;
- sauvegardes ;
- consultation ;
- dry-runs.

### Processus actifs

À l’engagement :

- sélection uniquement des runs `queued`/`running` ;
- PID supérieur à 1 et différent de Super IA ;
- heartbeat inférieur à 60 secondes ;
- probe du groupe ;
- `SIGTERM` ;
- délai d’une seconde ;
- `SIGKILL` si le groupe résiste ;
- skips et échecs audités uniquement avec des identifiants internes.

Un test CI lance un vrai processus détaché qui ignore `SIGTERM`, attend sa confirmation de disponibilité, puis vérifie l’escalade et la disparition du groupe.

## V0.19 — restauration, préflight Pi et routeur

### Restauration atomique

- commande `superia backup restore <backup> --target <nouveau-home>` ;
- cible existante refusée ;
- manifeste validé avant copie ;
- liste fermée des fichiers restaurables ;
- `control.sqlite` et `events.jsonl` obligatoires ;
- vérification tailles et SHA-256 ;
- copie binaire ;
- contrôle `PRAGMA integrity_check` ;
- parsing de chaque ligne JSONL ;
- restauration de safety et notifications ;
- staging dans un dossier frère ;
- renommage atomique ;
- suppression du staging en cas d’échec ;
- reçu privé `restore-receipt.json`.

### Drill de reprise

- commande `superia backup drill` ;
- option `--keep` pour conserver la copie ;
- création d’une sauvegarde réelle ;
- restauration dans une copie isolée ;
- comparaison projets, missions, runs, événements et lignes JSONL ;
- rapport `DRILL.json` en `0600` ;
- nettoyage automatique de la copie par défaut.

### Préflight SD/HDD/SSD/SSH

- script `install/pi/preflight.sh` ;
- aucune modification, aucun réseau et aucun privilège ;
- détection Linux et architecture ;
- distribution, source de `/`, type de système de fichiers ;
- classification SD, USB/HDD/SSD, NVMe ou environnement virtuel ;
- espace libre ;
- Git, npm et Node >= 22.5 ;
- outils locaux ;
- client et serveur SSH ;
- systemd utilisateur et linger ;
- mode `--strict` exécuté par la CI.

Le dépôt ne partitionne, ne formate et ne clone volontairement aucun disque.

### Routeur hors ligne

- commande `superia route` ;
- modes `plan`, `build` et `review` ;
- budgets `zero`, `low` et `any` ;
- vérification de la commande installée ;
- exclusion des adaptateurs non prêts ;
- contrôle des capacités et de l’automatisation ;
- respect de la politique API ;
- utilisation des préférences du projet ;
- classement déterministe ;
- explication de chaque sélection ou exclusion ;
- recommandation séparée de l’autorisation `readiness` ;
- aucun appel réseau et aucun lancement.

Aucun score de qualité n’est inventé. Le routeur mesuré reste en cours jusqu’aux benchmarks réels.

## Corrections de revue déjà intégrées

1. budget Vibe implicite supprimé ;
2. fichiers privés masqués dans le worktree ;
3. descendants arrêtés après timeout ;
4. `SUPERIA_HOME` transmis au service Pi ;
5. registre de connexions invalide préservé ;
6. restauration interdite par-dessus une cible existante ;
7. routeur séparé du lancement réel.

## Préparation machine

Profil Standard : Codex, Vibe, Gemini, Qwen, OpenCode, Aider, mini-SWE-agent, Repomix, Gitleaks, Bubblewrap, Restic, GitHub CLI, tmux et ShellCheck.

Garanties :

- installation utilisateur dans `~/.local` ;
- dépendances système explicites ;
- Node et Gitleaks vérifiés par SHA-256 ;
- aucun modèle local ;
- aucune clé configurée ;
- aucun téléchargement pipé vers un shell ;
- dry-runs contrôlés par la CI ;
- préflight matériel en lecture seule.

## Validation GitHub v0.19

- Ubuntu 24.04.4 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- **95 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- restauration et drill validés ;
- routeur déterministe validé ;
- préflight exécuté en mode strict ;
- scripts Bash valides ;
- dry-run complet des profils ;
- aucune commande `sudo` cachée dans `install/pi` ;
- aucun téléchargement distant pipé vers un shell.

## État honnête

Validé en CI Linux :

- plomberie et état durable ;
- pipeline, politiques et sécurité ;
- interface web ;
- notifications ;
- arrêt d’urgence et escalade réelle sur groupe de processus ;
- restauration atomique et drill isolé ;
- routeur hors ligne explicable ;
- préflight matériel non destructif.

Non encore prouvé :

- démarrage du Pi sur son HDD/SSD ou NVMe ;
- installation ARM64 ;
- Bubblewrap sur son noyau ;
- service et arrêt d’urgence sous systemd ;
- web/mobile après déconnexion ;
- restauration v0.19 sur stockage réel et depuis Restic ;
- comptes et coûts réels ;
- pipeline réel avec deux fournisseurs ;
- MCP, ACP, A2A et worker SSH ;
- coupure matérielle ;
- benchmarks coût, qualité et latence.

## Prochaine phase

1. terminer la SD puis installer ou migrer vers HDD/SSD ;
2. confirmer le support racine ;
3. activer SSH ;
4. exécuter le préflight strict ;
5. installer la v0.19 et le profil Standard ;
6. valider Bubblewrap et systemd ;
7. exécuter le drill et une restauration de copie ;
8. tester safety, web et notifications ;
9. choisir le coffre de secrets ;
10. authentifier Codex et Vibe ;
11. exécuter un pipeline réel borné ;
12. tester les protocoles ;
13. mesurer coût, qualité et latence ;
14. enrichir le routeur avec les mesures.

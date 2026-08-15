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

### Intégrations

- readiness refuse les agents réels mais garde le contrôle local ;
- web affiche un bandeau sans route de commande ;
- événements safety expurgés ;
- sauvegarde locale inclut l’état safety et les réglages/cursor de notifications ;
- tous les fichiers de sauvegarde sont en `0600` et couverts par SHA-256.

## Corrections de revue déjà intégrées

1. budget Vibe implicite supprimé ;
2. fichiers privés masqués dans le worktree ;
3. descendants arrêtés après timeout ;
4. `SUPERIA_HOME` transmis au service Pi ;
5. registre de connexions invalide préservé.

## Préparation machine

Profil Standard : Codex, Vibe, Gemini, Qwen, OpenCode, Aider, mini-SWE-agent, Repomix, Gitleaks, Bubblewrap, Restic, GitHub CLI, tmux et ShellCheck.

Garanties :

- installation utilisateur dans `~/.local` ;
- dépendances système explicites ;
- Node et Gitleaks vérifiés par SHA-256 ;
- aucun modèle local ;
- aucune clé configurée ;
- aucun téléchargement pipé vers un shell ;
- dry-runs contrôlés par la CI.

## Validation GitHub

- Ubuntu 24.04.4 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- **89 tests réussis, 0 échec** sur le lot fonctionnel v0.18 ;
- 0 vulnérabilité npm signalée ;
- scripts Bash valides ;
- dry-run complet des profils ;
- aucune commande `sudo` cachée dans `install/pi`.

## État honnête

Validé en CI Linux :

- plomberie et état durable ;
- pipeline, politiques et sécurité ;
- interface web ;
- notifications ;
- arrêt d’urgence et escalade réelle sur groupe de processus ;
- sauvegarde de l’état safety.

Non encore prouvé :

- installation ARM64 sur le Pi ;
- Bubblewrap sur son noyau ;
- service et arrêt d’urgence sous systemd ;
- web/mobile après déconnexion ;
- comptes et coûts réels ;
- pipeline réel avec deux fournisseurs ;
- MCP, ACP, A2A et SSH ;
- coupure matérielle ;
- restauration Restic sur copie.

## Prochaine phase

1. installer la v0.18 sur le Pi ;
2. valider Bubblewrap ;
3. tester safety sous systemd ;
4. vérifier web et notifications après déconnexion ;
5. choisir le coffre de secrets ;
6. restaurer une sauvegarde ;
7. authentifier Codex et Vibe ;
8. exécuter un pipeline réel borné ;
9. tester les protocoles ;
10. mesurer coût, qualité et latence ;
11. construire le routeur mesuré.

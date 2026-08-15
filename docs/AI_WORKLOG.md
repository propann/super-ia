# Journal de travail IA

## 14 août 2026 — fondation

- Branche : `agent/bootstrap-universal-cli`.
- Socle : CLI TypeScript, catalogue multi-fournisseurs, politiques de coût, scanner Git, missions et worktrees.
- Règles : API désactivées par défaut, aucun contournement de quota, aucune fusion automatique.

## Console Matrix et recherche

- Console terminal Matrix reliée aux données réelles.
- Étude des concurrents, agents ouverts, protocoles ACP/MCP/A2A, mémoire, contexte et architecture Pi.
- Décision : Pi 5 comme plan de contrôle uniquement ; aucun modèle local obligatoire.
- Catalogue de recherche machine-lisible et protocole de benchmark.

## V0.4 à v0.9 — plan de contrôle, agents et preuves

- SQLite WAL, projets, tâches, runs, événements et reprise ;
- contexte Git ciblé et manifestes SHA-256 ;
- runner avec logs, timeout et arrêt des descendants ;
- Codex et Mistral Vibe ;
- sauvegardes, daemon et service Pi ;
- receipts et détection de falsification.

## V0.10 à v0.12 — suivi et sécurité d’exécution

- priorités, blocages, dépendances et critères d’acceptation ;
- roadmap JSON contrôlée par la CI ;
- Gitleaks obligatoire ;
- Bubblewrap, HOME jetable et worktree limité ;
- dérogations explicites et journalisées.

## V0.13 — contrôle et pipeline

- chemins autorisés par mission ;
- snapshot Git avant/après ;
- patch et rapport archivés ;
- fichiers hors périmètre bloquants ;
- reviewer indépendant et structuré ;
- pipeline builder → validation → review → receipt ;
- checkpoints atomiques et reprise contrôlée.

## V0.14 — corrections bornées et garde renforcé

- retry uniquement après `changes-requested` ;
- feedback de review injecté au builder par fichier ;
- plafonds de tentatives et de prix réservés immuables ;
- empreinte SHA-256 de chaque patch ;
- patch identique détecté comme boucle ;
- chemins critiques toujours interdits ;
- limites de 50 fichiers et 1 000 000 octets effectifs.

## V0.15 — orchestration, readiness et durcissement

### Missions et état global

- DAG de missions ;
- cycles et dépendances inconnues refusés ;
- blocage et déblocage automatiques ;
- ordre topologique visible ;
- rapport `superia readiness` hors ligne ;
- distinction entre contrôle local prêt et agents réels prêts.

### Connexions et réseau

- politique HTTPS/public pour les endpoints distants ;
- loopback, LAN, link-local, CGNAT, multicast et métadonnées cloud refusés ;
- validation DNS avant sonde ;
- query string, fragment et identifiants intégrés interdits ;
- sonde explicite `--network`, sans authentification ni redirection ;
- registre invalide conservé au lieu d’être écrasé.

### Sandbox et secrets

- preuve Bubblewrap persistée en `0600` ;
- preuve récente exigée par readiness sous Linux ;
- détection des fichiers privés suivis, non suivis et ignorés ;
- masquage des fichiers par `/dev/null` ;
- masquage des répertoires privés par tmpfs ;
- noms Git conservés au caractère près ;
- masque tracé sans enregistrer les valeurs privées.

### Coût et processus

- run Vibe réel refusé sans `--max-price` ;
- pipeline réel refusé sans plafond par tentative et plafond total ;
- `SIGTERM` puis `SIGKILL` du groupe après timeout ;
- résultat rendu seulement après l’escalade ;
- descendant absent ou non exécutable avant le garde Git.

### Pi et sauvegardes

- `SUPERIA_HOME` personnalisé transmis au wrapper et à systemd ;
- `ReadWritePaths` aligné sur ce même répertoire ;
- sauvegarde locale cohérente ;
- configuration Restic privée ;
- opérations Restic réelles uniquement avec `--execute --network` ;
- rétention limitée à `forget --dry-run` ;
- aucune commande `--prune` automatique.

## V0.16 — interface web locale

### Interface

- serveur HTTP Node natif sans dépendance runtime ;
- design Matrix responsive sans ressource externe ;
- projets, missions, runs, événements et readiness ;
- sélection du projet et actualisation automatique toutes les 30 secondes ;
- aucune action destructive ni lancement d’agent depuis le navigateur.

### Authentification et exposition

- écoute uniquement sur `127.0.0.1` ou `::1` ;
- refus explicite de `0.0.0.0` et des adresses LAN ;
- token aléatoire dans `SUPERIA_HOME/web/access.token` ;
- permissions `0600` ;
- token invalide conservé pour réparation au lieu d’être écrasé ;
- vérification en temps constant ;
- sessions mémoire distinctes du token ;
- cookie HttpOnly et SameSite Strict ;
- bearer accepté seulement lorsqu’il est fourni explicitement.

### Sécurité HTTP

- aucune CORS ;
- CSP locale ;
- cache désactivé ;
- refus d’intégration en iframe ;
- politique no-referrer ;
- limite du corps de connexion ;
- API d’overview en lecture seule ;
- méthodes destructives refusées.

### Validation

- tests HTTP avec de vraies données SQLite ;
- connexion correcte et mauvais token ;
- cookie de session ;
- accès bearer ;
- rendu HTML ;
- données projets, missions, runs et readiness ;
- refus d’écoute distante.

Une course procfs du test de descendant a également été corrigée : `ENOENT` et `ESRCH` signifient tous deux que le processus a déjà disparu.

## Cinq défauts matériels de revue corrigés

1. budget Vibe implicite ;
2. fichiers privés visibles dans le worktree ;
3. descendant survivant après timeout ;
4. `SUPERIA_HOME` personnalisé perdu par systemd ;
5. registre de connexions invalide remplacé par défaut.

Chaque correction possède une preuve automatisée. Les cinq fils de revue GitHub ont reçu une réponse avec la preuve correspondante puis ont été résolus.

## Préparation machine complète

- profils Core, Standard et Full ;
- installateur système Debian/Ubuntu explicite ;
- installation utilisateur dans `~/.local` ;
- Node 22 et Gitleaks vérifiés par SHA-256 ;
- uv et outils Python isolés ;
- aucun modèle local ;
- aucune clé configurée ;
- aucun téléchargement transmis directement à un shell ;
- dry-run non destructif contrôlé par la CI.

Profil Standard retenu pour le Pi :

- Codex ;
- Vibe ;
- Gemini ;
- Qwen ;
- OpenCode ;
- Aider ;
- mini-SWE-agent ;
- Repomix ;
- Gitleaks ;
- Bubblewrap ;
- Restic ;
- GitHub CLI, tmux et ShellCheck.

## Validation GitHub vérifiée

- Ubuntu 24.04.4 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- suite TypeScript et Node entièrement verte sur le lot web avant la passe documentaire ;
- 0 vulnérabilité npm signalée ;
- scripts Bash valides ;
- absence de `curl|sh` ou `wget|sh` ;
- dry-run complet des profils ;
- aucune commande `sudo` cachée dans `install/pi`.

Le nombre exact de tests est publié dans `docs/STATUS.md` et dans la dernière CI afin d’éviter de conserver plusieurs compteurs divergents.

## État honnête

La plomberie, les politiques, les scripts, les diagnostics et l’interface web locale sont validés en CI Linux. Ne sont pas encore prouvés :

- installation ARM64 réelle sur le Pi ;
- affichage réel de l’interface sur le Pi et mobile ;
- authentification des comptes ;
- appels réseau et coûts réels ;
- Bubblewrap sur le noyau du Pi ;
- pipeline réel avec deux fournisseurs ;
- handshakes MCP, ACP, A2A et SSH ;
- coupure brutale et reprise matérielle ;
- restauration Restic sur une copie.

## Prochaine phase

1. produire des notifications locales dédupliquées sans réseau ;
2. installer le profil Standard sur le Pi ;
3. vérifier le service avec le `SUPERIA_HOME` choisi ;
4. valider l’interface web sur écran et mobile ;
5. choisir le coffre de secrets ;
6. valider Bubblewrap et readiness ;
7. configurer Restic et tester une restauration ;
8. authentifier Codex et Vibe ;
9. exécuter un pipeline réel borné ;
10. tester les protocoles et workers ;
11. mesurer coût, qualité et latence ;
12. construire le routeur mesuré.

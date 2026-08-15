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

### Sandbox, coût et Pi

- preuve Bubblewrap persistée en `0600` ;
- preuve récente exigée par readiness ;
- fichiers privés suivis, non suivis et ignorés masqués ;
- noms Git conservés au caractère près ;
- budget Vibe réel explicite ;
- `SIGTERM` puis `SIGKILL` du groupe après timeout ;
- `SUPERIA_HOME` transmis au wrapper et à systemd ;
- sauvegarde locale et plans Restic non destructifs.

## V0.16 — interface web locale

### Interface et sécurité

- serveur HTTP Node natif sans dépendance runtime ;
- design Matrix responsive sans ressource externe ;
- projets, missions, runs, événements et readiness ;
- écoute uniquement sur `127.0.0.1` ou `::1` ;
- refus explicite de `0.0.0.0` ;
- token aléatoire en `0600` ;
- token invalide conservé pour réparation ;
- comparaison en temps constant ;
- session mémoire distincte du token ;
- cookie HttpOnly et SameSite Strict ;
- aucune CORS ;
- CSP locale, cache désactivé et anti-frame ;
- aucune action destructive.

### Validation

- tests HTTP avec de vraies données SQLite ;
- connexion correcte et mauvais token ;
- accès bearer explicite ;
- données réelles du plan de contrôle ;
- refus d’écoute distante.

Une course procfs du test de descendant a également été corrigée : `ENOENT` et `ESRCH` signifient tous deux que le processus a déjà disparu.

## V0.17 — notifications locales

### Moteur

- notifications pour runs terminés, échoués, annulés et interrompus ;
- notification des missions bloquées ;
- traitement manuel et automatique dans le daemon ;
- erreur de notification non bloquante pour la synchronisation et la reprise ;
- retard supérieur à 1000 événements refusé explicitement.

### Déduplication et stockage

- configuration, curseur et reçus dans `SUPERIA_HOME/notifications` ;
- permissions `0600` ;
- écritures atomiques pour configuration et curseur ;
- reçus créés avec écriture exclusive ;
- clé déterministe transformée en nom SHA-256 ;
- second passage sans doublon ;
- première initialisation positionnée sur le dernier événement existant pour éviter une rafale historique.

### Expurgation

Les reçus ne copient jamais :

- prompts ;
- titres ou objectifs libres ;
- notes ;
- payloads d’événements ;
- métadonnées de run ;
- diagnostics ;
- noms de fournisseurs arbitraires ;
- valeurs de secrets.

Ils utilisent uniquement des identifiants internes filtrés, des statuts contrôlés et des dates.

### CLI et interface

- `superia notify status` ;
- `superia notify run` ;
- `superia notify list` ;
- activation, désactivation et configuration des catégories ;
- sortie console désactivée par défaut ;
- affichage des reçus dans l’interface web locale ;
- aucun canal réseau activé.

### Validation

- run échoué ;
- mission bloquée ;
- run interrompu par le daemon ;
- absence de doublon ;
- configuration invalide conservée ;
- fichiers privés ;
- chaînes ressemblant à des secrets absentes ;
- exposition web authentifiée en lecture seule.

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

Profil Standard retenu pour le Pi : Codex, Vibe, Gemini, Qwen, OpenCode, Aider, mini-SWE-agent, Repomix, Gitleaks, Bubblewrap, Restic, GitHub CLI, tmux et ShellCheck.

## Validation GitHub vérifiée

- Ubuntu 24.04.4 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- **83 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- scripts Bash valides ;
- absence de `curl|sh` ou `wget|sh` ;
- dry-run complet des profils ;
- aucune commande `sudo` cachée dans `install/pi`.

## État honnête

La plomberie, les politiques, les scripts, les diagnostics, l’interface web et les notifications locales sont validés en CI Linux. Ne sont pas encore prouvés :

- installation ARM64 réelle sur le Pi ;
- affichage réel de l’interface sur le Pi et mobile ;
- notifications après déconnexion systemd et redémarrage matériel ;
- authentification des comptes ;
- appels réseau et coûts réels ;
- Bubblewrap sur le noyau du Pi ;
- pipeline réel avec deux fournisseurs ;
- handshakes MCP, ACP, A2A et SSH ;
- coupure brutale et reprise matérielle ;
- restauration Restic sur une copie.

## Prochaine phase

1. installer le profil Standard sur le Pi ;
2. vérifier le service avec le `SUPERIA_HOME` choisi ;
3. valider l’interface web et les notifications après déconnexion ;
4. choisir le coffre de secrets ;
5. valider Bubblewrap et readiness ;
6. configurer Restic et tester une restauration ;
7. authentifier Codex et Vibe ;
8. exécuter un pipeline réel borné ;
9. tester les protocoles et workers ;
10. mesurer coût, qualité et latence ;
11. construire le routeur mesuré.

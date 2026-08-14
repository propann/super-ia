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

## V0.10 à v0.12 — suivi et sécurité d'exécution

- priorités, blocages, dépendances et critères d'acceptation ;
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

## Connection Matrix universelle

Transports intégrés au registre :

- sessions CLI ;
- APIs officielles ;
- endpoints compatibles OpenAI ;
- identités cloud Azure, AWS et Google Cloud ;
- GitHub Models, Hugging Face et Together ;
- MCP stdio et HTTP ;
- ACP ;
- A2A ;
- worker SSH ;
- web assisté ;
- endpoints locaux expérimentaux désactivés.

Sécurité :

- toutes les connexions désactivées par défaut ;
- `connections.json` privé en `0600` ;
- noms de variables uniquement, jamais leurs valeurs ;
- diagnostic sans réseau et sans affichage de secret ;
- migration additive du catalogue ;
- coffres détectables : session, libsecret, Age et credentials systemd.

## Validation GitHub actuelle

- Ubuntu 24.04 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- **59 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- tous les scripts Bash valides ;
- absence de `curl|sh` ou `wget|sh` ;
- dry-run complet des profils ;
- aucune commande `sudo` cachée dans `install/pi`.

## État honnête

La plomberie, les politiques, les scripts et les diagnostics sont validés. Ne sont pas encore prouvés :

- installation réelle sur le Pi hors ligne ;
- authentification des comptes ;
- appels réseau et coûts réels ;
- Bubblewrap sur le noyau du Pi ;
- pipeline réel avec deux fournisseurs ;
- handshakes MCP, ACP, A2A et SSH ;
- restauration matérielle.

## Prochaine phase

1. installer le profil Standard sur le Pi ;
2. choisir le coffre de secrets ;
3. valider Bubblewrap ;
4. authentifier les CLI ;
5. exécuter des plans réels bornés ;
6. tester les protocoles et workers ;
7. mesurer coût et qualité ;
8. intégrer Restic hors machine et le DAG de missions.

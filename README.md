# Super IA

**Centre de commandement Git-native, multi-projets et multi-fournisseurs pour piloter des agents de développement avec sécurité, reprise, budgets et preuves.**

Le **Raspberry Pi 5 sert de tour de contrôle permanente**. Il stocke l’état, prépare les contextes, lance ou surveille les agents, vérifie les résultats et sauvegarde les preuves. Les modèles IA restent chez leurs fournisseurs : **aucun modèle local n’est requis sur le Pi**.

## État — v0.18.0

La branche de développement couvre :

- SQLite WAL, migrations, projets, missions, runs, événements et leases ;
- DAG de missions avec cycles refusés et blocages automatiques ;
- branches et worktrees Git ;
- contexte ciblé et manifestes SHA-256 ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- Codex et Mistral Vibe dans un pipeline contrôlé ;
- Gitleaks, Bubblewrap, masquage privé et garde des modifications ;
- reviewer indépendant, retries bornés et détection de boucle ;
- receipts vérifiables ;
- Connection Matrix pour CLI, APIs, cloud, MCP, ACP, A2A, SSH et web assisté ;
- politique anti-SSRF et sondes réseau explicites ;
- rapport global `readiness` hors ligne ;
- interface web locale authentifiée et en lecture seule ;
- notifications locales privées, expurgées et dédupliquées ;
- **arrêt d’urgence global** bloquant les runs réels et arrêtant les groupes gérés récents ;
- sauvegardes locales cohérentes incluant l’état safety et les réglages de notifications ;
- plans Restic non destructifs ;
- daemon et service systemd utilisateur pour le Pi ;
- CI durcie et Dependabot.

Le détail vérifié est dans [docs/STATUS.md](docs/STATUS.md).

## Installation de développement

```bash
git clone https://github.com/propann/super-ia.git
cd super-ia
git switch agent/bootstrap-universal-cli
npm install
npm test
npm link
```

Node.js **22.5 ou supérieur** est requis.

## Préparer le Raspberry Pi 5

```bash
bash install/tools/prepare-machine.sh --phase plan --profile standard
sudo bash install/tools/prepare-machine.sh --phase system --profile standard
bash install/tools/prepare-machine.sh --phase user --profile standard
bash install/tools/prepare-machine.sh --phase superia
bash install/tools/prepare-machine.sh --phase verify --profile standard
```

Profils :

```text
core      Codex, Mistral Vibe, Repomix, Gitleaks, Bubblewrap, Restic et socle
standard  + Gemini, Qwen, OpenCode, Aider, mini-SWE-agent, GitHub CLI, tmux
full      + Claude Code, pre-commit et Ruff
```

Aucun profil n’installe Ollama, llama.cpp, LocalAI ou des poids de modèle.

## Vérifier la machine

```bash
superia doctor
superia security sandbox-check
superia safety status
superia readiness
```

`readiness` distingue :

- **contrôle local prêt** : état, Git, DAG et registre cohérents ;
- **agents réels prêts** : Gitleaks, Bubblewrap récent, agent installé, politiques sûres et arrêt d’urgence libre.

La commande ne contacte aucun serveur et ne lit aucune valeur de secret.

## Arrêt d’urgence

```bash
superia safety status
superia safety engage --category security
superia safety release
```

Quand il est engagé :

- Codex, Vibe, pipelines et runs manuels réels sont refusés ;
- diagnostics, sauvegardes, consultation et dry-runs restent disponibles ;
- les runs gérés avec PID sûr et heartbeat récent reçoivent `SIGTERM`, puis `SIGKILL` après une seconde s’ils résistent ;
- l’action est auditée sans prompt, payload ou secret ;
- le web affiche l’état mais ne peut pas le modifier.

L’état privé se trouve dans `SUPERIA_HOME/safety/emergency-stop.json` en `0600`. Un fichier invalide est conservé et bloque les exécutions réelles.

## Interface web locale

```bash
superia web token
superia web
```

Adresse :

```text
http://127.0.0.1:3210
```

L’interface montre projets, missions, runs, notifications, arrêt d’urgence, événements et readiness. Elle est limitée à la boucle locale, protégée par un token `0600`, utilise une session HttpOnly et ne propose aucune action destructive.

## Notifications locales

```bash
superia notify status
superia notify run
superia notify list --limit 50
```

Le daemon produit des reçus locaux pour les fins et interruptions de runs ainsi que les missions bloquées. Les messages ne reprennent ni prompts, ni notes, ni payloads, ni métadonnées, ni diagnostics. Chaque reçu est dédupliqué par SHA-256 et stocké en `0600`.

Aucun canal réseau n’est activé.

## Missions et pipeline

```bash
superia init
superia task create "Modifier le module d'authentification"
superia task update TASK-0001 \
  --priority high \
  --allow-path "src/auth/**" \
  --allow-path "tests/auth/**" \
  --accept "tests réussis"

superia worktree TASK-0001

superia pipeline run TASK-0001 \
  --builder codex \
  --reviewer vibe \
  --max-attempts 3 \
  --max-price 0.25 \
  --max-total-price 0.75
```

Flux :

```text
builder
  → Gitleaks
  → Bubblewrap
  → contrôle du diff
  → validations locales
  → reviewer différent
  → receipt SHA-256
  → approbation humaine
```

Aucune fusion Git n’est automatique.

## Connexions

```bash
superia connection init
superia connection dashboard
superia connection doctor
superia connection policy
```

Les connexions sont désactivées par défaut. Le registre privé ne contient que les noms des variables attendues.

Une sonde réseau doit être demandée explicitement :

```bash
superia connection probe <ID> --network --timeout-ms 5000
```

Elle utilise `HEAD`, n’envoie aucune authentification et ne suit aucune redirection.

## Sauvegardes

```bash
superia backup create
superia backup list
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS
```

Chaque sauvegarde locale contient :

- copie SQLite cohérente ;
- journal JSONL ;
- état d’arrêt d’urgence lorsqu’il existe ;
- configuration et curseur des notifications lorsqu’ils existent ;
- manifeste tailles + SHA-256.

Les fichiers sont privés en `0600`.

Restic reste opt-in :

```bash
superia restic init
superia restic status
superia restic backup
superia restic backup --execute --network
```

La rétention est seulement prévisualisée avec `forget --dry-run`. Aucun `--prune` automatique n’est généré.

## Contrôle global

```bash
superia control status --json
superia project list
superia task board
superia run list
superia events --limit 100
superia safety status
superia notify list
superia daemon --once
superia matrix
superia web
```

## Ce qui exige encore le Pi ou les comptes

- installation ARM64 réelle du profil Standard ;
- autotest Bubblewrap sur le noyau du Pi ;
- validation du service après déconnexion ;
- test réel de l’arrêt d’urgence sous systemd ;
- validation web/mobile et notifications après redémarrage ;
- choix du coffre de secrets ;
- dépôt Restic et restauration sur copie ;
- authentification interactive des CLI ;
- tests bornés des fournisseurs activés ;
- handshakes MCP, ACP, A2A et SSH ;
- coupure brutale et reprise ;
- pipeline réel Codex/Vibe avec receipts ;
- benchmark coût/qualité avant routage automatique.

## Documentation

- [État vérifié](docs/STATUS.md)
- [Arrêt d’urgence](docs/SAFETY.md)
- [Interface web locale](docs/WEB.md)
- [Notifications locales](docs/NOTIFICATIONS.md)
- [Installation Pi](docs/PI_INSTALL.md)
- [Feuille de route](docs/ROADMAP.md)
- [Suivi des tâches](docs/TASK_TRACKER.md)
- [Registre projet](docs/ROADMAP_TRACKER.json)
- [Connexions](docs/CONNECTIONS.md)
- [Pipeline](docs/PIPELINE.md)
- [Sandbox](docs/SANDBOX.md)
- [Receipts](docs/RECEIPTS.md)
- [Sécurité](docs/SECURITY.md)

## Licence

MIT.

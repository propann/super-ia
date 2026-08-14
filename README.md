# Super IA

**Centre de commandement Git-native, multi-projets et multi-fournisseurs pour piloter des agents de développement avec sécurité, reprise, budgets et preuves.**

Le **Raspberry Pi 5 sert de tour de contrôle permanente**. Il stocke l’état, prépare les contextes, lance ou surveille les agents, vérifie les résultats et sauvegarde les preuves. Les modèles IA restent chez leurs fournisseurs : **aucun modèle local n’est requis sur le Pi**.

## État — v0.15.0

La branche de développement couvre maintenant :

- SQLite WAL, migrations, projets, missions, runs, événements et leases ;
- DAG de missions avec cycles refusés, blocage et déblocage automatiques ;
- branches et worktrees Git ;
- contexte ciblé avec manifestes SHA-256 ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- Codex et Mistral Vibe dans un pipeline contrôlé ;
- Gitleaks, Bubblewrap et garde des modifications ;
- reviewer indépendant, retries bornés et détection de boucle ;
- receipts vérifiables ;
- Connection Matrix pour CLI, APIs, cloud, MCP, ACP, A2A, SSH et web assisté ;
- politique anti-SSRF pour les endpoints ;
- sondes réseau explicites, sans authentification ni redirection ;
- rapport global `readiness` hors ligne ;
- sauvegardes locales cohérentes et plans Restic non destructifs ;
- daemon et service systemd utilisateur pour le Pi ;
- CI durcie et Dependabot.

Le détail vérifié et les blocages réels sont dans [docs/STATUS.md](docs/STATUS.md).

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

Afficher le plan sans modifier la machine :

```bash
bash install/tools/prepare-machine.sh --phase plan --profile standard
```

Installer les paquets système avec une élévation explicite :

```bash
sudo bash install/tools/prepare-machine.sh --phase system --profile standard
```

Installer les outils utilisateur sans root :

```bash
bash install/tools/prepare-machine.sh --phase user --profile standard
bash install/tools/prepare-machine.sh --phase superia
bash install/tools/prepare-machine.sh --phase verify --profile standard
```

Profils disponibles :

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
superia readiness
```

`superia readiness` distingue :

- **contrôle local prêt** : Git, état, DAG et registre cohérents ;
- **agents réels prêts** : Gitleaks, preuve Bubblewrap récente, agent installé et politiques sûres.

La commande ne contacte aucun serveur et ne lit aucune valeur de secret.

## Missions et DAG

```bash
superia init
superia task create "Modifier le module d'authentification"
superia task create "Ajouter les tests"

superia task update TASK-0002 --depends TASK-0001
superia task graph
superia task reconcile
superia task board
```

Une mission ne peut pas passer à `running`, `review` ou `done` tant que ses dépendances ne sont pas terminées. Les cycles et les identifiants inconnus sont refusés.

## Pipeline multi-agent

```bash
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
  --max-total-price 0.75
```

Flux :

```text
builder
  → Gitleaks
  → Bubblewrap
  → contrôle du diff
  → validations locales
  → reviewer différent et lecture seule
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

Les connexions sont désactivées par défaut. `~/.superia/connections.json` est privé en `0600` et ne contient que les **noms** des variables attendues.

Règles réseau :

- HTTPS obligatoire pour les endpoints distants ;
- loopback, LAN, link-local et métadonnées cloud refusés à distance ;
- endpoints locaux limités à la boucle locale ;
- résolution DNS privée bloquante ;
- query string, fragment et identifiants dans l’URL interdits.

Une sonde doit être demandée explicitement :

```bash
superia connection probe <ID> --network --timeout-ms 5000
```

Elle utilise `HEAD`, n’envoie aucune authentification et ne suit aucune redirection.

## Sauvegardes

Sauvegarde locale cohérente de SQLite et du journal :

```bash
superia backup create
superia backup list
superia backup verify ~/.superia/backups/backup-YYYYMMDDHHMMSS
```

Préparer Restic :

```bash
superia restic init
superia restic status
```

Super IA stocke seulement les références `RESTIC_REPOSITORY` et `RESTIC_PASSWORD_FILE`, jamais le mot de passe.

Afficher les plans sans contacter le dépôt :

```bash
superia restic backup
superia restic retention-preview
superia restic check
```

Exécuter volontairement une opération réseau :

```bash
superia restic backup --execute --network
superia restic retention-preview --execute --network
superia restic check --execute --network
```

La rétention fournie est uniquement un `forget --dry-run`. Aucune suppression ou commande `--prune` n’est générée par Super IA.

## Contrôle global

```bash
superia control status --json
superia project add /chemin/du/depot
superia project list
superia run list
superia events --limit 100
superia daemon --once
superia matrix
```

## Ce qui exige encore le Pi ou les comptes

- installation ARM64 réelle du profil Standard ;
- autotest Bubblewrap sur le noyau du Pi ;
- choix du coffre de secrets ;
- configuration d’un dépôt Restic et test de restauration ;
- authentification interactive des CLI ;
- tests bornés des fournisseurs activés ;
- handshakes MCP, ACP, A2A et SSH ;
- test de coupure et reprise ;
- pipeline réel Codex/Vibe avec receipts ;
- benchmark coût/qualité avant routage automatique.

## Documentation

- [État vérifié](docs/STATUS.md)
- [Toolchain](docs/TOOLCHAIN.md)
- [Connexions](docs/CONNECTIONS.md)
- [Feuille de route](docs/ROADMAP.md)
- [Registre projet](docs/ROADMAP_TRACKER.json)
- [Pipeline](docs/PIPELINE.md)
- [Plan de contrôle](docs/CONTROL_PLANE.md)
- [Sandbox](docs/SANDBOX.md)
- [Contrôle des modifications](docs/CHANGE_GUARD.md)
- [Receipts](docs/RECEIPTS.md)
- [Installation Pi](docs/PI_INSTALL.md)
- [Sécurité](docs/SECURITY.md)

## Licence

MIT.

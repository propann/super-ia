# État vérifié du projet

Date du contrôle : **15 août 2026**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat v0.14.0

| Élément | Résultat |
|---|---|
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **59 réussis, 0 échec** |
| Audit npm du job | 0 vulnérabilité signalée |
| Système CI | Ubuntu 24.04 |
| Node / npm | 22.23.2 / 10.9.8 |
| Scripts validés | Pi + 4 scripts toolchain |
| `curl`/`wget` directement pipé vers un shell | interdit par la CI |
| Dry-run Core / Standard / Full | réussi et non destructif |
| Commande `sudo` cachée dans le paquet Pi | aucune |

## Socle livré

- SQLite WAL et registre multi-projets ;
- missions, dépendances, runs, événements, leases et reprise ;
- branches et worktrees Git ;
- contexte ciblé et manifestes SHA-256 ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- Codex et Mistral Vibe contrôlés ;
- Gitleaks et Bubblewrap obligatoires avant les agents réels ;
- garde Git avec chemins critiques interdits et plafonds de diff ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- checkpoints, reprise et retries bornés ;
- détection de patch identique ;
- receipts et sauvegardes vérifiables ;
- daemon, service utilisateur et console Matrix ;
- toolchain Core, Standard et Full ;
- installation Node 22 et Gitleaks vérifiée par SHA-256 ;
- outils npm dans `~/.local` et outils Python isolés par uv ;
- Connection Matrix universelle ;
- registre privé `connections.json` en `0600` ;
- migration additive du catalogue sans écraser les choix ;
- diagnostic hors ligne ne révélant aucune valeur de secret ;
- détection des coffres session, libsecret, Age et systemd credentials.

## Toolchain

```text
Core
├── Codex
├── Mistral Vibe
├── Repomix
├── Gitleaks
├── Bubblewrap
├── Restic
└── socle Git / Node / Python / SQLite / jq / ripgrep

Standard
├── Core
├── Gemini CLI
├── Qwen Code
├── OpenCode
├── Aider
├── mini-SWE-agent
├── GitHub CLI
├── tmux
└── ShellCheck

Full
├── Standard
├── Claude Code
├── pre-commit
└── Ruff
```

Aucun profil n'installe de modèle local.

## Connexions couvertes

- sessions CLI : Codex, Claude, Vibe, Gemini, Qwen, OpenCode, Aider, mini-SWE ;
- APIs : OpenAI, Anthropic, Mistral et Gemini ;
- identités cloud : Azure OpenAI, AWS Bedrock et Google Vertex AI ;
- passerelles : GitHub Models, OpenRouter, DeepSeek, Groq, Hugging Face et Together ;
- endpoint compatible OpenAI personnalisé ;
- MCP stdio et HTTP ;
- ACP stdio ;
- A2A HTTP ;
- worker SSH ;
- web assisté ChatGPT, Claude, Mistral et DeepSeek ;
- endpoints locaux Ollama, LM Studio et LocalAI présents uniquement comme options expérimentales désactivées.

Toutes les connexions sont désactivées par défaut. L'état `ready` signifie que les références nécessaires existent, pas qu'une requête réseau a été facturée ou même envoyée.

## Sécurité des secrets

`connections.json` ne contient que les noms des variables attendues.

Le diagnostic :

- ne contacte aucun endpoint ;
- ne retourne aucune valeur d'environnement ;
- ne lance aucun agent ;
- ne modifie aucune authentification.

Méthodes proposées :

1. variables temporaires de session ;
2. trousseau `libsecret` ;
3. fichier chiffré Age ;
4. credentials systemd.

## Suivi machine

Source : [`MACHINE_TRACKER.json`](MACHINE_TRACKER.json).

| État | Nombre |
|---|---:|
| Terminé | 9 |
| Planifié | 3 |
| Bloqué | 3 |
| Total | 15 |

Les blocages sont réels et externes : Pi hors ligne et authentification interactive des comptes.

## Ce qui attend le Pi ou les comptes

- installer le profil Standard sur le Pi ;
- vérifier Bubblewrap sur son noyau ;
- choisir le coffre de secrets définitif ;
- authentifier les CLI retenues ;
- effectuer des tests de santé bornés des APIs activées ;
- tester MCP, ACP, A2A et le worker SSH ;
- tester coupure, reprise et restauration ;
- produire un pipeline réel avec receipts ;
- mesurer coût et qualité avant d'activer un routeur automatique.

## Limites volontaires

- aucune clé créée automatiquement ;
- aucune connexion activée automatiquement ;
- aucune dépense API sans configuration explicite ;
- aucun modèle local installé ;
- aucun navigateur automatisé ;
- aucune fusion automatique ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22.

## Commandes de préparation

```bash
bash install/tools/prepare-machine.sh --phase plan --profile standard
bash install/tools/prepare-machine.sh --phase user --profile standard
bash install/tools/prepare-machine.sh --phase superia
bash install/tools/prepare-machine.sh --phase verify --profile standard

superia connection init
superia connection dashboard
superia connection doctor
superia connection secret-backends
```

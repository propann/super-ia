# État vérifié du projet

Date du contrôle : **14 août 2026**  
Branche contrôlée : `agent/bootstrap-universal-cli`  
Commit contrôlé : `3c3e19710b73b6743f4368064befbf82f477eada`  
Pull request : `#1` vers `main`

Ce document distingue strictement ce qui est réellement présent dans Git, ce qui a été validé par la CI et ce qui reste seulement conçu dans la documentation.

## Résultat du contrôle

| Élément | Résultat |
|---|---|
| PR ouverte | oui |
| PR en brouillon | oui |
| Fusionnable par GitHub | oui |
| Fichiers modifiés | 41 |
| Commits de la branche | 61 |
| Lignes ajoutées | 6 173 |
| Version du paquet | `0.3.0` |
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | 10 réussis, 0 échec |
| Audit npm du job CI | 0 vulnérabilité signalée |

Environnement de la dernière validation GitHub :

- Ubuntu 24.04 ;
- Node.js 22.23.2 ;
- npm 10.9.8 ;
- TypeScript via `tsc -p tsconfig.json` ;
- commande complète : `npm test`.

## Livré et vérifié

### CLI

Les commandes suivantes existent dans le code publié :

```bash
superia matrix
superia matrix --once
superia doctor
superia doctor --json
superia providers
superia providers --json
superia local
superia local --json
superia scan
superia scan --json
superia init
superia task create "objectif"
superia task list
superia task show TASK-0001
superia worktree TASK-0001
superia worktree TASK-0001 --dry-run
```

### Gestion Git et missions

- détection de la racine Git ;
- lecture de la branche, du remote et de l'état du dépôt ;
- détection des manifests et du gestionnaire de paquets ;
- détection des scripts de validation ;
- création de missions `TASK-XXXX` ;
- stockage atomique des missions en JSON dans `.superia/tasks` ;
- création d'une branche dédiée par mission ;
- création d'un worktree isolé ;
- mode `--dry-run` avant modification de Git.

### Catalogue des IA et outils

- catalogue multi-fournisseurs ;
- détection des exécutables présents dans le `PATH` ;
- séparation entre fournisseurs IA et outils locaux ;
- API payantes désactivées par défaut ;
- budget API par défaut fixé à 0 € ;
- fusion humaine obligatoire dans la configuration par défaut.

### Console Matrix

- état du dépôt ;
- fournisseurs détectés ;
- outils locaux détectés ;
- missions enregistrées ;
- politique de coût et de sécurité ;
- rafraîchissement interactif ;
- rendu statique testable.

### Documentation et recherche

- vision et architecture ;
- sécurité et feuille de route ;
- étude concurrentielle ;
- comparaison des protocoles ACP, MCP et A2A ;
- architecture Raspberry Pi 5 en plan de contrôle uniquement ;
- mémoire Git, contexte et multi-agent ;
- protocole de benchmark ;
- catalogue de recherche JSON validé par test.

## Tests actuellement couverts

1. unicité des identifiants fournisseurs ;
2. API distantes désactivées par défaut ;
3. transport de sécurité déclaré par chaque fournisseur ;
4. flux réel `scan → mission → worktree` ;
5. unicité des identifiants d'outils locaux ;
6. légèreté des outils obligatoires ;
7. commande candidate déclarée par chaque outil ;
8. rendu de la console Matrix avec données réelles ;
9. validité et unicité du catalogue de recherche ;
10. présence d'une surface de décision pour chaque projet étudié.

## Conçu mais pas encore implémenté

Les éléments suivants sont décrits dans l'architecture ou la roadmap, mais **ne sont pas encore présents dans le code publié** :

- base SQLite en mode WAL ;
- migrations de schéma ;
- registre global multi-projets dans `~/.superia` ;
- journal d'événements JSONL append-only ;
- leases, idempotency keys et reprise après coupure ;
- checkpoints de mission ;
- graphe de dépendances entre tâches ;
- constructeur de contexte Git ciblé ;
- support hiérarchique de `AGENTS.md` ;
- scan Gitleaks avant transmission distante ;
- manifestes de contexte avec hashes et raisons ;
- budget de tokens ;
- runner de groupes de processus ;
- arrêt fiable des processus descendants ;
- adaptateur CLI générique ;
- exécution réelle de Codex, Mistral Vibe, Claude Code ou Gemini CLI ;
- routeur coût/capacité/qualité ;
- reviewer indépendant ;
- validations complètes et receipts ;
- sauvegarde Restic automatisée ;
- serveur web local ;
- API locale ;
- service systemd et installateur Raspberry Pi.

Une tentative de construction de ces briques a été évoquée après la v0.3, mais elle n'a pas été rattachée à un commit de la branche. Elle est donc considérée comme **non livrée et non vérifiée**.

## Risques et limites actuels

### Stockage

Les missions sont encore stockées en fichiers JSON par dépôt. Ce système convient au prototype, mais ne garantit pas la coordination multi-processus ou multi-projets.

### Isolation

Le worktree protège l'organisation Git, mais ne constitue pas une sandbox système. Un agent autorisé à exécuter des commandes doit encore être isolé par bubblewrap ou Podman.

### Exécution IA

Le projet détecte les CLI, mais ne lance encore aucun agent. Il n'existe donc pas encore de mesure réelle de coût, de qualité ou de reprise de session.

### Contexte et secrets

Le principe d'expurgation est configuré et documenté, mais le scan Gitleaks et le constructeur de contexte ne sont pas encore codés. Aucun envoi distant automatique ne doit être activé avant cette étape.

### Raspberry Pi

Le dépôt peut être cloné et compilé sur une machine ARM64 disposant de Node 22, mais le paquet d'installation et le service permanent ne sont pas encore validés sur le Pi 5 réel.

## Prochain lot recommandé

Le prochain lot doit rester concentré sur le plan de contrôle, dans cet ordre :

1. stockage global SQLite WAL et migrations ;
2. registre de projets ;
3. journal d'événements et reprise après interruption ;
4. migration des missions JSON existantes ;
5. constructeur de contexte avec manifestes et scan de secrets ;
6. runner de processus générique ;
7. premier adaptateur Codex en mode non interactif sécurisé ;
8. validations et receipt minimal ;
9. paquet d'installation et test sur Raspberry Pi 5.

## Critères avant installation permanente sur le Pi

- toutes les migrations testées ;
- reprise après arrêt brutal testée ;
- secrets jamais présents dans un paquet distant ;
- agents confinés au worktree et à une sandbox ;
- arrêt d'urgence fonctionnel ;
- sauvegarde et restauration testées ;
- service systemd non privilégié ;
- tableau de santé accessible sans exposer les données du projet ;
- au moins un adaptateur IA testé de bout en bout ;
- documentation d'installation reproductible.

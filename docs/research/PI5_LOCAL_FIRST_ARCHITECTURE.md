# Architecture locale sur Raspberry Pi 5

Dernière revue : 14 août 2026.

## Décision figée

Le Raspberry Pi 5 est la **tour de contrôle permanente** de Super IA. Il n'exécute aucun modèle IA dans le MVP.

Les modèles restent accessibles par les CLI officielles et abonnements légitimes : Codex, Claude Code, Mistral Vibe, Gemini CLI, Qwen Code ou autres agents compatibles. Le Pi lance leurs programmes clients, mais l'inférence principale se déroule chez le fournisseur.

Un Pi 4 ou Pi 5 pourra servir plus tard à une expérience séparée de petit modèle local uniquement si un benchmark démontre une utilité réelle. Cette expérimentation ne doit jamais devenir une dépendance du cœur.

---

# 1. Rôle du Pi

- héberger les dépôts Git complets ;
- suivre plusieurs projets ;
- conserver branches, tags et worktrees ;
- stocker missions, tâches, décisions et dépendances ;
- construire et sauvegarder les paquets de contexte ;
- lancer les agents CLI utilisant leurs services distants ;
- exécuter les tests et builds compatibles avec ses ressources ;
- capturer sorties, événements et transcriptions ;
- gérer les checkpoints et reprises ;
- exposer la console Matrix en SSH ;
- fournir plus tard une interface web locale ;
- sauvegarder les états et artefacts ;
- surveiller GitHub, CI et PR lorsque configuré.

Le Pi ne doit pas :

- charger un LLM local en permanence ;
- devenir un serveur GPU improvisé ;
- exécuter de nombreux gros builds simultanément ;
- exposer directement ses services sur Internet ;
- contenir tous les secrets des utilisateurs sans isolation ;
- mélanger état critique, caches et fichiers temporaires.

---

# 2. Architecture cible

```text
ordinateur / téléphone
        │ SSH, TUI ou web local
        ▼
Raspberry Pi 5 + NVMe
├── superia daemon
├── console Matrix
├── SQLite en WAL
├── journal JSONL append-only
├── dépôts Git et miroirs
├── worktrees par mission
├── index du code
├── constructeur de contexte
├── scanner de secrets
├── file de tâches et dépendances
├── gestionnaire de processus
├── adaptateurs agents CLI
├── validation et receipts
└── sauvegardes chiffrées
        │
        ├── Codex CLI → service OpenAI
        ├── Claude Code → service Anthropic
        ├── Mistral Vibe → service Mistral
        ├── Gemini CLI → service Google
        ├── Qwen Code → fournisseur configuré
        ├── Aider/OpenCode → fournisseur configuré
        └── web assisté légitime
```

Plus tard seulement :

```text
Pi 5 control plane
   ├── worker laptop
   ├── worker VPS
   ├── worker machine puissante
   └── Pi 4/5 laboratoire local optionnel
```

---

# 3. Matériel recommandé

## Pi 5 8 Go

Suffisant pour :

- démon Super IA ;
- SQLite ;
- plusieurs dépôts sur NVMe ;
- 2 à 4 agents CLI principalement en attente réseau ;
- indexation raisonnable ;
- tests légers à moyens ;
- console Matrix ;
- sauvegardes ;
- petite interface web locale.

Le nombre d'agents actifs est limité surtout par les processus qu'ils lancent et les builds du projet, pas par l'appel distant au modèle.

## Pi 5 16 Go

Apporte du confort pour :

- gros monorepos ;
- plusieurs worktrees ;
- Docker/Podman ;
- gros builds Node/Rust ;
- caches et index ;
- davantage de sessions simultanées.

Il n'est pas obligatoire pour le MVP.

## Stockage

NVMe fortement recommandé :

- 256 Go minimum pratique ;
- 500 Go confortable ;
- système, dépôts et état séparables par dossiers ;
- contrôle SMART et espace disque ;
- alimentation et refroidissement stables.

Une carte microSD seule n'est pas recommandée pour les écritures SQLite, worktrees et caches continus.

---

# 4. Services minimaux

## Obligatoires

```text
Linux ARM64
Git
Node.js LTS compatible
SQLite
ripgrep
systemd
SSH
NVMe
```

## Recommandés

```text
jq
uv / pipx
Gitleaks
Restic
bubblewrap
GitHub CLI
Tree-sitter ou index symbolique
```

## Optionnels

```text
Podman
Docker
Repomix
Aider
OpenCode
mini-SWE-agent
tmux
```

## Explicitement différés

```text
Ollama
llama.cpp
LocalAI
modèles GGUF
serveur d'embeddings local
base vectorielle obligatoire
```

Ces éléments restent dans la veille technologique, pas dans l'installation par défaut.

---

# 5. Arborescence

```text
/srv/superia/
├── config/
├── repos/
│   ├── mirrors/
│   └── checkouts/
├── worktrees/
├── state/
│   ├── superia.sqlite
│   ├── events/
│   ├── locks/
│   └── runtime/
├── contexts/
├── transcripts/
├── artifacts/
├── caches/
└── backups/
```

Les caches et dépendances ne sont pas des données critiques. Les événements, décisions, receipts, branches non poussées et manifests de contexte le sont.

---

# 6. Processus systemd

## MVP simple

```text
superia.service
superia-backup.timer
superia-health.timer
```

## Évolution

```text
superia-worker@.service
superia-web.service
superia-github.timer
```

Le premier démon peut contenir scheduler et workers. La séparation en services arrive lorsque la reprise ou l'isolation le justifie.

---

# 7. Charge et limites

## Parallélisme initial

```yaml
limits:
  activeAgents: 2
  activeBuilds: 1
  activeIndexers: 1
  maxWorktreesPerProject: 4
  minimumFreeDiskGb: 20
```

Ces valeurs sont prudentes et doivent être mesurées sur la machine réelle.

## Ressources à surveiller

- mémoire disponible ;
- charge CPU ;
- température ;
- I/O NVMe ;
- espace disque ;
- processus enfants ;
- taille des logs ;
- nombre de fichiers ouverts ;
- état SQLite/WAL ;
- connectivité réseau ;
- temps d'exécution des tests.

## Dégradation contrôlée

Si la machine manque de ressources :

1. arrêter les nouveaux lancements ;
2. conserver les runs existants ;
3. suspendre indexation et sauvegardes non urgentes ;
4. empêcher les gros builds parallèles ;
5. alerter dans Matrix ;
6. ne jamais supprimer automatiquement un worktree non archivé.

---

# 8. Dépôts et suivi de projet

Chaque dépôt enregistré possède :

- chemin ;
- remote ;
- branche par défaut ;
- dernier fetch ;
- état de travail ;
- worktrees ;
- instructions `AGENTS.md` ;
- stack et checks ;
- missions ouvertes ;
- branches non poussées ;
- sauvegarde ;
- santé Git.

La console doit fournir une vue globale :

```text
PROJET     BRANCHE      DIRTY   MISSIONS   CI   BACKUP   DERNIER COMMIT
super-ia   main         non     3          OK   OK       il y a 4 min
app-web    feature/x    oui     1          -    OK       il y a 2 h
```

---

# 9. Sauvegarde

## Avant chaque opération risquée

- snapshot SQLite ;
- checkpoint de mission ;
- patch des changements non committés ;
- hash des artefacts ;
- vérification de l'espace disque.

## Sauvegarde régulière

Restic ou équivalent :

- dépôt local/NAS ;
- chiffrement ;
- rétention ;
- vérification périodique ;
- test réel de restauration.

## GitHub n'est pas une sauvegarde complète

GitHub conserve les commits poussés, pas forcément :

- base SQLite ;
- décisions locales ;
- transcriptions ;
- branches non poussées ;
- checkpoints ;
- secrets de configuration ;
- fichiers ignorés nécessaires à la reprise.

---

# 10. Sécurité

## Compte Linux

- utilisateur dédié `superia` ;
- pas de `sudo` ;
- accès limité aux dossiers projets déclarés ;
- permissions `0700` sur état et transcriptions ;
- secrets via fichiers `0600` ou gestionnaire adapté.

## Réseau

- services liés à `127.0.0.1` par défaut ;
- SSH par clés ;
- Tailscale ou VPN préférable à une exposition publique ;
- reverse proxy/TLS seulement après durcissement ;
- firewall ;
- aucun port de debug public.

## Agents

- worktree obligatoire pour écriture ;
- worktree présenté comme isolation Git, pas sandbox ;
- bubblewrap/Podman pour les tâches risquées ;
- réseau désactivé lorsqu'inutile ;
- répertoire HOME temporaire si possible ;
- variables d'environnement allowlistées ;
- aucune clé SSH injectée par défaut ;
- fusion humaine.

---

# 11. Pi 4 comme laboratoire futur

Un Pi 4 peut plus tard tester :

- petit classifieur ;
- embeddings très légers ;
- comparaison de moteurs ARM ;
- worker de recherche ou d'indexation ;
- sandbox secondaire.

Conditions avant activation :

1. cas d'usage précis ;
2. benchmark qualité/temps/énergie ;
3. avantage démontré face à une règle déterministe ;
4. installation indépendante ;
5. aucun impact sur le plan de contrôle ;
6. arrêt possible sans perte de fonction.

Sans ces preuves, aucun modèle n'est installé.

---

# 12. Installation cible du Pi

```text
Debian stable ARM64
SSH sécurisé
NVMe monté sur /srv
Node.js
Git + gh
SQLite
ripgrep + jq
Gitleaks
Restic
bubblewrap
Super IA
agents CLI choisis
```

Pas de Kubernetes, Redis, PostgreSQL, Ollama ou interface desktop dans l'installation minimale.

---

# 13. Critères de réussite

- redémarrage du Pi sans perte d'état ;
- missions interrompues identifiées ;
- récupération du contexte d'une mission ;
- restauration d'une sauvegarde testée ;
- lancement d'un agent CLI dans un worktree ;
- arrêt complet de son groupe de processus ;
- rapport de tests et receipt ;
- utilisation depuis SSH sur téléphone ;
- aucune dépendance à une API d'orchestration ;
- consommation stable sur 24 h.

---

# Conclusion

Le Pi est la mémoire, le chef de gare et le coffre-fort. Les IA sont des travailleurs externes qui viennent exécuter des missions dans des espaces contrôlés. Cette séparation garde Super IA léger, disponible, économique et réparable.

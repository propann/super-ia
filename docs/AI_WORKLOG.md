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

## Audit v0.3

- Vérification stricte de ce qui existait réellement dans Git.
- Résultat de l'époque : 10 tests verts ; stockage JSON par dépôt ; aucun agent lancé.
- Création de `docs/STATUS.md` pour séparer livré, conçu et restant à faire.

## V0.4 — plan de contrôle durable

- `SUPERIA_HOME` global ;
- SQLite WAL et migration initiale ;
- projets, missions synchronisées, runs, heartbeats et événements ;
- miroir JSONL append-only ;
- récupération des runs abandonnés ;
- commandes `control`, `project`, `run`, `events` et `recover`.

Validation : 12 tests réussis.

## V0.5 — contexte et runner

- contexte Git ciblé ;
- manifeste SHA-256 par fichier et empreinte globale ;
- chemins sensibles, binaires et formats de secrets exclus ;
- runner sans shell implicite ;
- environnement réduit ;
- logs persistants ;
- timeout et arrêt du groupe de processus ;
- commande `superia validate`.

Validation : 15 tests réussis.

## V0.6 — Codex et leases

- lease SQLite exclusif par mission ;
- expiration et reprise du lease ;
- adaptateur Codex `exec` ;
- plan/review en lecture seule ;
- build uniquement dans un worktree ;
- sandbox officielle conservée ;
- prompt par stdin ;
- JSONL et dernière réponse archivés ;
- test de bout en bout avec faux Codex sans quota.

Validation : 18 tests réussis.

## V0.7 — exploitation Pi

- sauvegarde SQLite par `VACUUM INTO` ;
- manifeste SHA-256 et détection de corruption ;
- daemon de synchronisation/récupération ;
- console Matrix multi-projets ;
- service systemd utilisateur durci ;
- installateur/désinstallateur sans `sudo` ;
- première sauvegarde créée et vérifiée lors de l'installation.

Validation : 20 tests, scripts shell valides et contrôle anti-`sudo`.

## V0.8 — Mistral Vibe

- étude du code officiel de la CLI ;
- mode programmatique forcé par `--prompt ""` ;
- vrai contexte transmis par stdin ;
- plan/review via `plan` ;
- build via `accept-edits` ;
- shell désactivé ;
- outils de fichiers limités ;
- budgets de prix, tokens et tours ;
- modèle transmis via `VIBE_ACTIVE_MODEL` ;
- test de bout en bout avec faux Vibe sans coût.

Une erreur TypeScript de réduction d'union a été détectée par la CI puis corrigée avant publication du statut.

Validation : 21 tests réussis.

## V0.9 — receipts de preuve

- receipt par run ;
- contexte, Git, logs, réponse, événements et validations réunis ;
- SHA-256 du receipt et de chaque artefact ;
- vérification ultérieure ;
- test de falsification d'un log ;
- verdict distinguant agent, contexte, artefacts et validations ;
- approbation humaine toujours obligatoire.

Validation GitHub :

- Ubuntu 24.04 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- 22 tests réussis, 0 échec ;
- 0 vulnérabilité npm signalée ;
- scripts Pi valides ;
- aucune commande `sudo` dans `install/pi`.

## État honnête des adaptateurs

Codex et Vibe sont validés par de faux exécutables locaux reproduisant leur transport programmatique. Cela prouve la plomberie Super IA, pas encore :

- l'authentification réelle ;
- la disponibilité du compte ;
- la qualité du modèle ;
- le coût réel ;
- le fonctionnement sur le Pi cible.

## Prochaine phase

1. installation sur le Pi 5 ;
2. test du service, de la coupure et de la sauvegarde/restauration ;
3. authentification officielle Codex/Vibe ;
4. benchmark identique en mode plan ;
5. Gitleaks ;
6. reviewer indépendant ;
7. pipeline builder → validation → review → receipt ;
8. Restic ;
9. routeur coût/qualité.

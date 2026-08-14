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

- mode programmatique forcé ;
- contexte transmis par stdin ;
- plan/review via `plan` ;
- build via `accept-edits` ;
- shell désactivé ;
- outils de fichiers limités ;
- budgets de prix, tokens et tours ;
- test de bout en bout avec faux Vibe sans coût.

Validation : 21 tests réussis.

## V0.9 — receipts de preuve

- receipt par run ;
- contexte, Git, logs, réponse, événements et validations réunis ;
- SHA-256 du receipt et de chaque artefact ;
- vérification ultérieure ;
- test de falsification d'un log ;
- approbation humaine toujours obligatoire.

Validation : 22 tests réussis.

## V0.10 et v0.11 — suivi et Gitleaks

- priorité, responsable, échéance, tags, dépendances et critères d'acceptation ;
- tableau `superia task board` ;
- roadmap JSON contrôlée par la CI ;
- Gitleaks intégré puis rendu obligatoire avant Codex/Vibe ;
- absence, finding ou erreur bloquants ;
- dérogation explicite et journalisée.

Validation : 26 tests réussis.

## V0.12 — sandbox Bubblewrap

- HOME jetable ;
- système en lecture seule ;
- worktree monté selon le mode ;
- état fournisseur limité ;
- namespaces et capacités réduites ;
- autotest et rapport Pi ;
- dérogation explicite et journalisée.

La politique est validée en CI. La frontière noyau réelle reste à vérifier sur le Raspberry Pi cible.

## V0.13 — contrôle des modifications

- chemins autorisés par mission ;
- build refusé sans périmètre ;
- snapshot Git avant/après ;
- patch et rapport archivés ;
- run marqué `failed` en cas de modification hors périmètre ;
- correction du parseur Git vers porcelain v2 après détection CI.

## Reviewer indépendant et pipeline

- builder et reviewer obligatoirement différents ;
- review strictement en lecture seule ;
- schéma JSON obligatoire ;
- findings structurés par sévérité, preuve et recommandation ;
- sortie non structurée transformée en `blocked` ;
- approbation incohérente transformée en `changes-requested` ;
- ordre builder → garde Git → validations → reviewer → receipt ;
- reviewer non lancé si une étape précédente échoue ;
- receipt enrichi avec change guard, patch et review ;
- aucune fusion automatique.

## Checkpoints et reprise

- état atomique `.superia/pipelines/TASK-XXXX.json` ;
- étapes `initialized`, `builder-completed`, `validation-completed`, `review-completed`, `receipt-created` ;
- commande `superia pipeline status` ;
- option `--resume` ;
- reprise après builder sans relancer le builder ;
- reprise après review en ne recréant que le receipt ;
- reprise refusée sans checkpoint builder complet.

Validation v0.13 : 39 tests réussis.

## V0.14 — corrections bornées

- nouvelle tentative uniquement avec `--retry` ;
- retry autorisé seulement après une review `changes-requested` ;
- `--resume` et `--retry` incompatibles ;
- review précédente injectée au builder via un fichier, jamais dans `argv` ;
- nombre maximal d'essais figé au premier lancement ;
- plafond total de prix Vibe réservé figé au premier lancement ;
- chaque builder terminé consomme une tentative, même si les validations échouent ensuite ;
- empreinte SHA-256 de chaque patch ;
- détection d'un patch déjà vu ;
- arrêt avant une nouvelle validation ou review en cas de boucle ;
- causes d'arrêt persistées ;
- tableau `pipeline status` enrichi avec tentatives et prix réservé.

Causes d'arrêt :

```text
approved
changes-requested
review-blocked
retry-limit
price-limit
loop-detected
technical-failure
```

Le test d'intégration vérifie qu'une seconde correction identique :

- reçoit la review précédente ;
- consomme une seconde tentative ;
- porte le plafond réservé à 0,50 USD ;
- ne relance pas le reviewer ;
- termine avec `loop-detected`.

Validation GitHub v0.14 :

- Ubuntu 24.04 ;
- Node 22.23.2 ;
- npm 10.9.8 ;
- **44 tests réussis, 0 échec** ;
- 0 vulnérabilité npm signalée ;
- scripts Pi valides ;
- aucune commande `sudo` dans `install/pi`.

## État honnête des adaptateurs

Codex et Vibe sont validés par de faux exécutables ou des runners simulés reproduisant leur transport programmatique. Cela prouve la plomberie Super IA, pas encore :

- l'authentification réelle ;
- la disponibilité du compte ;
- la qualité du modèle ;
- le coût réellement facturé ;
- le fonctionnement sur le Pi cible.

## Prochaine phase

1. installer v0.14 sur le Pi 5 ;
2. lancer l'autotest Bubblewrap réel ;
3. tester service, coupure et restauration ;
4. authentifier Codex et Vibe ;
5. benchmark identique ;
6. Restic ;
7. limites de diff et fichiers toujours interdits ;
8. routeur coût/qualité ;
9. DAG de missions.

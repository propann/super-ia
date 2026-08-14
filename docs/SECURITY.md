# Modèle de sécurité

Super IA utilise plusieurs barrières indépendantes. Aucune barrière ne suffit seule.

## Garde-fous obligatoires

1. dépôt Git comme source de vérité ;
2. mode plan/review en lecture seule ;
3. worktree obligatoire avant écriture autonome ;
4. chemins autorisés obligatoires avant un build ;
5. lease exclusif par mission ;
6. contexte ciblé avec chemins sensibles exclus ;
7. Gitleaks obligatoire avant Codex/Vibe réels ;
8. Bubblewrap obligatoire sous Linux avant Codex/Vibe réels ;
9. contrôle Git avant/après chaque agent ;
10. runner sans shell implicite ;
11. logs, événements, diffs et receipts persistants ;
12. validations séparées de l'agent ;
13. approbation humaine obligatoire ;
14. aucune fusion automatique ;
15. budget API à zéro par défaut.

## Préflight Gitleaks

Un agent distant est refusé lorsque Gitleaks est absent, lorsque le scan échoue ou lorsqu'un finding est présent.

Une dérogation exige `--allow-without-gitleaks` et écrit `security.preflight.waived`.

## Préflight Bubblewrap

Sous Linux, un agent réel est refusé lorsque `bwrap` est absent.

Politique actuelle :

- HOME réel non monté ;
- HOME jetable ;
- système en lecture seule ;
- plan/review en lecture seule ;
- build limité au worktree ;
- sorties individuelles explicitement montées ;
- état fournisseur séparé ;
- capacités supprimées ;
- namespaces utilisateur, PID, IPC, UTS et cgroup ;
- réseau isolable.

Une dérogation exige `--allow-without-bwrap` et écrit `sandbox.preflight.waived`.

Voir [`SANDBOX.md`](SANDBOX.md).

## Secrets et données sensibles

Le constructeur de contexte exclut notamment :

- `.env` et variantes ;
- clés SSH ;
- jetons détectés à haute confiance ;
- cookies et profils navigateur ;
- certificats et clés privées ;
- bases locales ;
- fichiers binaires non nécessaires.

Le rapport Gitleaks est expurgé avant archivage : les secrets bruts ne doivent pas être recopiés dans les événements ou receipts.

## Contrôle des modifications

Un build est refusé lorsqu'aucun périmètre n'est déclaré :

```bash
superia task update TASK-0001 \
  --allow-path "src/**" \
  --allow-path "tests/**"
```

Super IA capture l'état Git avant et après l'agent, compare les fichiers aux motifs autorisés et produit :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Une modification hors périmètre fait échouer le run, même lorsque l'agent sort avec le code 0. Une erreur du change guard est elle-même bloquante.

Les modes `plan` et `review` n'autorisent aucune modification.

Voir [`CHANGE_GUARD.md`](CHANGE_GUARD.md).

## Réseau

Codex et Vibe nécessitent actuellement le réseau de l'hôte pour joindre leurs services officiels.

Les agents locaux, validateurs ou outils ne nécessitant pas Internet doivent utiliser le mode réseau isolé. Un filtrage par domaine pour les fournisseurs distants reste à construire.

## Barrières qui restent nécessaires

Le contrôle de chemins ne juge pas la qualité ni la sécurité sémantique du code. Le prochain pipeline doit encore ajouter :

- reviewer indépendant du builder ;
- findings structurés ;
- taille maximale du diff ;
- fichiers toujours interdits ;
- validations obligatoires ;
- budget de retries ;
- receipt final réunissant toutes les preuves.

## Navigateurs assistés

Un profil peut être créé par fournisseur légitime, mais jamais pour multiplier artificiellement les comptes. Super IA prépare, expurge, ouvre et importe. L'envoi final reste contrôlé par l'utilisateur tant qu'une automatisation officielle n'est pas proposée par le fournisseur.

## Ce que Super IA ne fait pas

- contournement de quotas ;
- création de faux comptes ;
- scraping interdit ;
- fusion autonome ;
- suppression silencieuse d'une barrière ;
- stockage volontaire d'un secret dans un prompt ou un receipt ;
- installation d'un modèle local obligatoire sur le Pi.

## Validation matérielle

La CI vérifie la politique Bubblewrap avec des mocks. La commande suivante doit réussir sur le Pi avant validation matérielle :

```bash
superia security sandbox-check
```

Une réussite simulée ne remplace pas cette preuve noyau.

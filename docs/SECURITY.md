# Modèle de sécurité

Super IA utilise plusieurs barrières indépendantes. Aucune barrière ne suffit seule.

## Garde-fous obligatoires

1. dépôt Git comme source de vérité ;
2. mode plan/review en lecture seule ;
3. worktree obligatoire avant écriture autonome ;
4. chemins autorisés obligatoires avant un build ;
5. DAG sans cycle et dépendances terminées ;
6. lease exclusif par mission ;
7. contexte ciblé avec chemins sensibles exclus ;
8. Gitleaks obligatoire avant Codex/Vibe réels ;
9. Bubblewrap obligatoire sous Linux avant Codex/Vibe réels ;
10. masquage des fichiers privés suivis, ignorés et non suivis ;
11. contrôle Git avant/après chaque agent ;
12. runner sans shell implicite ;
13. timeout avec `SIGTERM`, période de grâce puis `SIGKILL` du groupe ;
14. logs, événements, diffs et receipts persistants ;
15. validations séparées de l’agent ;
16. reviewer différent du builder ;
17. retries et prix réservés bornés ;
18. approbation humaine obligatoire ;
19. aucune fusion automatique ;
20. APIs génériques désactivées par défaut.

## Gitleaks

Un agent distant est refusé lorsque Gitleaks est absent, lorsque le scan échoue ou lorsqu’un finding est présent.

Une dérogation exige `--allow-without-gitleaks` et écrit `security.preflight.waived`.

Le rapport archivé est expurgé : aucune valeur détectée ne doit être recopiée dans les événements ou receipts.

## Bubblewrap

Sous Linux, un agent réel est refusé lorsque `bwrap` est absent.

Politique :

- HOME réel non monté ;
- HOME jetable ;
- système en lecture seule ;
- plan/review en lecture seule ;
- build limité au worktree ;
- sorties individuelles explicitement montées ;
- état fournisseur séparé ;
- capacités supprimées ;
- namespaces utilisateur, PID, IPC, UTS et cgroup ;
- réseau isolable ;
- fichiers privés recouverts par `/dev/null` ou un tmpfs vide.

Une dérogation exige `--allow-without-bwrap` et écrit `sandbox.preflight.waived`. Elle supprime la garantie de masquage noyau et ne doit pas servir à valider une installation.

Voir [`SANDBOX.md`](SANDBOX.md).

## Secrets et données privées

Le constructeur de contexte et la sandbox protègent notamment :

- `.env` et variantes ;
- `.npmrc`, `.pypirc`, `.netrc` et `.git-credentials` ;
- clés SSH, certificats et clés privées ;
- jetons détectés à haute confiance ;
- credentials cloud ;
- bases `.db`, `.sqlite`, `.sqlite3` ;
- coffres et fichiers chiffrés ;
- profils navigateur et cookies ;
- répertoires `.ssh`, `.gnupg`, `.aws`, `.azure`, `.kube`, `.docker` et `.terraform`.

La découverte de la sandbox examine les fichiers suivis, non suivis et ignorés par Git. Elle ne lit pas leur contenu pour construire les masques.

## Budget et dépenses

Un run Vibe réel est refusé sans plafond explicite :

```bash
superia agent run vibe TASK-0001 --mode plan --max-price 0.25
```

Un pipeline réel exige :

```text
--max-price
--max-total-price
```

La valeur enregistrée est un plafond réservé, pas une dépense facturée prétendue. Les retries ne peuvent pas augmenter les plafonds figés au premier lancement.

La configuration projet conserve `allowApi: false` et un budget mensuel nul par défaut. `readiness` refuse une configuration qui autoriserait les APIs sans budget positif.

## Contrôle des modifications

Un build est refusé lorsqu’aucun périmètre n’est déclaré :

```bash
superia task update TASK-0001 \
  --allow-path "src/**" \
  --allow-path "tests/**"
```

Super IA capture l’état Git avant et après l’agent et produit :

```text
AGENT_CHANGES.patch
CHANGE_GUARD.json
AGENT_RESULT.json
```

Le run échoue en cas de :

- chemin hors périmètre ;
- fichier critique ;
- trop grand nombre de fichiers ;
- volume de modifications trop important ;
- erreur du garde lui-même.

Les modes `plan` et `review` n’autorisent aucune modification.

Voir [`CHANGE_GUARD.md`](CHANGE_GUARD.md).

## Timeout et processus descendants

Le runner utilise un groupe de processus sous Unix.

En cas de timeout :

1. `SIGTERM` est envoyé au groupe ;
2. le délai de grâce est attendu ;
3. `SIGKILL` est envoyé au groupe ;
4. le runner attend cette escalade avant de déclarer le run terminé ;
5. le garde Git ne s’exécute qu’ensuite.

Cette séquence évite qu’un descendant continue à consommer des ressources ou à modifier le worktree après le résultat.

## Connexions et anti-SSRF

Les endpoints distants exigent HTTPS et une adresse publique. Sont refusés :

- boucle locale ;
- LAN et link-local ;
- CGNAT et multicast ;
- métadonnées cloud ;
- identifiants, query string ou fragment dans la base URL ;
- résolution DNS vers une adresse interdite.

Les sondes réseau sont opt-in, sans authentification et sans redirection.

Un registre `connections.json` existant mais invalide n’est jamais remplacé automatiquement.

Voir [`CONNECTIONS.md`](CONNECTIONS.md).

## Sauvegardes

La sauvegarde locale utilise une copie cohérente de SQLite et un manifeste SHA-256.

Restic :

- mot de passe référencé par `RESTIC_PASSWORD_FILE` ;
- aucune valeur stockée dans la configuration ;
- accès réseau uniquement avec `--network` ;
- exécution uniquement avec `--execute` ;
- aucune rétention destructive automatique.

## Readiness

```bash
superia readiness
```

Le rapport est hors ligne et ne lit aucune valeur de secret. Il vérifie notamment :

- Git et DAG ;
- outils obligatoires ;
- Gitleaks ;
- preuve Bubblewrap récente ;
- registre de connexions ;
- politique réseau ;
- coffre disponible ;
- approbation humaine ;
- expurgation ;
- budget API ;
- agents installés.

## Navigateurs assistés

Un profil peut être créé par fournisseur légitime, mais jamais pour multiplier artificiellement les comptes. Super IA prépare et expurge le contexte. L’envoi final reste manuel tant qu’aucune automatisation officielle n’est proposée par le fournisseur.

## Ce que Super IA ne fait pas

- contournement de quotas ;
- création de faux comptes ;
- scraping interdit ;
- fusion autonome ;
- suppression silencieuse d’une barrière ;
- stockage volontaire d’un secret dans un prompt ou un receipt ;
- installation d’un modèle local obligatoire sur le Pi ;
- commande Restic destructive automatique.

## Validation matérielle

La CI vérifie les politiques, les adaptateurs et les comportements avec des exécutables contrôlés. Les commandes suivantes doivent réussir sur le Pi avant validation matérielle :

```bash
superia security sandbox-check
superia readiness
```

Une réussite CI ne remplace pas la preuve du noyau ARM64 cible.

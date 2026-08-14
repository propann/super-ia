# Modèle de sécurité

Super IA utilise plusieurs barrières indépendantes. Aucune barrière ne suffit seule.

## Garde-fous obligatoires

1. dépôt Git comme source de vérité ;
2. mode plan/review en lecture seule ;
3. worktree obligatoire avant écriture autonome ;
4. lease exclusif par mission ;
5. contexte ciblé avec chemins sensibles exclus ;
6. Gitleaks obligatoire avant Codex/Vibe réels ;
7. Bubblewrap obligatoire sous Linux avant Codex/Vibe réels ;
8. runner sans shell implicite ;
9. logs, événements et receipts persistants ;
10. validations séparées de l'agent ;
11. approbation humaine obligatoire ;
12. aucune fusion automatique ;
13. budget API à zéro par défaut.

## Préflight Gitleaks

Un agent distant est refusé lorsque :

- Gitleaks est absent ;
- le scan échoue ;
- un finding est présent.

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

## Réseau

Codex et Vibe nécessitent actuellement le réseau de l'hôte pour joindre leurs services officiels.

Les agents locaux, validateurs ou outils ne nécessitant pas Internet doivent utiliser le mode réseau isolé. Un filtrage par domaine pour les fournisseurs distants reste à construire.

## Contrôle des modifications

Le worktree et Bubblewrap réduisent la zone d'écriture. `SIA-204` doit encore ajouter :

- état Git avant/après ;
- liste de chemins autorisés ;
- détection des modifications hors périmètre ;
- diff archivé ;
- échec du run en cas de violation.

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

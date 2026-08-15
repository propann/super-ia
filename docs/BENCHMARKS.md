# Benchmarks locaux et routeur mesuré

Super IA peut conserver des **mesures opérationnelles minimales** afin d’améliorer progressivement le choix d’un fournisseur. Ce mécanisme ne contacte aucun service, ne lance aucun agent et ne lit aucun contenu de mission.

## Données enregistrées

Un enregistrement contient uniquement :

```text
providerId
mode : plan | build | review
recordedAt
success : true | false
durationMs
costEur
qualityScore optionnel : 0..100
source : manual | receipt
```

Le registre ne possède aucun champ pour :

- prompt ;
- code source ;
- réponse du modèle ;
- nom de fichier ;
- message d’erreur libre ;
- note de mission ;
- secret ;
- texte arbitraire.

## Stockage

```text
SUPERIA_HOME/providers/benchmarks.json
```

Garanties :

- permissions `0600` ;
- écriture dans un fichier temporaire puis renommage atomique ;
- schéma strict ;
- fournisseurs connus uniquement ;
- identifiants uniques ;
- durée comprise entre 1 ms et 24 heures ;
- coût compris entre 0 et 1 000 euros ;
- qualité comprise entre 0 et 100 ;
- maximum 10 000 enregistrements ;
- fichier invalide conservé et lecture refusée ;
- aucune suppression silencieuse.

## Enregistrer une mesure

Succès :

```bash
superia benchmark record codex-cli \
  --mode plan \
  --success \
  --duration-ms 42000 \
  --cost-eur 0 \
  --quality 85
```

Échec :

```bash
superia benchmark record mistral-vibe \
  --mode review \
  --failure \
  --duration-ms 61000 \
  --cost-eur 0.08
```

Il faut choisir exactement une option entre `--success` et `--failure`.

La note de qualité est facultative. Elle doit être définie selon une grille commune avant de comparer les fournisseurs. En l’absence de grille, ne pas fournir `--quality`.

## Lister et résumer

```bash
superia benchmark list
superia benchmark list --provider codex-cli --mode plan --limit 20
superia benchmark summary
superia benchmark summary --provider codex-cli --mode plan
```

Le résumé calcule :

- nombre d’échantillons ;
- nombre et taux de succès ;
- durée médiane ;
- coût moyen ;
- nombre de notes de qualité ;
- qualité moyenne lorsqu’elle existe.

## Seuil de confiance

Une série doit contenir au moins **trois échantillons** pour influencer le routeur.

Avec un ou deux échantillons :

- la mesure reste visible ;
- elle est marquée insuffisante ;
- son score est ignoré.

Ce seuil évite qu’un seul résultat exceptionnel ou défectueux modifie le classement.

## Influence sur le routeur

```bash
superia route --mode plan --budget zero
superia route --mode build --budget low --require-commands
```

L’ordre des décisions reste :

1. adaptateur prêt ;
2. commande installée ;
3. capacités compatibles avec le mode ;
4. automatisation suffisante ;
5. politique API ;
6. budget autorisé ;
7. préférences du projet ;
8. signal mesuré local, seulement s’il est suffisamment échantillonné.

Le signal mesuré est borné entre **-40 et +45 points**. Il utilise :

- taux de succès ;
- qualité moyenne optionnelle ;
- durée médiane ;
- coût moyen.

Il ne peut jamais :

- rendre éligible un adaptateur `planned` ou `research` ;
- contourner un budget ;
- activer une API interdite ;
- remplacer une commande absente ;
- fournir une capacité inexistante ;
- contourner `readiness` ;
- contourner l’arrêt d’urgence ;
- lancer automatiquement un agent.

## Registre invalide

Si le fichier de benchmarks est corrompu :

- il n’est pas écrasé ;
- les nouvelles écritures sont refusées ;
- le routeur affiche un avertissement ;
- les mesures sont ignorées ;
- le classement statique sécurisé reste disponible.

Pour réparer, conserver d’abord une copie du fichier, identifier la corruption et effectuer une correction manuelle documentée.

## Sauvegarde et restauration

Lorsque le registre existe, la sauvegarde locale ajoute :

```text
provider-benchmarks.json
```

La restauration :

- vérifie sa taille et son SHA-256 ;
- restaure le fichier en `0600` ;
- exécute ensuite le parseur strict ;
- refuse la cible entière si le schéma est invalide.

Le drill de reprise compare aussi le nombre de mesures avant et après restauration.

## Méthode recommandée pour les essais réels

Pour comparer deux fournisseurs :

1. définir un corpus identique de petites missions ;
2. fixer les mêmes chemins autorisés ;
3. utiliser les mêmes validations ;
4. fixer les budgets avant le lancement ;
5. ne jamais réutiliser un prompt contenant un secret ;
6. enregistrer succès, durée et coût ;
7. noter la qualité uniquement avec une grille écrite ;
8. produire au moins trois essais par fournisseur et par mode ;
9. inspecter les receipts ;
10. seulement ensuite consulter le routeur.

## Limites actuelles

- l’enregistrement est manuel ;
- l’import automatique depuis les receipts n’est pas encore livré ;
- les coûts réels dépendent des fournisseurs et des comptes ;
- la qualité nécessite une grille humaine commune ;
- les mesures CI sont synthétiques et ne constituent pas un benchmark de modèle ;
- aucun fournisseur n’est déclaré meilleur avant les essais réels.

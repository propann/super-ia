# Protocole de benchmark des IA et agents

## Objectif

Super IA ne doit pas choisir un fournisseur sur sa réputation. Il doit mesurer ce qui fonctionne **sur les projets réels de l'utilisateur**, avec des conditions comparables.

## Unité de test

Chaque essai est défini par :

- un dépôt ;
- un commit de départ immuable ;
- une mission ;
- un paquet de contexte identique ;
- une politique de permissions ;
- une limite de temps et de tours ;
- les mêmes commandes de validation ;
- un worktree neuf.

## Familles de tâches

### T0 — lecture

- expliquer l'architecture ;
- retrouver un symbole ;
- identifier les commandes de test ;
- lister les fichiers concernés par un changement.

### T1 — correction ciblée

- corriger un test volontairement cassé ;
- réparer un bug dans un ou deux fichiers ;
- ajouter un cas limite simple.

### T2 — fonctionnalité multi-fichiers

- ajouter une petite route, un service et ses tests ;
- modifier une interface et son implémentation ;
- mettre à jour la documentation associée.

### T3 — refactor

- déplacer un module sans changer le comportement ;
- réduire une duplication ;
- migrer une API interne.

### T4 — audit

- trouver un bug injecté ;
- détecter une faille ou une absence de validation ;
- relever les tests manquants ;
- analyser un diff produit par un autre agent.

### T5 — reprise

- interrompre l'agent après un checkpoint ;
- relancer depuis la mémoire de mission ;
- vérifier qu'il ne recommence pas tout et respecte les décisions précédentes.

## Mesures automatiques

```text
build réussi
tests réussis
lint et typecheck
fichiers hors périmètre modifiés
commandes refusées ou dangereuses
nombre de tours
nombre de relances
durée totale
volume de contexte envoyé
coût ou quota consommé
taille du diff
complexité ajoutée
conflits Git
capacité à produire un rapport structuré
```

## Mesures humaines

Noter de 0 à 5 :

- exactitude de la compréhension ;
- qualité de l'architecture ;
- lisibilité du code ;
- respect du style du dépôt ;
- pertinence des tests ;
- absence de modifications inutiles ;
- qualité de l'explication ;
- confiance avant fusion.

## Pénalités fortes

- modification de secrets ;
- sortie du worktree ;
- suppression non demandée ;
- test désactivé pour faire passer la CI ;
- invention d'une validation non exécutée ;
- utilisation réseau non autorisée ;
- fusion ou push sans permission ;
- dépendance ajoutée sans justification.

## Score proposé

```text
40 % réussite fonctionnelle
20 % qualité et simplicité du diff
15 % respect du périmètre et sécurité
10 % qualité des tests
10 % coût et efficacité
 5 % qualité du rapport et reprise
```

Une mission non fonctionnelle ou dangereuse ne peut pas obtenir un bon score grâce à sa rapidité.

## Benchmark des modèles locaux

Les petits modèles du Pi 5 seront testés sur des tâches adaptées :

- résumé d'un log ;
- classification d'une mission ;
- extraction de noms de fichiers ;
- suggestion de message de commit ;
- compression d'une transcription ;
- détection de secrets factices ;
- tri de résultats de recherche.

Mesures supplémentaires :

- mémoire maximale ;
- tokens par seconde ;
- temps de chargement ;
- température et stabilité ;
- qualité avec plusieurs quantifications.

Ils ne seront promus au rôle de constructeur que s'ils réussissent les mêmes tâches de code et tests que les agents distants.

## Stockage des résultats

```text
.superia/benchmarks/
├── suites/
├── runs/
│   └── RUN-2026-0001/
│       ├── input.json
│       ├── context-manifest.json
│       ├── transcript.jsonl
│       ├── diff.patch
│       ├── tests.json
│       └── score.json
└── leaderboard.json
```

Le leaderboard doit être filtrable par :

- dépôt ;
- langage ;
- rôle ;
- taille de tâche ;
- coût ;
- version de l'agent ;
- version du modèle ;
- machine d'exécution.

## Réévaluation

Les modèles et CLI changent rapidement. Relancer un échantillon de benchmark :

- après mise à jour majeure d'un agent ;
- après changement de modèle ;
- après modification du constructeur de contexte ;
- après trois échecs consécutifs ;
- tous les mois pour les fournisseurs principaux.

## Décision

Il n'existe pas une « meilleure IA » universelle. Il existe le meilleur agent disponible pour **cette mission, ce dépôt, ce budget et ce niveau de risque**, démontré par des preuves enregistrées.

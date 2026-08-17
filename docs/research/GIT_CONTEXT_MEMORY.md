# Git, mémoire et sauvegarde de contexte

## Principe central

Super IA doit avoir accès au **dépôt Git complet**, mais aucune IA ne doit recevoir automatiquement tout le dépôt dans son prompt.

Le dépôt complet sert de vérité locale. Le constructeur de contexte sélectionne ensuite ce qui est utile à une mission précise.

## Trois mémoires différentes

### 1. Mémoire du code

Git conserve :

- tous les fichiers suivis ;
- les branches et tags ;
- le commit de départ de chaque mission ;
- le diff produit ;
- l'auteur logique de chaque changement ;
- la possibilité de revenir en arrière.

### 2. Mémoire du projet

Des artefacts Markdown versionnés conservent :

- vision ;
- architecture ;
- conventions ;
- décisions ;
- contraintes ;
- roadmap ;
- commandes de test ;
- risques connus ;
- éléments à valider humainement.

Ces informations ne doivent pas dépendre d'un historique de chat privé à un fournisseur.

### 3. Mémoire opérationnelle

SQLite et des journaux JSONL conservent :

- missions ;
- statuts ;
- dépendances ;
- fournisseurs utilisés ;
- worktrees ;
- PID et processus ;
- événements ;
- coûts ;
- durées ;
- résultats de tests ;
- chemins des transcriptions ;
- hash des paquets de contexte.

## Structure proposée

```text
.superia/
├── config.json
├── project.json
├── state.sqlite
├── events.jsonl
├── decisions/
├── missions/
│   └── TASK-0001/
│       ├── mission.json
│       ├── SPEC.md
│       ├── PLAN.md
│       ├── CONTEXT.md
│       ├── FILES.txt
│       ├── context-manifest.json
│       ├── responses/
│       ├── tests/
│       ├── review/
│       └── RESULT.md
└── private/        # jamais envoyé ou versionné sans décision explicite
```

## Paquet de contexte reproductible

Chaque appel important doit être associé à un manifeste :

```json
{
  "taskId": "TASK-0001",
  "baseCommit": "<sha>",
  "provider": "codex-cli",
  "role": "builder",
  "files": ["src/auth.ts", "tests/auth.test.ts"],
  "instructions": ["AGENTS.md", "docs/ARCHITECTURE.md"],
  "gitDiffIncluded": true,
  "gitLogCount": 20,
  "secretsScan": "passed",
  "contentHash": "sha256:..."
}
```

Ainsi, une réponse peut être reproduite, auditée ou comparée avec une autre IA.

## Construction du contexte

Ordre recommandé :

1. lire la constitution du projet et `AGENTS.md` ;
2. lire la mission, la spécification et le plan ;
3. inspecter l'arbre Git ;
4. rechercher symboles et mots-clés avec ripgrep ;
5. construire un graphe léger des imports et dépendances ;
6. sélectionner les fichiers proches ;
7. ajouter les tests et erreurs concernés ;
8. ajouter le diff courant et les commits pertinents ;
9. compter les tokens ;
10. compresser ou résumer les fichiers secondaires ;
11. scanner les secrets ;
12. produire le manifeste final.

Repomix peut servir de moteur initial pour la sélection, le comptage, Secretlint et la compression Tree-sitter.

## Niveaux de contexte

### Contexte stable

Rarement modifié : vision, architecture, normes et sécurité.

### Contexte de mission

Objectif, critères d'acceptation, fichiers autorisés, commandes et budget.

### Contexte d'exécution

Sorties récentes, erreurs de test, diff actuel et décisions prises pendant la mission.

### Mémoire de reprise

Résumé court écrit à chaque checkpoint :

```text
état atteint
fichiers modifiés
commandes réussies
échecs restants
décisions prises
prochaine action sûre
commit ou patch de reprise
```

Une reprise ne doit pas nécessiter de renvoyer toute la conversation.

## Checkpoints

Créer un checkpoint :

- avant le premier appel d'écriture ;
- après chaque étape importante ;
- avant un refactor large ;
- après une suite de tests réussie ;
- avant revue ;
- avant fusion.

Un checkpoint contient au minimum le SHA de base, le diff, la mission mise à jour et le résumé de reprise.

## Sauvegardes

### Git

- pousser les branches importantes vers GitHub ;
- tags automatiques avant migrations ;
- miroirs locaux des dépôts critiques ;
- aucun secret dans l'historique.

### État Super IA

- sauvegarde cohérente SQLite ;
- export JSON régulier des missions ;
- archivage des décisions et résultats ;
- réplication vers un support ou serveur distinct avec chiffrement.

### Ce qui n'est pas sauvegardé par défaut

- `node_modules` ;
- caches ;
- modèles téléchargés ;
- artefacts de build reproductibles ;
- worktrees abandonnés ;
- secrets en clair.

## Gestion des transcriptions

Conserver les sorties brutes localement pour l'audit, mais ne pas les injecter automatiquement dans une nouvelle session. Produire trois dérivés :

- résumé de mission ;
- décisions durables candidates ;
- compétences ou procédures réutilisables candidates.

Le modèle Gemini Auto Memory propose une approche intéressante : les mémoires candidates sont générées sous forme de patches et ne sont appliquées qu'après validation. Super IA doit reprendre ce principe pour tous les fournisseurs.

## Décision

Git conserve ce qui est vrai. SQLite conserve ce qui se passe. Les fichiers Markdown conservent ce qui a été décidé. Les transcriptions conservent les preuves. Aucun fournisseur ne devient la mémoire unique du projet.

## Sources

- Repomix : https://github.com/yamadashy/repomix
- Gemini Auto Memory : https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/auto-memory.md
- GitHub Spec Kit : https://github.com/github/spec-kit

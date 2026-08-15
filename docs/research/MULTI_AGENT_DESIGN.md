# Architecture multi-agent retenue

## Ce que Super IA ne sera pas

Super IA ne sera pas une salle de discussion où cinq modèles se répondent sans fin. Ce schéma consomme beaucoup de contexte, multiplie les erreurs et rend les décisions difficiles à reproduire.

Le système sera un **orchestrateur déterministe** qui appelle des agents spécialisés pour des missions bornées.

## Pipeline général

```text
DEMANDE UTILISATEUR
        │
        ▼
SCOUT LOCAL
analyse Git, stack, risques et fichiers candidats
        │
        ▼
PLANIFICATEUR
spécification, plan et graphe de tâches
        │
        ▼
ROUTEUR
choix selon compétence, coût, disponibilité et historique
        │
        ├───────────────┐
        ▼               ▼
BUILDER A          BUILDER B
worktree A         worktree B
fichiers séparés   fichiers séparés
        └───────┬───────┘
                ▼
TESTEUR LOCAL
                ▼
REVIEWER INDÉPENDANT
                ▼
INTÉGRATEUR
                ▼
VALIDATION HUMAINE
```

## Rôles

### Scout

Lecture seule. Il identifie :

- architecture du dépôt ;
- fichiers concernés ;
- tests disponibles ;
- zones dangereuses ;
- dépendances ;
- volume estimé de contexte.

Une partie de ce travail peut être locale et déterministe.

### Planner

Produit des artefacts, pas seulement une réponse :

- spécification ;
- critères d'acceptation ;
- plan ;
- graphe des tâches ;
- fichiers autorisés ;
- stratégie de test ;
- risques et retour arrière.

### Builder

Travaille dans un worktree dédié. Il reçoit une mission limitée et ne peut pas fusionner.

### Tester

Lance les commandes du dépôt sans interprétation créative. Il stocke stdout, stderr, codes de sortie et durées.

### Reviewer

IA différente du Builder, en lecture seule sur le diff. Elle classe les problèmes et propose des tests de preuve.

### Integrator

Résout les conflits, exécute les tests globaux, prépare le rapport et demande la validation humaine.

## Contrat d'un agent

Chaque adaptateur doit accepter une enveloppe commune :

```json
{
  "taskId": "TASK-0001",
  "role": "builder",
  "repository": "/srv/superia/repos/app",
  "worktree": "/srv/superia/worktrees/TASK-0001",
  "baseCommit": "<sha>",
  "contextManifest": "<path>",
  "allowedPaths": ["src/auth/**", "tests/auth/**"],
  "forbiddenPaths": [".env", ".git/**"],
  "commands": ["npm test"],
  "maxTurns": 12,
  "timeoutSeconds": 1200,
  "network": "off",
  "outputFormat": "jsonl"
}
```

Le résultat doit contenir :

```json
{
  "status": "completed",
  "summary": "...",
  "filesChanged": [],
  "commandsRun": [],
  "tests": [],
  "risks": [],
  "nextActions": [],
  "providerUsage": {},
  "transcriptPath": "..."
}
```

## Protocole d'intégration

Trois voies doivent être prises en charge :

### Processus CLI

Mode prioritaire sur Pi 5. L'orchestrateur lance Codex, Claude Code, Vibe, Gemini, Qwen, Aider ou OpenCode comme sous-processus et capture JSON, JSONL, stdout et stderr.

### ACP

Agent Client Protocol peut permettre une intégration plus uniforme avec Vibe, OpenHands et d'autres agents. Il sera étudié après les premiers adaptateurs CLI, sans bloquer le MVP.

### Web assisté

Le système prépare le paquet, ouvre le profil navigateur, copie le prompt et importe la réponse. Aucun clic automatique, contournement de quota ou CAPTCHA.

## Parallélisme

Le parallélisme n'est autorisé que si :

- les tâches n'écrivent pas dans les mêmes fichiers ;
- les dépendances sont satisfaites ;
- chaque tâche possède son worktree ;
- les ressources du Pi permettent le nombre de processus ;
- une stratégie de fusion existe.

Un verrou logique peut être posé par chemin ou module :

```text
src/auth/**      réservé par TASK-0001
src/payments/**  réservé par TASK-0002
```

## État et reprise

Chaque changement d'état génère un événement append-only :

```json
{"type":"task.created","taskId":"TASK-0001","at":"..."}
{"type":"worktree.created","taskId":"TASK-0001","sha":"..."}
{"type":"agent.started","provider":"mistral-vibe","pid":1234}
{"type":"checkpoint.saved","contextHash":"..."}
{"type":"tests.finished","exitCode":0}
```

Après coupure de courant, Super IA relit SQLite et le journal, vérifie les PID, l'état Git et les worktrees, puis propose une reprise sûre.

## Sélection du fournisseur

Le routeur applique des filtres :

1. capable d'effectuer le rôle ;
2. installé et authentifié ;
3. autorisé par la politique ;
4. budget disponible ;
5. résultat historique suffisant ;
6. contexte compatible ;
7. charge machine acceptable.

Puis il calcule un score :

```text
score = qualité_mesurée
      - coût_normalisé
      - risque
      - taux_d'échec
      - surcharge_contextuelle
      + disponibilité
```

## Inspirations retenues

- mini-SWE-agent : boucle simple, historique linéaire et actions indépendantes ;
- OpenCode : modes plan/build et sous-agent ;
- Mistral Vibe : agents configurables et permissions ;
- Gemini/Qwen : sous-agents, mémoire et worktrees ;
- OpenHands : backends multiples et ACP ;
- Pochi : tâches parallèles dans des worktrees ;
- Spec Kit : artefacts avant implémentation.

## Décision

Le multi-agent doit être une chaîne de production avec contrôles, pas une improvisation collective. La puissance vient de la spécialisation et de la mémoire commune, pas du nombre de voix dans la pièce.

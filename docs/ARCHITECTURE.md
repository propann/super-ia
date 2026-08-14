# Architecture initiale

```text
CLI superia
   │
   ├── console Matrix
   ├── registre des fournisseurs
   ├── diagnostic des outils installés
   ├── scanner du dépôt Git
   ├── gestionnaire de missions persistantes
   ├── gestionnaire de worktrees
   ├── configuration et politique de coût
   ├── futur constructeur de contexte
   ├── futur expurgateur de secrets
   └── futurs adaptateurs
          ├── CLI officielles
          ├── agents open source
          ├── modèles locaux
          ├── navigateur assisté
          └── API plafonnée
```

## Flux local actuel

```text
superia scan
   ↓
RepositoryScan
   ↓
superia task create
   ↓
.superia/tasks/TASK-XXXX.json
   ↓
superia worktree TASK-XXXX
   ↓
branche agent/task-xxxx-* dans un worktree séparé
```

La console `superia matrix` agrège ce flux et affiche l'état réel du dépôt, des missions, des fournisseurs et de la politique économique.

## Contrat futur d'un adaptateur

Un adaptateur devra déclarer : transport, méthode d'authentification, capacités, coût, limites, mode non interactif, permissions nécessaires et format de résultat.

Le cœur ne doit jamais contenir une logique spécifique à un fournisseur. Il choisit une capacité, puis l'adaptateur traduit la mission.

## Modes

- `read-only` : inspection et planification ;
- `worktree` : écriture confinée, tests et commit local ;
- `web-assisted` : paquet de contexte expurgé, envoi validé par l'utilisateur et import de réponse ;
- `api-budgeted` : appel automatisé avec plafond, journal et arrêt immédiat au dépassement.

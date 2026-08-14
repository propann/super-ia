# Architecture initiale

```text
CLI superia
   │
   ├── registre des fournisseurs
   ├── diagnostic des outils installés
   ├── configuration et politique de coût
   ├── futur gestionnaire de missions
   ├── futur gestionnaire de worktrees
   ├── futur constructeur de contexte
   ├── futur expurgateur de secrets
   └── futurs adaptateurs
          ├── CLI officielles
          ├── agents open source
          ├── modèles locaux
          ├── navigateur assisté
          └── API plafonnée
```

## Contrat futur d'un adaptateur

Un adaptateur devra déclarer : transport, méthode d'authentification, capacités, coût, limites, mode non interactif, permissions nécessaires et format de résultat.

Le cœur ne doit jamais contenir une logique spécifique à un fournisseur. Il choisit une capacité, puis l'adaptateur traduit la mission.

## Modes

- `read-only` : inspection et planification ;
- `worktree` : écriture confinée, tests et commit local ;
- `web-assisted` : paquet de contexte expurgé, envoi validé par l'utilisateur et import de réponse ;
- `api-budgeted` : appel automatisé avec plafond, journal et arrêt immédiat au dépassement.

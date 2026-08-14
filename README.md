# Super IA

**Un centre de commandement local, multi-fournisseurs et économique pour coder avec plusieurs IA sans dépendre d'une API payante.**

Super IA détecte les agents disponibles sur la machine, choisit la voie la plus adaptée, isole les modifications dans Git et garde l'utilisateur maître des coûts et de la fusion.

## Console Matrix

```bash
npm install
npm run build
node dist/index.js matrix
```

La console affiche en direct :

- le dépôt, la branche et l'état Git ;
- la stack et les commandes de validation détectées ;
- les fournisseurs IA présents ou utilisables en mode assisté ;
- les missions persistantes et leur statut ;
- le verrou API, le budget et les règles de fusion.

Contrôles : `R` rafraîchit, `Q` quitte. Pour une capture statique :

```bash
node dist/index.js matrix --once
```

## Philosophie

```text
demande
   ↓
analyse du dépôt
   ↓
choix du fournisseur légitime le moins coûteux
   ↓
mission isolée dans un worktree
   ↓
code + tests + audit croisé
   ↓
diff présenté à l'utilisateur
   ↓
fusion humaine
```

## Commandes actuelles

```bash
superia matrix
superia doctor
superia providers
superia scan
superia init
superia task create "Ajouter une authentification"
superia task list
superia task show TASK-0001
superia worktree TASK-0001
```

`superia worktree TASK-0001 --dry-run` affiche la commande sans modifier Git.

## Voies prévues

- CLI officielles : Codex, Mistral Vibe, Claude Code et outils Google disponibles ;
- agents ouverts : Qwen Code, OpenCode, Aider et Goose ;
- services web assistés : DeepSeek, Le Chat et autres interfaces autorisées ;
- modèles locaux ou serveur personnel ;
- API compatibles uniquement en secours, avec budget strict.

Aucun faux compte, aucun contournement de quota, aucun scraping interdit.

## État actuel — v0.2

- catalogue et diagnostic multi-fournisseurs ;
- configuration locale avec API désactivées par défaut ;
- scanner Git et détection des commandes de validation ;
- missions persistantes `TASK-XXXX` ;
- branches et worktrees isolés ;
- console de contrôle Matrix ;
- tests du flux `scan → mission → worktree`.

## Développement

```bash
npm install
npm test
npm run matrix
```

## Documentation

- [Vision](docs/PROJECT_VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Fournisseurs](docs/PROVIDERS.md)
- [Sécurité](docs/SECURITY.md)
- [Feuille de route](docs/ROADMAP.md)

## Licence

MIT.

# Super IA

**Un centre de commandement local, multi-fournisseurs et économique pour coder avec plusieurs IA sans dépendre d'une API payante.**

Super IA détecte les agents disponibles sur la machine, choisit la voie la plus adaptée, isole les modifications dans Git et garde l'utilisateur maître des coûts et de la fusion.

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

## Voies prévues

- CLI officielles : Codex, Mistral Vibe, Claude Code, outils Google disponibles ;
- agents ouverts : Qwen Code, OpenCode, Aider, Goose ;
- services web assistés : DeepSeek, Le Chat et autres interfaces autorisées ;
- modèles locaux ou serveur personnel ;
- API compatibles uniquement en secours, avec budget strict.

Aucun faux compte, aucun contournement de quota, aucun scraping interdit.

## État actuel

La version `0.1.0` pose le socle :

- catalogue de fournisseurs ;
- diagnostic des commandes installées ;
- configuration locale ;
- API désactivées par défaut ;
- règles de sécurité et feuille de route.

## Utilisation de développement

```bash
npm install
npm run build
node dist/index.js providers
node dist/index.js doctor
node dist/index.js init
npm test
```

Après publication du paquet :

```bash
superia doctor
superia providers
superia init
```

## Documentation

- [Vision](docs/PROJECT_VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Fournisseurs](docs/PROVIDERS.md)
- [Sécurité](docs/SECURITY.md)
- [Feuille de route](docs/ROADMAP.md)

## Licence

MIT.

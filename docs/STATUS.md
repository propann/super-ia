# État vérifié du projet

Date du contrôle : **15 août 2026**  
Version : **0.17.0**  
Branche : `agent/bootstrap-universal-cli`  
Pull request : `#1` vers `main`

## Résultat vérifié

| Élément | Résultat |
|---|---|
| CI GitHub | réussie |
| Build TypeScript | réussi |
| Tests | **83 réussis, 0 échec** |
| Audit npm | **0 vulnérabilité signalée** |
| Système CI | Ubuntu 24.04.4 |
| Node / npm | 22.23.2 / 10.9.8 |
| Scripts validés | Pi + toolchain |
| Actions GitHub | permissions lecture seule, SHA épinglés |
| `curl`/`wget` directement pipé vers un shell | interdit par la CI |
| Dry-run Core / Standard / Full | réussi et non destructif |
| Commande `sudo` cachée dans le paquet Pi | aucune |

## Architecture cible

Le Raspberry Pi 5 est un **plan de contrôle léger** :

- SQLite WAL et journal JSONL ;
- registre multi-projets ;
- missions, dépendances, runs, événements et leases ;
- préparation de contexte ;
- déclenchement et surveillance des agents distants ;
- validation, receipts et sauvegardes ;
- console terminal, interface web et notifications locales ;
- daemon systemd utilisateur.

Aucun profil n’installe de modèle local ni de poids IA.

## Socle livré

- SQLite WAL, migrations et reprise ;
- DAG de missions avec cycles et dépendances inconnues refusés ;
- blocage et déblocage automatiques des missions ;
- branches et worktrees Git ;
- contexte ciblé et manifestes SHA-256 ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- Codex et Mistral Vibe contrôlés ;
- budget Vibe explicite obligatoire pour tout run réel ;
- plafond par tentative et plafond cumulé requis par la CLI pipeline ;
- Gitleaks obligatoire avant les agents distants ;
- Bubblewrap avec HOME jetable et contrôle du workspace ;
- masquage des `.env`, credentials, bases privées, clés et répertoires sensibles ;
- noms de fichiers Git conservés au caractère près pendant le masquage ;
- garde Git avec chemins critiques interdits et plafonds de diff ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- checkpoints, reprise, retries bornés et détection de boucle ;
- receipts vérifiables ;
- console Matrix et daemon ;
- interface web locale authentifiée et en lecture seule ;
- notifications locales privées, expurgées et dédupliquées ;
- Connection Matrix universelle ;
- politique anti-SSRF et validation DNS ;
- sondes réseau opt-in sans authentification ni redirection ;
- readiness hors ligne ;
- sauvegardes locales cohérentes ;
- configuration et plans Restic non destructifs ;
- service Pi respectant un `SUPERIA_HOME` personnalisé ;
- registre de connexions invalide conservé pour réparation au lieu d’être écrasé ;
- CI durcie et Dependabot.

## Interface web locale

```bash
superia web
```

Adresse :

```text
http://127.0.0.1:3210
```

Garanties vérifiées :

- écoute limitée à `127.0.0.1` ou `::1` ;
- token privé dans `SUPERIA_HOME/web/access.token` en `0600` ;
- fichier de token invalide conservé au lieu d’être remplacé ;
- comparaison du token en temps constant ;
- session mémoire avec cookie HttpOnly et SameSite Strict ;
- bearer token uniquement lorsqu’il est fourni explicitement ;
- aucune CORS ;
- en-têtes CSP, no-referrer, no-store et anti-frame ;
- interface et API en lecture seule ;
- refus des méthodes destructives ;
- projets, missions, runs, notifications, événements et readiness issus du plan de contrôle.

L’affichage réel reste à vérifier sur le Pi et sur mobile.

## Notifications locales

Commandes :

```bash
superia notify status
superia notify run
superia notify list --limit 50
```

Le daemon traite automatiquement :

- `run.completed` ;
- `run.failed` ;
- `run.cancelled` ;
- `run.interrupted` ;
- missions au statut `blocked`.

Garanties vérifiées :

- configuration, curseur et reçus en `0600` ;
- écriture atomique de la configuration et du curseur ;
- reçu créé en écriture exclusive ;
- clé déterministe transformée en nom SHA-256 ;
- aucun doublon après retraitement du même événement ;
- première initialisation positionnée sur le dernier événement existant ;
- interruption détectée pendant un tick bien notifiée ;
- erreur de notifications non bloquante pour le daemon ;
- configuration invalide conservée pour réparation ;
- aucun prompt, titre libre, objectif, note, payload, métadonnée, diagnostic ou nom de fournisseur arbitraire copié dans les reçus ;
- uniquement des identifiants internes, statuts contrôlés et dates ;
- aucun canal réseau activé.

Limites actuelles :

- pas de webhook, e-mail, Telegram, Signal ou notification desktop ;
- pas d’acquittement ;
- pas encore de rétention automatique des reçus ;
- validation systemd réelle encore à faire sur le Pi.

## Corrections issues de la revue

Cinq défauts matériels ont été corrigés et les cinq fils GitHub ont été documentés puis résolus :

1. **Budget Vibe implicite** : un run réel sans `--max-price` est refusé ; un pipeline réel exige également `--max-total-price`.
2. **Fichiers privés exposés dans le worktree** : les fichiers sensibles suivis, non suivis ou ignorés sont masqués dans Bubblewrap.
3. **Descendant survivant après timeout** : le runner attend l’escalade `SIGKILL` avant de rendre la main.
4. **`SUPERIA_HOME` perdu par systemd** : la valeur personnalisée est injectée dans l’unité et dans `ReadWritePaths`.
5. **Registre de connexions écrasé** : un fichier existant invalide provoque une erreur récupérable et reste intact.

## Connexions et réseau

Le registre couvre :

- sessions CLI ;
- APIs officielles ;
- Azure OpenAI, AWS Bedrock et Vertex AI ;
- GitHub Models, OpenRouter, DeepSeek, Groq, Hugging Face et Together ;
- endpoints compatibles OpenAI ;
- MCP stdio/HTTP ;
- ACP ;
- A2A ;
- worker SSH ;
- web assisté ;
- endpoints locaux expérimentaux désactivés.

Toutes les connexions sont désactivées par défaut. L’état `ready` signifie seulement que les références nécessaires sont présentes.

Règles réseau :

- HTTPS obligatoire à distance ;
- loopback, LAN, link-local et métadonnées cloud interdits pour les endpoints distants ;
- endpoint local limité à la boucle locale ;
- résolution DNS vers une adresse privée bloquante ;
- query string, fragment et identifiants intégrés interdits ;
- aucun réseau pendant `doctor`, `policy`, `readiness` ou les notifications ;
- `probe` exige `--network`, utilise `HEAD`, n’envoie aucune authentification et ne suit aucune redirection.

## Sauvegardes

La sauvegarde locale :

- utilise l’API backup de SQLite ;
- copie le journal JSONL et les fichiers de contrôle ;
- produit un manifeste de tailles et SHA-256 ;
- peut être vérifiée sans restaurer.

Restic :

- configuration privée en `0600` ;
- références uniquement via `RESTIC_REPOSITORY` et `RESTIC_PASSWORD_FILE` ;
- aucun secret enregistré ou affiché ;
- sauvegarde réelle uniquement avec `--execute --network` ;
- vérification bornée par sous-ensemble ;
- rétention fournie uniquement en prévisualisation `forget --dry-run` ;
- aucune commande `--prune` générée automatiquement.

## Ce qui attend encore le Pi ou les comptes

- installer réellement le profil Standard sur ARM64 ;
- exécuter `superia security sandbox-check` sur le noyau du Pi ;
- confirmer le service systemd utilisateur après déconnexion ;
- vérifier l’interface web sur le Pi et sur mobile ;
- vérifier les notifications après redémarrage et déconnexion ;
- décider si un service systemd web séparé est souhaité ;
- choisir le coffre de secrets définitif ;
- configurer un dépôt Restic et effectuer une restauration sur copie ;
- authentifier les CLI retenues ;
- tester les fournisseurs activés avec des requêtes bornées ;
- tester MCP, ACP, A2A et le worker SSH ;
- simuler une coupure brutale et vérifier la reprise ;
- produire un pipeline réel Codex/Vibe avec receipts ;
- mesurer coût, qualité et latence avant routage automatique.

## Limites volontaires

- aucune clé créée automatiquement ;
- aucune connexion activée automatiquement ;
- aucune dépense sans plafond explicite ;
- aucun modèle local installé ;
- aucun navigateur automatisé ;
- aucune interface web distante ;
- aucune notification réseau par défaut ;
- aucune fusion automatique ;
- `node:sqlite` affiche encore un avertissement expérimental sous Node 22.

## Commandes de contrôle sur le Pi

```bash
superia doctor
superia connection policy
superia security sandbox-check
superia readiness
superia control status --json
superia backup create
superia backup list
superia restic status
superia notify status
superia daemon --once
superia notify list
superia web token
superia web
```

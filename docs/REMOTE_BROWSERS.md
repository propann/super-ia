# Navigateurs distants sur le Pi

Le Pi lance des bureaux Chromium isolés dans Docker. Chaque fournisseur a son
propre volume `/config`, son propre port local et sa propre session web. La
connexion initiale est toujours manuelle dans le bureau graphique.

## Démarrage

```bash
make init
make up
make browser-up
```

La commande `make browser-up` démarre ChatGPT, Claude et Gemini. Les autres
profils restent disponibles à la demande :

```bash
make browser-up BROWSER_PROFILES=browser-deepseek
make browser-up BROWSER_PROFILES=browser-grok
make browser-up BROWSER_PROFILES=browser-mistral
make browser-up BROWSER_PROFILES=browser-suno
```

`make browser-up-all` existe pour un test complet, mais il est volontairement
optionnel : plusieurs bureaux Chromium consomment davantage de RAM et de CPU.

## Accès depuis le PC ou le téléphone

Le dashboard et les navigateurs restent liés à `127.0.0.1` sur le Pi. Ouvre un
tunnel SSH depuis la machine qui affichera l'interface :

```bash
ssh -N \
  -L 18080:127.0.0.1:8080 \
  -L 3011:127.0.0.1:3011 \
  -L 3012:127.0.0.1:3012 \
  -L 3013:127.0.0.1:3013 \
  -L 3014:127.0.0.1:3014 \
  -L 3015:127.0.0.1:3015 \
  -L 3016:127.0.0.1:3016 \
  -L 3017:127.0.0.1:3017 \
  azoth@192.168.2.34
```

Puis ouvre `http://127.0.0.1:18080`. Les cartes du dashboard ouvrent les
bureaux Chromium correspondants.

Le mot de passe HTTP du bureau est local à `.env` :

```bash
grep -E '^(BROWSER_USER|BROWSER_PASSWORD)=' .env
```

Après cette authentification locale, connecte manuellement chaque compte dans
son propre profil. Aucun cookie n'est exporté dans Git, n8n ou LiteLLM.

## Garde-fous

- Les ports ne sont pas publiés sur le réseau : tunnel SSH uniquement.
- Le bureau Chromium est configuré en mode durci et sans terminal exposé.
- Les comptes, MFA, CAPTCHA, paiements, suppressions et publications restent
  sous contrôle humain.
- Les profils ne servent pas à contourner un quota, une limitation ou une
  politique de fournisseur.

Le dashboard peut préparer une mission et le runner peut exécuter uniquement
les contrôles Git allowlistés. Le pilotage automatique des interfaces web sera
ajouté ensuite avec un worker Playwright séparé, après validation manuelle des
sessions.

# Navigateurs et profils isolés

Super IA utilise Chromium dans des conteneurs graphiques compatibles arm64. Le
Pi garde un profil persistant par fournisseur : ChatGPT, Claude, Gemini,
DeepSeek, Grok, Mistral et Suno.

Chaque profil a son propre volume Docker `/config`, son URL de départ et son
port de bureau. Les services sont liés à `127.0.0.1` et sont ouverts depuis un
tunnel SSH. La première connexion est manuelle.

```bash
make browser-up
make browser-up BROWSER_PROFILES=browser-deepseek
make browser-up BROWSER_PROFILES=browser-grok
```

Le profil par défaut démarre ChatGPT, Claude et Gemini. `make browser-up-all`
permet de lancer toute la flotte, mais il est réservé aux tests : plusieurs
navigateurs Chromium simultanés consomment davantage de mémoire.

## Règles

- aucun cookie n'est exporté ;
- aucune URL arbitraire n'est injectée dans Compose ;
- les ports ne sont pas exposés directement sur le réseau ;
- MFA, CAPTCHA, achat, suppression, publication et modification de compte
  restent humains ;
- aucune rotation de comptes et aucun contournement de quota ;
- le dashboard ne lance pas de shell arbitraire ;
- le runner n'exécute que les contrôles Git explicitement allowlistés.

Le worker d'automatisation web viendra ensuite, séparé du navigateur graphique,
avec tâches structurées, journal d'audit et arrêt humain avant les actions
irréversibles.

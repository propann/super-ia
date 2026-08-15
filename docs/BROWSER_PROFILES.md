# Profils navigateur isolés

## But

Super IA utilise d'abord les connexions les moins coûteuses et les moins fragiles.
Pour ChatGPT, Claude, Gemini, DeepSeek, Mistral et Suno, le mode navigateur permet
d'utiliser les interfaces web sans imposer une clé API payante.

Chaque fournisseur possède son propre dossier Chromium :

```text
~/.local/share/super-ia/browser-profiles/<fournisseur>
```

Les cookies ne sont pas mélangés entre fournisseurs, ne quittent pas la machine et
ne doivent jamais être copiés dans Git, Docker, n8n ou une sauvegarde non chiffrée.

## Vérifier la machine

Depuis une session graphique locale :

```bash
make browser-check
```

## Ouvrir une session

```bash
make browser NAME=chatgpt
make browser NAME=claude
make browser NAME=gemini
make browser NAME=deepseek
make browser NAME=mistral
make browser NAME=suno
```

La première ouverture demande une connexion humaine. MFA et CAPTCHA restent
volontairement manuels.

## Sécurité

- liste de fournisseurs fermée dans le script ;
- aucune URL arbitraire acceptée ;
- permissions locales privées grâce à `umask 077` ;
- aucun export de cookies ;
- aucune rotation de comptes pour contourner des quotas ;
- aucun bouton du dashboard n'exécute une commande sur l'hôte ;
- les actions sensibles restent soumises à validation humaine.

## Étape suivante

Le futur worker Playwright devra rester optionnel et démarré à la demande. Il devra
recevoir uniquement des tâches structurées et autorisées, avec captures d'écran,
journal d'audit et arrêt avant toute publication, suppression, achat ou modification
de compte. Le Pi 5 reste un plan de contrôle léger, pas une ferme de navigateurs.

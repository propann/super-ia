# Modèle de sécurité

## Garde-fous obligatoires

- lecture seule par défaut lors de la découverte d'un dépôt ;
- worktree obligatoire avant écriture autonome ;
- liste de chemins autorisés et interdits par mission ;
- blocage de `.env`, clés SSH, jetons, cookies, certificats et bases locales ;
- réseau désactivable ;
- commandes dangereuses bloquées ;
- aucune fusion automatique ;
- journal des prompts distants et des fichiers transmis ;
- budget API à zéro par défaut.

## Navigateurs assistés

Un profil peut être créé par fournisseur légitime, mais jamais pour multiplier artificiellement les comptes. Super IA prépare, expurge, ouvre et importe. L'envoi final reste contrôlé par l'utilisateur tant qu'une automatisation officielle n'est pas proposée par le fournisseur.

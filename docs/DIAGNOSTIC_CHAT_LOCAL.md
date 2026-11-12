# Diagnostic du chat local

Depuis le dépôt Super IA, lancer :

```bash
npm run diagnose:chat
```

## Démarrer les deux services IA ensemble

Le compte utilisateur systemd regroupe Ollama, l’interface et Veille MU-TH-UR
dans la cible `superia-local.target`. Veille héberge le pont du rack. Après
installation de cette unité sur l’hôte, active-la
pour la session en cours et au démarrage de la session utilisateur :

```bash
systemctl --user daemon-reload
systemctl --user enable --now superia-local.target
```

Ensuite, une commande suffit pour démarrer ou redémarrer l’ensemble :

```bash
systemctl --user restart superia-local.target
```

Pour vérifier les trois services :

```bash
systemctl --user status superia-local.target ollama.service superia-web.service --no-pager
```

La cible démarre les services locaux Ollama, Super IA et Veille. Les fichiers
d’unité et leurs compléments sont dans `~/.config/systemd/user/`.

La commande vérifie l’état des unités utilisateur `ollama.service` et
`superia-web.service`, l’API Ollama, la route de santé Super IA, la liste des
modèles accessibles et, pour chacun, un test texte, l’outil workspace
`list_files` sur `src` et les trois outils rack en lecture seule : inventaire
Ollama, recherche dans la veille en cache et état de Quant Core. Les appels
rack passent par le pont local MU-TH-UR sur `127.0.0.1:8765`. Les modèles sont
testés séquentiellement avec le même budget. Le succès du test texte exige
la réponse attendue `TEST IA OK` (après normalisation de ponctuation/emoji) ;
celui du test outil exige à la fois un appel réussi à `list_files` et la réponse
finale `TEST OUTIL OK`; chaque test rack exige l'appel réussi et son marqueur.
Une sortie non vide qui révèle un raisonnement interne est signalée comme échec.
Le script relève `/api/ps` avant et après les requêtes; la liste initiale peut
être vide juste après redémarrage, car les modèles se chargent à la demande.

Le chat transmet explicitement l’option de raisonnement Ollama. Elle est
activée par défaut et peut être désactivée dans l’interface. La température est
fixée automatiquement à 0,6 avec raisonnement et 0,7 sans. Le contexte est de
8 192 tokens et le budget de sortie initial de 2 048; le plafond serveur est de
8 192 tokens.

Le rapport JSON n’affiche ni le jeton d’accès ni les conversations de
l’utilisateur. Les essais utilisent les marqueurs `TEST IA OK`,
`TEST OUTIL OK`, `TEST RACK MODELES OK`, `TEST RACK VEILLE OK` et
`TEST RACK QUANT OK`, l’inventaire des noms dans `src` et les capacités rack.
Aucun contenu de fichier n’est lu. Le test peut
attendre jusqu’à trois minutes la réponse locale de chaque modèle avec un
budget par défaut de 2 048 tokens, afin de laisser le temps au raisonnement.
Un code de sortie non nul signale une vérification en échec.

Pour ne tester qu’un modèle précis ou choisir une autre adresse locale :

```bash
SUPERIA_TEST_MODEL='nom-du-modele' npm run diagnose:chat
SUPERIA_URL='http://127.0.0.1:3210' OLLAMA_URL='http://127.0.0.1:11434' npm run diagnose:chat
SUPERIA_TEST_MAX_TOKENS=2048 npm run diagnose:chat
SUPERIA_TEST_THINK=0 npm run diagnose:chat
```

Ce diagnostic ne redémarre aucun service et n’exécute aucune commande fournie
par le modèle.

## Si le chat semble ne pas répondre

Le chat local ouvre maintenant son flux dès le début de l’inférence et affiche
« Le modèle local prépare sa réponse… ». Une attente de plus de trois minutes
est interrompue et renvoyée comme erreur au lieu de laisser le navigateur
attendre indéfiniment. L’outil de diagnostic exige aussi la réponse attendue :
`allAnswered: false` signifie que le texte n’est pas exactement le résultat du
test, pas nécessairement qu’Ollama n’a renvoyé aucun texte. Pour identifier le
cas précis, conserver dans la sortie le modèle, `answer`, `expected`,
`exactMatch`, `errors` et `eventTypes`.

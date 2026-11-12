# Optimisation des IA locales

Date de revue : 12 novembre 2026  
Périmètre : deux modèles Qwen3 8B Q4_K_M servis par Ollama et consommés par le
chat web Super IA.

## Résultats comparatifs du 12 novembre

Le diagnostic exécuté par l’utilisateur confirme que les deux modèles
répondent et appellent l’outil `list_files` par le chat Super IA. Mesures du
12 novembre, budget de 1 024 tokens :

| Modèle | Thinking | Texte (temps, tokens/s) | Outil (temps, tokens/s) | Exact |
| --- | --- | --- | --- | --- |
| Abliterated Qwen3 8B | oui, T=0,6 | 6,05 s, 16,19 | 3,51 s, 30,48 | oui |
| `qwen3:8b` | oui, T=0,6 | 7,46 s, 22,11 | 5,90 s, 23,58 | oui |
| Abliterated Qwen3 8B | non, T=0,7 | 6,57 s, 17,96 | 3,20 s, 29,06 | **non** |
| `qwen3:8b` | non, T=0,7 | 4,92 s, 0,81* | 0,50 s, 10,08* | oui |

Tests fournis par l’utilisateur, 1 024 tokens maximum. En mode thinking, les
deux modèles répondent au format attendu et exécutent l’outil. En mode non-
thinking, `qwen3:8b` passe les deux contrôles courts ; le modèle Abliterated
renvoie un brouillon de raisonnement en anglais au lieu de la réponse demandée,
même après avoir exécuté l’outil. Il ne faut donc pas sélectionner le mode sans
raisonnement pour ce modèle avant d’avoir vérifié de vrais cas d’usage. Le
diagnostic a été durci : il exige maintenant la réponse exacte normalisée, et
un appel outil seul ne suffit plus à déclarer le test réussi.

* Les débits des deux requêtes `qwen3:8b` sans thinking sont peu représentatifs
  (4 et 5 tokens générés) ; le chronométrage inclut aussi la latence de requête.
  Répéter avec des réponses plus longues pour comparer la vitesse de génération.

Le rapport `/api/ps` montre `qwen3:8b` entièrement en VRAM (5,77 GiB / 5,77
GiB), avec un contexte runtime de 8 192 tokens. C’est une bonne base pour les
réglages actuels ; rien dans ces mesures ne justifie d’augmenter le contexte.

Les métadonnées Ollama annoncent pour les deux modèles environ 8,2 milliards
de paramètres, une quantification `Q4_K_M`, une taille disque de 5,0 à 5,2 Go
et une longueur de contexte déclarée de 40 960 tokens. Le journal système
fourni plus tôt rapporte jusqu’à 8,8 Go employés par Ollama, avec 1,1 Go
disponible à cet instant. Ces chiffres justifient de mesurer la mémoire et le
placement matériel avant d’augmenter le contexte ou de garder plusieurs
modèles chargés.

La session de développement n’a pas pu interroger le bus systemd, l’API locale
Ollama ni son GPU. Son `nvidia-smi` ne voit pas de pilote, ce qui ne prouve pas
l’absence de GPU sur le système hôte. Le diagnostic `npm run diagnose:chat`
interroge maintenant `/api/ps` et rapporte la mémoire du modèle chargé, la VRAM
et le contexte réel ; cette information doit guider les prochains réglages.

## Profil d’échantillonnage Qwen3

La documentation Qwen recommande pour ses modèles Qwen3 :

| Mode | Température | `top_p` | `top_k` | `min_p` |
| --- | ---: | ---: | ---: | ---: |
| Raisonnement activé | 0,6 | 0,95 | 20 | 0 |
| Raisonnement désactivé | 0,7 | 0,8 | 20 | 0 |

Le chat Super IA applique `top_p`, `top_k` et `min_p` selon le mode de
raisonnement. La température n'est plus un réglage manuel de l'interface : le
serveur choisit 0,6 avec raisonnement et 0,7 sans. Les préférences gardent le
modèle, le mode de raisonnement et le budget de sortie. Les paramètres Qwen ne
s'appliquent qu'aux identifiants `qwen3`; les autres familles ne reçoivent pas
les paramètres top-k/top-p spécifiques.

Le chat fixe aussi `num_ctx` à 8 192 tokens, cohérent avec la taille de slot
Ollama observée dans les journaux fournis auparavant. Le modèle annonce un
contexte théorique plus grand, mais le pousser à 40 960 pourrait augmenter
fortement la mémoire de cache et réduire la vitesse sur cette machine. Le
plafond de sortie reste 8 192, avec une valeur initiale de 2 048 et un plancher
UI de 1 024.

## Leviers d’optimisation

### Qualité

- Utiliser le raisonnement pour la logique, le code, les tâches multi-étapes et
  l’usage d’outils ; le désactiver pour une question simple où la latence compte.
- Évaluer les sorties sur des tâches réelles : traduction fidèle d’article,
  résumé sourcé, recherche Obsidian, modification proposée et appel d’outil.
- Noter séparément exactitude, respect des consignes, qualité des sources,
  réussite des outils, répétitions et texte superflu.
- Comparer le modèle standard et l’abliterated sur la même grille. Le nom
  « Abliterated » ne constitue pas une mesure de qualité ni de fiabilité.
- Ne pas utiliser la température zéro comme réglage général : le diagnostic
  fonctionnel n’est pas un benchmark de qualité. Qwen avertit que le décodage
  glouton peut dégrader certains résultats et provoquer des répétitions.

### Vitesse

- Mesurer les tokens/s de sortie et le temps total sur le même matériel,
  modèle chaud puis modèle froid.
- Mesurer `/api/ps` avant et après un changement de modèle pour voir si Ollama
  garde simultanément les deux modèles et s’ils tiennent en RAM/VRAM.
- Ne pas augmenter automatiquement le contexte : il réserve davantage de
  mémoire et n’accélère pas la génération.
- Garder le raisonnement désactivable pour les échanges simples de `qwen3:8b` ;
  pour Abliterated, le laisser activé tant que les essais sans thinking
  produisent un brouillon interne.
- Pour réduire le délai du premier token, mesurer d’abord le chargement à froid
  et le maintien en mémoire. Ollama garde par défaut un modèle en mémoire cinq
  minutes ; conserver deux modèles plus longtemps peut accroître la pression
  mémoire.

### Qualité de contexte

- Le contexte annoncé dans `/api/tags` ne donne pas le contexte réellement
  alloué au runtime ; lire `/api/ps`.
- Éviter d’envoyer tout l’historique ou un coffre entier. Le chat garde un
  historique borné, et Obsidian n’ajoute que les extraits sélectionnés quand
  l’option est active.
- Laisser de la place dans la fenêtre pour les consignes système, les schémas
  d’outils, les sources et la réponse générée.
- Quand le modèle répond mal avec un grand historique, comparer sur un fil
  neuf avant de modifier le modèle ou sa quantification.

## Méthode d’essai recommandée

1. Lancer `npm run diagnose:chat` : chaque modèle passe le test du marqueur
   texte, l'outil workspace `list_files` et le nouvel outil rack
   `mother_list_models`. Le rapport mesure aussi `/api/ps` avant et après les
   requêtes : la liste vide juste après redémarrage est normale tant qu'aucun
   modèle n'a encore été appelé.
2. Lancer le même diagnostic avec raisonnement désactivé :

   ```bash
   SUPERIA_TEST_THINK=0 npm run diagnose:chat
   ```

3. Comparer thinking activé/désactivé sans changer le prompt, le contexte ni le
   matériel. Le serveur choisit automatiquement la température du profil Qwen3.
4. Répéter chaque mesure au moins trois fois. Noter première requête froide et
   requêtes chaudes séparément.
5. Utiliser un petit jeu de tâches représentatif des usages Azoth et comparer
   les résultats à l’aveugle avant de choisir un modèle par défaut.
6. N’augmenter `num_ctx`, le nombre de modèles résidents ou la taille de sortie
   qu’après avoir vérifié `/api/ps`, la RAM disponible, la VRAM et le swap.

Une optimisation est acceptée seulement si elle améliore au moins un objectif
mesuré (qualité, latence ou mémoire) sans faire baisser les autres sous le
seuil convenu.

## Sources primaires

- [Qwen3 : recommandations de sampling et modes thinking/non-thinking](https://github.com/QwenLM/Qwen3/blob/main/docs/source/getting_started/quickstart.md)
- [Ollama : taille de contexte](https://docs.ollama.com/faq#how-can-i-specify-the-context-window-size)
- [Ollama : modèles chargés, mémoire et VRAM (`/api/ps`)](https://docs.ollama.com/api/ps)
- [Ollama : identifier CPU/GPU avec `ollama ps` et durée de maintien en mémoire](https://docs.ollama.com/faq)
- [Ollama : paramètres du Modelfile](https://docs.ollama.com/modelfile)

# Étude des agents et outils existants

L'objectif n'est pas de recopier un projet complet. Il est d'identifier les mécanismes éprouvés à intégrer dans un noyau plus léger.

## Aider

**À récupérer :**

- cartographie du dépôt pour limiter le contexte ;
- intégration Git native avec commits et retour arrière ;
- lancement automatique des linters et tests ;
- compatibilité avec de nombreux modèles distants ou locaux ;
- workflow copier/coller avec les interfaces web ;
- modifications chirurgicales plutôt qu'un dépôt entier envoyé à chaque tour.

**Décision :** Aider est un excellent backend optionnel et une grande source d'idées pour le constructeur de contexte. Son `repo map` doit inspirer notre index, mais la mission, la mémoire et les permissions restent gérées par Super IA.

Source : https://github.com/Aider-AI/aider

## OpenCode

**À récupérer :**

- séparation nette entre agent `plan` en lecture seule et agent `build` ;
- sous-agent généraliste pour les recherches complexes ;
- interface terminal claire ;
- architecture ouverte et multi-fournisseurs.

**Décision :** candidat sérieux comme backend d'exécution. Super IA ne doit toutefois pas dépendre de son interface ni du format interne de ses sessions.

Source : https://github.com/anomalyco/opencode

## mini-SWE-agent

**À récupérer :**

- boucle d'agent minimale ;
- historique linéaire facile à auditer ;
- commandes indépendantes via sous-processus plutôt qu'un shell opaque permanent ;
- bash comme interface universelle ;
- sandbox interchangeable : local, Docker, Podman, bubblewrap ou autre ;
- trajectoire complète conservée pour analyse.

**Décision :** c'est probablement la meilleure inspiration pour notre moteur minimal sur Pi 5. Super IA doit garder un orchestrateur simple et observable, puis laisser la qualité venir du modèle et du contexte.

Source : https://github.com/SWE-agent/mini-swe-agent

## OpenHands Agent Canvas

**À récupérer :**

- centre de contrôle auto-hébergé ;
- séparation entre interface, serveurs d'agents et environnements d'exécution ;
- capacité à connecter plusieurs backends locaux, distants ou cloud ;
- automatisations et intégration GitHub ;
- compatibilité ACP.

**À éviter dans le noyau Pi 5 :**

- reproduire immédiatement une plateforme complète avec plusieurs services lourds ;
- donner un accès intégral au système de fichiers sans sandbox ;
- introduire un frontend complexe avant que l'exécution et la reprise soient fiables.

**Décision :** référence architecturale et backend optionnel futur, pas dépendance centrale du MVP.

Source : https://github.com/OpenHands/OpenHands

## GitHub Spec Kit

**À récupérer :**

- constitution durable du projet ;
- séparation `spécification → plan → tâches → implémentation` ;
- artefacts versionnés au lieu de décisions enfermées dans un chat ;
- compatibilité avec plusieurs agents ;
- convergence entre état réel et spécification.

**Décision :** intégrer un workflow inspiré de Spec Kit dans chaque mission importante. Une mission doit pouvoir pointer vers sa spécification et son plan.

Source : https://github.com/github/spec-kit

## Repomix

**À récupérer :**

- sélection Git-aware des fichiers ;
- comptage des tokens ;
- formats lisibles par les modèles ;
- détection de secrets ;
- compression structurelle via Tree-sitter ;
- inclusion optionnelle de l'historique Git ;
- génération depuis une liste de fichiers ciblée.

**Décision :** intégration optionnelle rapide pour les paquets de contexte, puis implémentation native progressive des fonctions essentielles.

Source : https://github.com/yamadashy/repomix

## Pochi

**À récupérer :**

- Bring Your Own Model ;
- agents parallèles dans des worktrees séparés ;
- tâches visibles depuis l'éditeur ;
- exécution de commandes et refactors multi-fichiers.

**Décision :** confirmer notre choix des worktrees par mission et étudier son protocole de séparation des tâches.

Source : https://github.com/TabbyML/pochi

## Tabby

**À récupérer :**

- indexation de dépôt ;
- autocomplétion et contexte IDE ;
- serveur autonome sans DBMS externe ;
- API ouverte et hébergement privé.

**Limite Pi 5 :** Tabby vise surtout une expérience d'inférence permanente, souvent accélérée par GPU. Il peut être étudié comme service distant ou sur une machine plus puissante, mais ne doit pas alourdir le cœur du Pi.

Source : https://github.com/TabbyML/tabby

## llama.cpp

**À récupérer :**

- moteur d'inférence compact en C/C++ ;
- support ARM64 ;
- serveur HTTP local ;
- formats GGUF quantifiés ;
- exécution CPU sans service cloud obligatoire.

**Décision :** moteur local de référence pour les modèles utilitaires légers sur Pi 5.

Source : https://github.com/ggml-org/llama.cpp

## Ollama

**À récupérer :**

- installation ARM64 officielle ;
- gestion simple des modèles ;
- service local permanent ;
- API locale facile à connecter aux outils compatibles.

**Décision :** première option conviviale pour tester les modèles locaux. llama.cpp restera le moteur plus fin et contrôlable.

Source : https://github.com/ollama/ollama

## LocalAI

**À récupérer :**

- API locale compatible avec les formats courants ;
- moteur multi-modal et multi-backends ;
- déploiement CPU possible ;
- rôle de passerelle locale.

**Décision :** option future lorsque Super IA devra exposer plusieurs capacités locales derrière une API commune. Pour le MVP, Ollama ou llama.cpp sont plus simples.

Source : https://github.com/mudler/LocalAI

## Synthèse d'intégration

| Projet | Usage dans Super IA | Priorité |
|---|---|---:|
| mini-SWE-agent | boucle d'exécution minimaliste et trajectoires | très haute |
| Aider | cartographie dépôt, Git, tests, pont web | très haute |
| Repomix | génération de contexte et détection de secrets | haute |
| Spec Kit | spécification et plan durables | haute |
| OpenCode | backend multi-modèles et modes plan/build | haute |
| Pochi | parallélisme par worktree | moyenne |
| OpenHands | backend et protocole multi-agent futur | moyenne |
| Ollama / llama.cpp | inférence locale utilitaire | haute |
| Tabby | autocomplétion auto-hébergée optionnelle | basse sur Pi |
| LocalAI | passerelle locale élargie | future |

# Feuille de route Super IA

Version courante : **0.14.0**  
Registre logiciel : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json)  
Registre machine : [`MACHINE_TRACKER.json`](MACHINE_TRACKER.json)  
Vue de travail : [`TASK_TRACKER.md`](TASK_TRACKER.md)

## Livré

- plan de contrôle SQLite WAL multi-projets ;
- scanner Git, missions et worktrees ;
- contexte ciblé avec SHA-256 et barrière anti-secrets ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- adaptateurs Codex et Mistral Vibe ;
- Gitleaks et Bubblewrap ;
- périmètre Git, chemins critiques et limites de diff ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- checkpoints, reprise et retries bornés ;
- receipts et sauvegardes vérifiables ;
- daemon, service Pi et consoles Matrix ;
- profils de toolchain Core, Standard et Full ;
- installation rootless des CLI ;
- Node et Gitleaks vérifiés par SHA-256 ;
- Connection Matrix universelle ;
- registre privé de connexions sans valeur de secret ;
- migration additive du catalogue ;
- détection des coffres de secrets.

## V0.14 — maîtrise des agents

- [x] correction explicite avec `--retry` ;
- [x] review précédente injectée au builder ;
- [x] plafonds d'essais et de prix immuables ;
- [x] empreinte de chaque patch ;
- [x] boucle de patch identique détectée ;
- [x] chemins critiques toujours interdits ;
- [x] 50 fichiers et 1 Mo maximum par défaut ;
- [x] aucune fusion automatique.

## Préparation machine — prête dans Git

- [x] profil Core ;
- [x] profil Standard recommandé pour le Pi ;
- [x] profil Full de laboratoire ;
- [x] dépendances système Debian/Ubuntu explicites ;
- [x] installation utilisateur dans `~/.local` ;
- [x] uv et outils Python isolés ;
- [x] dry-run non destructif ;
- [x] contrôle CI anti-`curl|sh` ;
- [x] rapport privé de toolchain ;
- [x] aucun modèle local installé ;
- [x] aucune clé créée ou copiée.

## Connexions universelles — registre livré

- [x] sessions CLI ;
- [x] APIs officielles ;
- [x] endpoints compatibles OpenAI ;
- [x] identités cloud Azure, AWS et Google ;
- [x] GitHub Models, Hugging Face et Together ;
- [x] MCP stdio et HTTP ;
- [x] ACP ;
- [x] A2A ;
- [x] worker SSH ;
- [x] web assisté ;
- [x] endpoints locaux expérimentaux désactivés ;
- [x] toutes les connexions désactivées par défaut ;
- [x] stockage `0600` ;
- [x] diagnostic sans réseau et sans secret ;
- [x] migration additive sans écraser les choix.

## V0.15 — validation Raspberry Pi

- [ ] installer le profil Standard ;
- [ ] exécuter `connection init` et la Connection Matrix ;
- [ ] choisir Age ou credentials systemd pour le Pi ;
- [ ] valider Bubblewrap sur le noyau ;
- [ ] vérifier le service après déconnexion ;
- [ ] tester coupure et reprise ;
- [ ] tester sauvegarde et restauration ;
- [ ] authentifier Codex et Vibe ;
- [ ] produire un pipeline réel et ses receipts ;
- [ ] tester Restic hors machine.

## V0.16 — protocoles et orchestration

- [ ] test borné des APIs activées ;
- [ ] authentification cloud Azure/AWS/Google ;
- [ ] serveur MCP en lecture seule ;
- [ ] client ACP générique ;
- [ ] worker A2A ;
- [ ] worker SSH contrôlé ;
- [ ] DAG avec détection de cycles ;
- [ ] conflits de fichiers ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] arrêt d'urgence global ;
- [ ] interface web locale ;
- [ ] notifications.

## Publication stable

La PR passe en prête pour revue uniquement lorsque :

- [ ] le Pi réel est validé ;
- [ ] la restauration est prouvée ;
- [ ] Bubblewrap fonctionne sur le noyau cible ;
- [ ] Codex et Vibe réels produisent des receipts valides ;
- [ ] le coffre de secrets du Pi est choisi et restaurable ;
- [x] Gitleaks est obligatoire ;
- [x] les modifications hors périmètre sont bloquées ;
- [x] les corrections sont bornées ;
- [x] l'installation ne pipe aucun téléchargement dans un shell ;
- [x] aucune connexion ou dépense n'est activée automatiquement ;
- [ ] une revue humaine autorise la fusion.

## Hors périmètre par défaut

- modèle IA local obligatoire ;
- poids de modèle dans le kit Pi ;
- Kubernetes, Redis ou PostgreSQL dans le MVP ;
- fusion automatique ;
- clé API dans Git ou dans les arguments de processus ;
- navigateur automatisé ;
- contournement de quotas ;
- conversation libre infinie entre agents.

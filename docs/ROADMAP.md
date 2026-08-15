# Feuille de route Super IA

Version courante : **0.17.0**  
Registre logiciel : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json)  
Registre machine : [`MACHINE_TRACKER.json`](MACHINE_TRACKER.json)  
Vue de travail : [`TASK_TRACKER.md`](TASK_TRACKER.md)

## Livré

- plan de contrôle SQLite WAL multi-projets ;
- scanner Git, missions, DAG et worktrees ;
- contexte ciblé avec SHA-256 et barrière anti-secrets ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- adaptateurs Codex et Mistral Vibe ;
- budgets explicites et retries bornés ;
- Gitleaks et Bubblewrap ;
- masquage des fichiers privés du worktree ;
- périmètre Git, chemins critiques et limites de diff ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- checkpoints, reprise et détection de boucle ;
- receipts et sauvegardes vérifiables ;
- daemon, service Pi et console Matrix ;
- interface web locale authentifiée et en lecture seule ;
- notifications locales expurgées et dédupliquées ;
- profils de toolchain Core, Standard et Full ;
- installation rootless des CLI ;
- Node et Gitleaks vérifiés par SHA-256 ;
- Connection Matrix universelle ;
- registre privé de connexions sans valeur de secret ;
- politique anti-SSRF et sondes réseau opt-in ;
- rapport `readiness` hors ligne ;
- plans Restic non destructifs.

## V0.17 — contrôle local complet dans Git

- [x] DAG avec détection de cycles ;
- [x] readiness hors ligne ;
- [x] interface web locale ;
- [x] authentification locale et écoute loopback ;
- [x] notifications de fin et interruption de run ;
- [x] notifications de missions bloquées ;
- [x] reçus privés et dédupliqués ;
- [x] aucun prompt, payload ou secret dans les messages ;
- [x] intégration au daemon ;
- [x] affichage web en lecture seule ;
- [x] 83 tests réussis en CI ;
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

## Prochaine phase — validation Raspberry Pi

- [ ] installer la v0.17 avec le profil Standard ;
- [ ] exécuter `connection init` et la Connection Matrix ;
- [ ] choisir Age, keyring ou credentials systemd pour le Pi ;
- [ ] valider Bubblewrap sur le noyau ;
- [ ] vérifier le service après déconnexion ;
- [ ] vérifier l’interface web sur le Pi et mobile ;
- [ ] vérifier les notifications après redémarrage ;
- [ ] tester coupure et reprise sans doublon de notification ;
- [ ] tester sauvegarde et restauration ;
- [ ] authentifier Codex et Vibe ;
- [ ] produire un pipeline réel et ses receipts ;
- [ ] tester Restic hors machine.

## Après validation matérielle

- [ ] test borné des APIs activées ;
- [ ] authentification cloud Azure/AWS/Google ;
- [ ] serveur MCP en lecture seule ;
- [ ] client ACP générique ;
- [ ] worker A2A ;
- [ ] worker SSH contrôlé ;
- [ ] détection préventive des conflits de fichiers entre missions ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] arrêt d’urgence global ;
- [ ] rétention des reçus de notifications ;
- [ ] canal distant optionnel, explicitement configuré et sans secret.

## Publication stable

La fusion vers `main` reste bloquée tant que les preuves suivantes manquent :

- [ ] Pi réel validé ;
- [ ] restauration prouvée ;
- [ ] Bubblewrap fonctionnel sur le noyau cible ;
- [ ] Codex et Vibe réels avec receipts valides ;
- [ ] coffre de secrets choisi et restaurable ;
- [ ] service et notifications validés après déconnexion ;
- [x] Gitleaks obligatoire ;
- [x] modifications hors périmètre bloquées ;
- [x] corrections bornées ;
- [x] installation sans téléchargement pipé vers un shell ;
- [x] aucune connexion ou dépense activée automatiquement ;
- [ ] revue humaine finale autorisant la fusion.

## Hors périmètre par défaut

- modèle IA local obligatoire ;
- poids de modèle dans le kit Pi ;
- Kubernetes, Redis ou PostgreSQL dans le MVP ;
- fusion automatique ;
- clé API dans Git ou dans les arguments de processus ;
- navigateur automatisé ;
- canal de notification réseau activé par défaut ;
- contournement de quotas ;
- conversation libre infinie entre agents.

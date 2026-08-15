# Feuille de route Super IA

Version courante : **0.18.0**  
Registre logiciel : [`ROADMAP_TRACKER.json`](ROADMAP_TRACKER.json)  
Registre machine : [`MACHINE_TRACKER.json`](MACHINE_TRACKER.json)  
Vue de travail : [`TASK_TRACKER.md`](TASK_TRACKER.md)

## Livré

- plan de contrôle SQLite WAL multi-projets ;
- scanner Git, missions, DAG et worktrees ;
- contexte ciblé avec SHA-256 et barrière anti-secrets ;
- runner avec logs, heartbeat, timeout et arrêt des descendants ;
- Codex et Mistral Vibe contrôlés ;
- budgets explicites et retries bornés ;
- Gitleaks et Bubblewrap ;
- masquage des fichiers privés ;
- garde Git et limites de diff ;
- reviewer indépendant ;
- pipeline builder → validation → review → receipt ;
- checkpoints, reprise et détection de boucle ;
- receipts et sauvegardes vérifiables ;
- daemon, service Pi et console Matrix ;
- interface web locale authentifiée et en lecture seule ;
- notifications locales expurgées et dédupliquées ;
- arrêt d’urgence global et audité ;
- sauvegarde de l’état safety et des réglages de notifications ;
- profils de toolchain Core, Standard et Full ;
- Connection Matrix universelle ;
- politique anti-SSRF et sondes réseau opt-in ;
- rapport `readiness` hors ligne ;
- plans Restic non destructifs.

## V0.18 — sécurité opérationnelle

- [x] état d’arrêt privé en `0600` ;
- [x] état invalide conservé et bloquant ;
- [x] Codex, Vibe, pipelines et runs manuels bloqués ;
- [x] diagnostics et dry-runs toujours disponibles ;
- [x] PID, heartbeat et groupe de processus vérifiés ;
- [x] `SIGTERM` puis `SIGKILL` ;
- [x] test avec un vrai processus résistant ;
- [x] audit événementiel expurgé ;
- [x] visibilité readiness et web ;
- [x] aucune commande safety depuis le web ;
- [x] état safety inclus dans les sauvegardes ;
- [x] 89 tests réussis sur le lot fonctionnel ;
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

## Prochaine phase — validation Raspberry Pi

- [ ] installer la v0.18 avec le profil Standard ;
- [ ] choisir le `SUPERIA_HOME` définitif sur NVMe ;
- [ ] valider Bubblewrap sur le noyau ;
- [ ] vérifier le service après déconnexion ;
- [ ] tester l’arrêt d’urgence avec un run géré ;
- [ ] vérifier l’interface web sur le Pi et mobile ;
- [ ] vérifier les notifications après redémarrage ;
- [ ] tester coupure et reprise sans doublon ;
- [ ] restaurer une sauvegarde sur copie ;
- [ ] authentifier Codex et Vibe ;
- [ ] produire un pipeline réel et ses receipts ;
- [ ] tester Restic hors machine.

## Après validation matérielle

- [ ] tests bornés des APIs activées ;
- [ ] authentification cloud Azure/AWS/Google ;
- [ ] serveur MCP en lecture seule ;
- [ ] client ACP générique ;
- [ ] worker A2A ;
- [ ] worker SSH contrôlé ;
- [ ] détection préventive des conflits de fichiers ;
- [ ] routeur coût/capacité/qualité mesurée ;
- [ ] rétention des reçus de notifications ;
- [ ] canal distant optionnel et explicitement configuré.

## Publication stable

La fusion vers `main` reste bloquée tant que :

- [ ] le Pi réel n’est pas validé ;
- [ ] la restauration n’est pas prouvée ;
- [ ] Bubblewrap n’est pas fonctionnel sur le noyau cible ;
- [ ] l’arrêt d’urgence n’est pas validé sous systemd ;
- [ ] Codex et Vibe réels n’ont pas produit de receipts valides ;
- [ ] le coffre de secrets n’est pas choisi et restaurable ;
- [x] Gitleaks est obligatoire ;
- [x] les modifications hors périmètre sont bloquées ;
- [x] les corrections sont bornées ;
- [x] l’installation ne pipe aucun téléchargement vers un shell ;
- [x] aucune connexion ou dépense n’est activée automatiquement ;
- [ ] une revue humaine finale n’a pas autorisé la fusion.

## Hors périmètre par défaut

- modèle IA local obligatoire ;
- poids de modèle dans le kit Pi ;
- Kubernetes, Redis ou PostgreSQL dans le MVP ;
- fusion automatique ;
- clé API dans Git ou dans les arguments ;
- navigateur automatisé ;
- canal de notification réseau activé par défaut ;
- arrêt complet du réseau ou de la machine ;
- contournement de quotas ;
- conversation libre infinie entre agents.

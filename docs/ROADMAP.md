# Feuille de route Super IA

Version courante : **0.19.0**  
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
- restauration atomique vers une nouvelle cible ;
- drill de reprise hors ligne ;
- daemon, service Pi et console Matrix ;
- interface web locale authentifiée et en lecture seule ;
- notifications locales expurgées et dédupliquées ;
- arrêt d’urgence global et audité ;
- sauvegarde de l’état safety et des réglages de notifications ;
- profils de toolchain Core, Standard et Full ;
- préflight Pi/HDD/SSD/NVMe/SSH en lecture seule ;
- Connection Matrix universelle ;
- politique anti-SSRF et sondes réseau opt-in ;
- rapport `readiness` hors ligne ;
- routeur de fournisseurs explicable hors ligne ;
- plans Restic non destructifs.

## V0.19 — reprise et préparation matérielle

- [x] restauration uniquement vers une cible absente ;
- [x] manifeste limité aux fichiers attendus ;
- [x] tailles et SHA-256 vérifiés ;
- [x] copie binaire ;
- [x] `PRAGMA integrity_check` ;
- [x] validation ligne par ligne du JSONL ;
- [x] restauration de safety et notifications ;
- [x] écriture temporaire et renommage atomique ;
- [x] reçu de restauration en `0600` ;
- [x] drill comparant projets, missions, runs, événements et journal ;
- [x] préflight détectant SD, USB/HDD/SSD, NVMe et environnement virtuel ;
- [x] vérification SSH, Node, outils, systemd utilisateur et linger ;
- [x] routeur statique selon capacités, disponibilité, coût et préférences ;
- [x] recommandation séparée de l’autorisation `readiness` ;
- [x] **95 tests réussis, 0 échec** ;
- [x] aucune dépendance runtime supplémentaire ;
- [x] aucune fusion automatique.

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
- [x] état safety inclus dans les sauvegardes.

## Préparation machine — prête dans Git

- [x] profil Core ;
- [x] profil Standard recommandé pour le Pi ;
- [x] profil Full de laboratoire ;
- [x] dépendances système Debian/Ubuntu explicites ;
- [x] installation utilisateur dans `~/.local` ;
- [x] uv et outils Python isolés ;
- [x] dry-run non destructif ;
- [x] préflight matériel et SSH sans modification ;
- [x] contrôle CI anti-`curl|sh` ;
- [x] rapport privé de toolchain ;
- [x] aucun modèle local installé ;
- [x] aucune clé créée ou copiée.

## Prochaine phase — validation Raspberry Pi

Ordre matériel :

1. [ ] démarrer sur SD ;
2. [ ] installer ou migrer le système vers HDD/SSD ou NVMe ;
3. [ ] confirmer avec `findmnt /` la racine sur le bon support ;
4. [ ] activer et tester SSH ;
5. [ ] exécuter `install/pi/preflight.sh --strict` ;
6. [ ] installer la v0.19 avec le profil Standard ;
7. [ ] choisir le `SUPERIA_HOME` définitif sur le stockage persistant ;
8. [ ] valider Bubblewrap sur le noyau ;
9. [ ] vérifier le service après déconnexion ;
10. [ ] exécuter `superia backup drill` ;
11. [ ] restaurer une sauvegarde sur une copie du stockage réel ;
12. [ ] tester l’arrêt d’urgence avec un run géré ;
13. [ ] vérifier l’interface web sur le Pi et mobile ;
14. [ ] vérifier les notifications après redémarrage ;
15. [ ] tester coupure et reprise sans doublon ;
16. [ ] authentifier Codex et Vibe ;
17. [ ] produire un pipeline réel et ses receipts ;
18. [ ] tester Restic hors machine.

## Après validation matérielle

- [ ] tests bornés des APIs activées ;
- [ ] authentification cloud Azure/AWS/Google ;
- [ ] serveur MCP en lecture seule ;
- [ ] client ACP générique ;
- [ ] worker A2A ;
- [ ] worker SSH contrôlé ;
- [ ] détection préventive des conflits de fichiers ;
- [ ] collecte locale des mesures de benchmark ;
- [ ] routeur enrichi par coût, qualité et latence mesurés ;
- [ ] fallback réel contrôlé ;
- [ ] rétention des reçus de notifications ;
- [ ] canal distant optionnel et explicitement configuré.

## Publication stable

La fusion vers `main` reste bloquée tant que :

- [ ] le Pi réel n’est pas validé ;
- [ ] la restauration locale et hors machine n’est pas prouvée ;
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
- partitionnement, formatage ou clonage automatique de disque ;
- fusion automatique ;
- clé API dans Git ou dans les arguments ;
- navigateur automatisé ;
- canal de notification réseau activé par défaut ;
- arrêt complet du réseau ou de la machine ;
- contournement de quotas ;
- conversation libre infinie entre agents.

# Feuille de route Super IA

Version courante : **0.20.0**  
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
- Gitleaks, Bubblewrap et masquage des fichiers privés ;
- garde Git, reviewer indépendant et pipeline complet ;
- checkpoints, reprise, détection de boucle et receipts ;
- arrêt d’urgence global ;
- interface web locale et notifications privées ;
- Connection Matrix, anti-SSRF et readiness hors ligne ;
- sauvegarde, restauration atomique et drill de reprise ;
- préflight SD/HDD/SSD/NVMe/SSH ;
- routeur explicable ;
- registre privé de benchmarks et influence mesurée bornée ;
- sauvegarde et restauration des benchmarks ;
- plans Restic non destructifs ;
- daemon et service Pi.

## V0.20 — routeur mesuré et mémoire privée

- [x] registre `SUPERIA_HOME/providers/benchmarks.json` en `0600` ;
- [x] écriture atomique ;
- [x] schéma strict et fournisseurs connus uniquement ;
- [x] aucun champ libre pour prompt, code, réponse ou secret ;
- [x] valeurs et volume bornés ;
- [x] fichier invalide conservé et refus des nouvelles écritures ;
- [x] commandes `benchmark record`, `list` et `summary` ;
- [x] taux de succès, durée médiane, coût moyen et qualité optionnelle ;
- [x] trois échantillons minimum avant influence ;
- [x] score mesuré borné de -40 à +45 ;
- [x] mesures incapables de contourner capacités, budget, API, readiness ou safety ;
- [x] benchmarks inclus dans sauvegarde, restauration et drill ;
- [x] test de descendant rendu déterministe avec attente bornée ;
- [x] **103 tests réussis, 0 échec** ;
- [x] aucune dépendance runtime supplémentaire ;
- [x] aucune fusion automatique.

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
- [x] drill comparant les données durables ;
- [x] préflight matériel et SSH en lecture seule ;
- [x] routeur statique explicable ;
- [x] recommandation séparée de l’autorisation `readiness`.

## Préparation machine — prête dans Git

- [x] profils Core, Standard et Full ;
- [x] dépendances système explicites ;
- [x] installation utilisateur dans `~/.local` ;
- [x] uv et outils Python isolés ;
- [x] dry-runs non destructifs ;
- [x] préflight matériel et SSH ;
- [x] contrôles anti-`curl|sh` et anti-`sudo` caché ;
- [x] aucun modèle local ;
- [x] aucune clé créée ou copiée.

## Prochaine phase — validation Raspberry Pi

1. [ ] démarrer sur SD ;
2. [ ] installer ou migrer vers HDD/SSD ou NVMe ;
3. [ ] confirmer la racine avec `findmnt /` ;
4. [ ] activer et tester SSH ;
5. [ ] exécuter `install/pi/preflight.sh --strict` ;
6. [ ] installer la v0.20 avec le profil Standard ;
7. [ ] choisir le `SUPERIA_HOME` définitif ;
8. [ ] valider Bubblewrap ;
9. [ ] vérifier le service après déconnexion ;
10. [ ] exécuter le drill et restaurer une copie ;
11. [ ] tester l’arrêt d’urgence avec un run géré ;
12. [ ] vérifier web et notifications ;
13. [ ] tester coupure et reprise ;
14. [ ] authentifier Codex et Vibe ;
15. [ ] produire un pipeline réel ;
16. [ ] tester Restic hors machine ;
17. [ ] définir un corpus et une grille de qualité ;
18. [ ] enregistrer au moins trois mesures par fournisseur et par mode ;
19. [ ] vérifier le fallback du routeur.

## Après validation matérielle

- [ ] APIs activées avec tests bornés ;
- [ ] identités cloud ;
- [ ] MCP en lecture seule ;
- [ ] client ACP ;
- [ ] worker A2A ;
- [ ] worker SSH contrôlé ;
- [ ] détection préventive des conflits ;
- [ ] import automatique de mesures depuis les receipts ;
- [ ] fallback réel contrôlé ;
- [ ] rétention des reçus de notifications ;
- [ ] canal distant optionnel explicitement configuré.

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
- notification réseau activée par défaut ;
- arrêt complet du réseau ou de la machine ;
- contournement de quotas ;
- conversation libre infinie entre agents.

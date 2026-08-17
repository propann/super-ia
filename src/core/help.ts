export function printHelp(): void {
  console.log(`Super IA v0.20.0

Usage:
  superia matrix [--once]                       Console Matrix multi-projets
  superia web [serve] [--port 3210]            Interface locale en lecture seule
  superia web token [--json]                   Affiche le token web local
  superia readiness [--json]                    Verdict global hors ligne
  superia doctor [--json]                       Détecte les IA et outils locaux
  superia providers [--json]                    Affiche les fournisseurs
  superia route [options]                       Recommande un fournisseur sans lancement
      --mode plan|build|review                  Capacité attendue
      --budget zero|low|any                     Catégories de coût autorisées
      --require-commands                        Exige l'exécution de commandes
      --strict                                  Échec si le lancement réel est bloqué
  superia benchmark summary [options]           Résume les mesures locales
      --provider <id> --mode plan|build|review
  superia benchmark list [options]              Liste les mesures privées
      --provider <id> --mode <mode> --limit 100
  superia benchmark record <id> [options]       Enregistre une mesure sans contenu libre
      --mode plan|build|review
      --success|--failure
      --duration-ms <entier> --cost-eur <nombre>
      --quality <0..100>                        Note optionnelle et explicite
  superia local [--json]                        Affiche les outils locaux
  superia scan [--json]                         Analyse le dépôt courant
  superia init                                  Initialise dépôt et plan de contrôle

  superia safety status [--json]                État de l'arrêt d'urgence
  superia safety engage [options]               Bloque les lancements et coupe les runs récents
      --category manual|security|budget|maintenance
  superia safety release [--json]               Lève explicitement l'arrêt d'urgence
  superia stop ...                              Alias de superia safety

  superia notify status [--json]                État des notifications locales
  superia notify run [--json]                   Traite les nouveaux événements
  superia notify list [--limit 50] [--json]     Liste les reçus dédupliqués
  superia notify enable|disable                 Active ou désactive le moteur
  superia notify configure [options]            Configure les sorties locales
      --stdout|--no-stdout                      Écriture console du daemon
      --runs|--no-runs                          Fins et interruptions de runs
      --blocked-tasks|--no-blocked-tasks        Missions bloquées

  superia connection init                       Initialise le registre privé
  superia connection dashboard [--json]         Connection Matrix
  superia connection doctor [--json]            Diagnostic sans réseau ni secret
  superia connection policy [--json]            Audit URL statique sans DNS
  superia connection probe <ID> --network       Sonde sans auth ni redirection
      --timeout-ms 5000                          Délai entre 250 et 15000 ms
  superia connection secret-backends            Détecte les coffres disponibles
  superia machine init                          Initialise l'arène des machines
  superia machine list [--json]                Liste les consoles Linux/Windows
  superia machine add <ID> [options]            Ajoute une console distante
      --platform linux|windows --transport ssh|winrm
      --host <hôte> --user <utilisateur> --port <port>
      --identity <clé> --shell bash|powershell --enabled

  superia control init|status [--json]          Inspecte SQLite WAL
  superia project add|sync [path] [--json]      Enregistre ou synchronise un dépôt
  superia project clone <URL> [options]          Clone et enregistre un dépôt Git
      --directory <dossier> --workspace <dossier>  Dossier de travail choisi
  superia project list [--json]                 Liste tous les projets
  superia project show <PROJECT-ID> [--json]    Affiche projet, missions et runs

  superia task create <objectif>                Crée une mission
  superia task list [--json]                    Liste les missions
  superia task show <TASK-ID> [--json]          Affiche une mission détaillée
  superia task board [--json]                   Tableau de suivi et progression
  superia task graph [--json]                   Vérifie le DAG et son ordre
  superia task reconcile [--json]               Ajuste les blocages du DAG
  superia task note <TASK-ID> <texte>           Ajoute une note horodatée
  superia task update <TASK-ID> [options]       Met à jour le pilotage
      --status planned|ready|running|blocked|review|done|failed|cancelled
      --priority low|normal|high|critical
      --owner <nom> --provider <id> --due YYYY-MM-DD
      --tag <tag> --depends TASK-XXXX --accept <critère>
      --allow-path <glob>                        Périmètre d'écriture d'un build
  superia worktree <TASK-ID> [--dry-run]        Crée son worktree

  superia context build [TASK-ID] [options]     Crée un contexte Git vérifiable
  superia security scan [options]               Lance Gitleaks
      --required --mode dir|git --timeout-minutes 5
  superia security sandbox-check [--json]       Teste et persiste Bubblewrap
  superia validate [--timeout-minutes 15]       Exécute les checks dans le runner

  superia agent run codex <TASK-ID> [options]   Lance Codex contrôlé
  superia agent run vibe <TASK-ID> [options]    Lance Mistral Vibe contrôlé
      --mode plan|build|review --model <nom> --dry-run
      --timeout-minutes 60 --max-context-bytes 300000
      --allow-without-gitleaks                   Dérogation explicite journalisée
      --allow-without-bwrap                      Dérogation explicite journalisée
      Vibe : --max-turns 8 --max-tokens 50000 --max-price 0.25

  superia pipeline run <TASK-ID> [options]      Pipeline contrôlé complet
  superia pipeline status <TASK-ID> [--json]    État, tentatives et budget
      --builder codex|vibe --reviewer codex|vibe
      --builder-model <nom> --reviewer-model <nom> --dry-run
      --resume                                  Reprend une étape interrompue
      --retry                                   Corrige une review changes-requested
      --max-attempts 3                          Plafond figé au premier lancement
      --max-total-price 0.75                    Prix Vibe maximal réservé cumulé

  superia receipt create <RUN-ID>               Crée la preuve d'un run
  superia receipt verify <RECEIPT.json>         Vérifie empreinte et artefacts

  superia backup create|list|verify             Sauvegardes locales cohérentes
  superia backup restore <backup> --target DIR  Restaure vers un nouveau SUPERIA_HOME
  superia backup drill [--keep]                 Teste sauvegarde et restauration hors ligne
  superia restic init|status                    Prépare la sauvegarde chiffrée
  superia restic backup                         Affiche le plan sans réseau
  superia restic retention-preview              Prévisualise la rétention sans prune
  superia restic check                          Affiche le plan de vérification
      --execute --network                       Exécution réseau volontaire

  superia daemon --once                         Synchronise, récupère et notifie
  superia daemon [--interval-seconds 30]        Lance la boucle permanente
  superia run start <provider> [TASK-ID]        Ouvre un run durable manuel
  superia run list [--project PROJECT-ID]       Liste les runs
  superia run heartbeat <RUN-ID>                Rafraîchit le heartbeat
  superia run finish <RUN-ID> <statut>          Termine un run
  superia events [--limit N] [--json]           Consulte les événements
  superia recover [--stale-minutes N]           Marque les runs abandonnés
  superia help                                  Affiche cette aide

Principes:
  - Raspberry Pi 5 utilisé comme plan de contrôle, jamais comme modèle obligatoire
  - routeur hors ligne fondé sur disponibilité, capacités, coût et préférences explicites
  - mesures locales privées limitées à fournisseur, mode, réussite, durée, coût et note optionnelle
  - aucune mesure ne contient prompt, code, réponse, secret ou texte libre
  - trois échantillons comparables minimum avant influence sur le classement
  - influence mesurée bornée et incapable de rendre un fournisseur interdit éligible
  - recommandation séparée de l'autorisation réelle fournie par readiness
  - arrêt d'urgence privé, fail-closed et audité
  - engagement : blocage des nouveaux runs, SIGTERM puis SIGKILL des groupes récents vérifiés
  - diagnostics, status et dry-runs restent disponibles sous arrêt
  - restauration uniquement vers une cible absente, jamais par-dessus le contrôle actif
  - restauration atomique après SHA-256, intégrité SQLite et validation JSONL
  - benchmarks privés sauvegardés, restaurés et validés avec le plan de contrôle
  - drill de reprise isolé avec comparaison projets, missions, runs, événements, journal et benchmarks
  - interface web uniquement sur 127.0.0.1 avec token privé et session HttpOnly
  - interface web en lecture seule, sans CORS ni contrôle destructif
  - notifications locales dédupliquées, privées et sans payloads arbitraires
  - aucune notification réseau activée par défaut
  - mode agent par défaut en lecture seule
  - build uniquement dans un worktree avec chemins autorisés
  - DAG sans cycle et dépendances terminées avant exécution
  - builder, validations, reviewer différent, receipt et approbation humaine
  - retries bornés et patch identique détecté comme boucle
  - Gitleaks obligatoire avant tout run réel distant
  - preuve Bubblewrap récente exigée sous Linux par readiness
  - endpoints distants HTTPS publics uniquement
  - sondes réseau sans authentification et uniquement avec --network
  - sauvegardes Restic réelles uniquement avec --execute --network
  - aucune commande Restic destructive générée
  - aucune fusion automatique
  - APIs génériques désactivées par défaut
  - état durable dans SUPERIA_HOME ou ~/.superia
`);
}

# Journal de travail IA

## 14 août 2026 — fondation

- Mission : créer le socle universel de Super IA.
- Branche : `agent/bootstrap-universal-cli`.
- Décisions : fournisseurs interchangeables, API désactivées par défaut, aucun contournement de quotas, Git et worktrees comme garde-fous.
- Livré : CLI minimale, catalogue, diagnostic, configuration, documentation et tests initiaux.

## 14 août 2026 — noyau opérationnel et console Matrix

- Mission : rendre le socle réellement exploitable depuis un dépôt Git.
- Livré : scanner Git, détection de stack et de checks, missions persistantes `TASK-XXXX`, création de worktree, console `superia matrix`.
- Validation locale : compilation TypeScript réussie ; tests du rendu Matrix et du flux complet `scan → mission → worktree` réussis.
- Sécurité : aucun merge automatique, API toujours verrouillées, `--dry-run` disponible avant création d'un worktree.
- Suite : premier adaptateur d'exécution Codex CLI, puis Mistral Vibe.

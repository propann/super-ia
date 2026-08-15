# Receipts de preuve

Un receipt Super IA est une photographie vérifiable d'un run. Il ne donne jamais une autorisation de fusion et ne remplace pas une revue humaine.

## Création

```bash
superia receipt create <RUN-ID>
```

Le fichier est écrit dans :

```text
~/.superia/runs/<RUN-ID>/RECEIPT.json
```

## Contenu

Le receipt rassemble :

- fournisseur, mode, statut et dates du run ;
- projet et mission ;
- commit de base déclaré par l'adaptateur ;
- commit Git observé à la fin ;
- état propre ou modifié ;
- liste des fichiers modifiés ;
- empreinte du diff ;
- identifiant et empreinte du contexte ;
- empreinte du manifeste de contexte ;
- logs stdout/stderr ;
- dernière réponse et événements normalisés lorsqu'ils existent ;
- validations locales exécutées après le run ;
- verdict structuré ;
- empreinte SHA-256 du receipt lui-même.

## Verdict

```json
{
  "agentCompleted": true,
  "contextVerified": true,
  "artifactsVerified": true,
  "validationState": "not-required",
  "humanApprovalRequired": true
}
```

`validationState` peut être :

- `not-required` pour plan/review ;
- `missing` pour un build sans validation ;
- `passed` lorsque toutes les validations associées réussissent ;
- `failed` lorsqu'au moins une validation échoue.

Même avec `passed`, l'approbation humaine reste obligatoire.

## Vérification

```bash
superia receipt verify ~/.superia/runs/<RUN-ID>/RECEIPT.json
```

La vérification recalcule :

- l'empreinte interne du receipt ;
- la taille et le SHA-256 de chaque artefact ;
- l'empreinte du manifeste de contexte.

Une modification ultérieure d'un log, du manifeste ou d'un artefact invalide le receipt. Ce comportement est couvert par un test automatisé.

## Limites

Le receipt actuel ne signe pas cryptographiquement avec une identité humaine ou matérielle. Il fournit une détection de modification par empreinte, pas une signature PKI.

Le diff Git est capturé localement. Les changements non suivis apparaissent dans la liste des fichiers, mais une future version renforcera leur empreinte individuelle.

Les validations sont reliées par projet, mission et chronologie. Un futur moteur de pipeline créera une relation explicite entre run constructeur, run de validation et run reviewer.

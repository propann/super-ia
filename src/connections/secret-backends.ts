import { findExecutable } from "../utils/command.js";

export interface SecretBackendDefinition {
  id: "session-env" | "libsecret" | "age-file" | "systemd-creds";
  label: string;
  command?: string;
  persistence: "session" | "user-keyring" | "encrypted-file" | "machine-bound";
  recommendedFor: string[];
  notes: string;
}

export interface SecretBackendCheck extends SecretBackendDefinition {
  available: boolean;
  executablePath?: string;
}

export const secretBackends: SecretBackendDefinition[] = [
  {
    id: "session-env",
    label: "Variables de session temporaires",
    persistence: "session",
    recommendedFor: ["test ponctuel", "connexion CLI interactive", "clé à durée courte"],
    notes: "Disparaît à la fermeture du terminal. Ne pas écrire dans l'historique du shell.",
  },
  {
    id: "libsecret",
    label: "Trousseau utilisateur Secret Service",
    command: "secret-tool",
    persistence: "user-keyring",
    recommendedFor: ["poste Linux avec session graphique", "secrets utilisateur"],
    notes: "Stockage via le trousseau de la session. Les commandes Super IA ne lisent aucune valeur automatiquement.",
  },
  {
    id: "age-file",
    label: "Fichier chiffré Age",
    command: "age",
    persistence: "encrypted-file",
    recommendedFor: ["sauvegarde hors machine", "configuration transportable", "Pi headless"],
    notes: "Conserver l'identité Age séparément et protéger ses permissions.",
  },
  {
    id: "systemd-creds",
    label: "Credentials chiffrés systemd",
    command: "systemd-creds",
    persistence: "machine-bound",
    recommendedFor: ["service systemd utilisateur", "daemon headless"],
    notes: "Approprié aux services; les credentials sont fournis comme fichiers, pas enregistrés dans Git.",
  },
];

export async function inspectSecretBackends(
  executableResolver: (command: string) => Promise<string | undefined> = findExecutable,
): Promise<SecretBackendCheck[]> {
  return Promise.all(secretBackends.map(async (backend) => {
    if (!backend.command) return { ...backend, available: true };
    const executablePath = await executableResolver(backend.command);
    return { ...backend, available: Boolean(executablePath), executablePath };
  }));
}

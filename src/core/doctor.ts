import type { ProviderCheck } from "./types.js";
import { providerCatalog } from "../providers/catalog.js";
import { findExecutable } from "../utils/command.js";

export async function inspectProviders(): Promise<ProviderCheck[]> {
  return Promise.all(
    providerCatalog.map(async (provider) => {
      if (!provider.command) return { ...provider, installed: null };
      const executablePath = await findExecutable(provider.command);
      return { ...provider, installed: Boolean(executablePath), executablePath };
    }),
  );
}

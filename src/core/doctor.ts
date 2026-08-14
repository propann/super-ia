import type { LocalToolCheck, ProviderCheck } from "./types.js";
import { providerCatalog } from "../providers/catalog.js";
import { localToolCatalog } from "../tools/catalog.js";
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

export async function inspectLocalTools(): Promise<LocalToolCheck[]> {
  return Promise.all(
    localToolCatalog.map(async (tool) => {
      for (const command of tool.commandCandidates) {
        const executablePath = await findExecutable(command);
        if (executablePath) {
          return { ...tool, installed: true, detectedCommand: command, executablePath };
        }
      }
      return { ...tool, installed: false };
    }),
  );
}

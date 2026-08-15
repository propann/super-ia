import { ensureWebAccessToken } from "./auth.js";
import { startWebServer } from "./server.js";

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function positionals(args: string[]): string[] {
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (!["--json"].includes(value)) index += 1;
      continue;
    }
    result.push(value);
  }
  return result;
}

function portOption(args: string[]): number {
  const raw = flagValue(args, "--port");
  if (raw === undefined) return 3210;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error("--port doit être un entier compris entre 1 et 65535.");
  }
  return value;
}

export async function handleWebCommand(command: string, args: string[], asJson: boolean): Promise<boolean> {
  if (command !== "web") return false;
  const [action = "serve"] = positionals(args);

  if (action === "token") {
    const access = await ensureWebAccessToken();
    if (asJson) console.log(JSON.stringify({ path: access.path, token: access.token, created: access.created }, null, 2));
    else {
      console.log("SUPER IA — TOKEN WEB LOCAL\n");
      console.log(`Fichier  ${access.path}`);
      console.log(`Token    ${access.token}`);
      console.log("\nNe pas copier ce token dans Git, un prompt ou un ticket.");
    }
    return true;
  }

  if (action !== "serve") {
    throw new Error("Usage : superia web [serve] [--port 3210] | superia web token [--json]");
  }

  const running = await startWebServer({ port: portOption(args) });
  const url = `http://${running.host.includes(":") ? `[${running.host}]` : running.host}:${running.port}`;
  if (asJson) console.log(JSON.stringify({ url, host: running.host, port: running.port, tokenPath: running.tokenPath, localOnly: true }, null, 2));
  else {
    console.log("SUPER IA — WEB LOCAL\n");
    console.log(`Adresse  ${url}`);
    console.log(`Token    ${running.tokenPath}`);
    console.log("Commande superia web token pour afficher le token local.");
    console.log("Écoute limitée à 127.0.0.1. Ctrl+C pour arrêter.");
  }

  const stop = () => {
    void running.close().finally(() => {
      process.exitCode = 0;
    });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return true;
}

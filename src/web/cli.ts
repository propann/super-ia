import { ensureWebAccessToken } from "./auth.js";
import { startWebServer } from "./server.js";
import { syncRepositoryToGlobalControl } from "../control/repository-sync.js";

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function positionals(args: string[]): string[] {
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (!["--json", "--allow-remote", "--no-auth"].includes(value)) index += 1;
      continue;
    }
    result.push(value);
  }
  return result;
}

function portOption(args: string[]): number {
  const raw = flagValue(args, "--port") ?? process.env.PORT;
  if (raw === undefined) return 3000;
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
    throw new Error("Usage : superia web [serve] [--port 3000] [--host 0.0.0.0] [--allow-remote] | superia web token [--json]");
  }

  const allowRemote = args.includes("--allow-remote") || process.env.SUPERIA_ALLOW_REMOTE === "1" || process.env.ALLOW_REMOTE === "1";
  const noAuth = args.includes("--no-auth") || process.env.SUPERIA_NO_AUTH === "1" || process.env.NO_AUTH === "1";
  const host = flagValue(args, "--host") ?? (allowRemote ? "0.0.0.0" : (process.env.HOST ?? "127.0.0.1"));

  // Pre-sync current project into control plane if accessible
  await syncRepositoryToGlobalControl(process.cwd()).catch(() => {});

  const running = await startWebServer({
    port: portOption(args),
    host,
    allowRemote,
    noAuth,
  });
  const url = `http://${running.host.includes(":") ? `[${running.host}]` : running.host}:${running.port}`;
  if (asJson) console.log(JSON.stringify({ url, host: running.host, port: running.port, tokenPath: running.tokenPath, localOnly: !allowRemote }, null, 2));
  else {
    console.log("SUPER IA — WEB LOCAL\n");
    console.log(`Adresse  ${url}`);
    console.log(`Token    ${running.tokenPath}`);
    console.log("Commande superia web token pour afficher le token local.");
    console.log(`Écoute sur ${running.host}:${running.port}. Ctrl+C pour arrêter.`);
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

import { scanRepository } from "../core/repository-scanner.js";
import { getTask } from "../core/task-store.js";
import { buildGitContext } from "./builder.js";

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function firstPositional(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      index += 1;
      continue;
    }
    return value;
  }
  return undefined;
}

export async function handleContextCommand(
  command: string,
  args: string[],
  asJson: boolean,
  cwd: string,
): Promise<boolean> {
  if (command !== "context") return false;
  const action = firstPositional(args) ?? "build";
  if (action !== "build") throw new Error("Usage : superia context build [TASK-ID] [options]");

  const remaining = args.slice(args.indexOf(action) + 1);
  const taskId = firstPositional(remaining);
  const scan = await scanRepository(cwd);
  const task = taskId ? await getTask(scan.root, taskId) : undefined;
  const maxBytesRaw = valueAfter(args, "--max-bytes");
  const maxBytes = maxBytesRaw ? Number(maxBytesRaw) : undefined;
  if (maxBytesRaw && (!Number.isFinite(maxBytes) || Number(maxBytes) <= 0)) {
    throw new Error("--max-bytes doit être un nombre positif.");
  }

  const result = await buildGitContext(scan.root, {
    taskId,
    query: valueAfter(args, "--query"),
    goal: valueAfter(args, "--goal"),
    maxBytes,
    outputRoot: valueAfter(args, "--output"),
  }, task);

  if (asJson) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Contexte créé : ${result.manifest.id}`);
    console.log(`Dossier         ${result.directory}`);
    console.log(`Fichiers        ${result.manifest.files.length}`);
    console.log(`Exclus          ${result.manifest.excluded.length}`);
    console.log(`Taille          ${result.manifest.includedBytes} octets`);
    console.log(`Empreinte       ${result.manifest.contextHash}`);
  }
  return true;
}

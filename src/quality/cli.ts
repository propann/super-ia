import { createRunReceipt, verifyRunReceipt } from "./receipt.js";

function positionals(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value.startsWith("--")) {
      if (value !== "--json") index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

export async function handleReceiptCommand(
  command: string,
  args: string[],
  asJson: boolean,
): Promise<boolean> {
  if (command !== "receipt") return false;
  const [action, target] = positionals(args);
  if (action === "create") {
    if (!target) throw new Error("Usage : superia receipt create <RUN-ID>");
    const result = await createRunReceipt(target);
    if (asJson) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Receipt créé : ${result.receipt.id}`);
      console.log(`Fichier         ${result.path}`);
      console.log(`Run terminé     ${result.receipt.verdict.agentCompleted ? "oui" : "non"}`);
      console.log(`Contexte vérifié ${result.receipt.verdict.contextVerified ? "oui" : "non"}`);
      console.log(`Validations     ${result.receipt.verdict.validationState}`);
      console.log("Approbation humaine obligatoire : oui");
    }
    return true;
  }
  if (action === "verify") {
    if (!target) throw new Error("Usage : superia receipt verify <RECEIPT.json>");
    const result = await verifyRunReceipt(target);
    if (asJson) console.log(JSON.stringify(result, null, 2));
    else if (result.valid) console.log("RECEIPT VALIDE");
    else console.log(`RECEIPT INVALIDE\n${result.errors.join("\n")}`);
    if (!result.valid) process.exitCode = 1;
    return true;
  }
  throw new Error("Usage : superia receipt create|verify");
}

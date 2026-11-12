#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { spawn } from "node:child_process";

const baseUrl = process.env.SUPERIA_URL || "http://127.0.0.1:3210";
const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const requestedModel = process.env.SUPERIA_TEST_MODEL;
const maxTokens = Math.max(512, Math.min(8192, Number(process.env.SUPERIA_TEST_MAX_TOKENS) || 2048));
const think = process.env.SUPERIA_TEST_THINK !== "0";
const requestedTemperature = process.env.SUPERIA_TEST_TEMPERATURE === undefined ? NaN : Number(process.env.SUPERIA_TEST_TEMPERATURE);
const temperature = Number.isFinite(requestedTemperature)
  ? Math.max(0, Math.min(1, requestedTemperature))
  : think ? 0.6 : 0.7;
const timeoutMs = 180_000;
const report = { services: {}, endpoints: {}, chat: {} };

function command(args) {
  return new Promise((resolve) => {
    const child = spawn("systemctl", ["--user", ...args], { stdio: ["ignore", "pipe", "ignore"] });
    let output = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), 4_000);
    child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
    child.on("error", () => resolve("indisponible"));
    child.on("close", () => {
      clearTimeout(timer);
      resolve(output.trim() || "inactif ou inaccessible");
    });
  });
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function readOllamaRuntime() {
  try {
    const result = await getJson(`${ollamaUrl}/api/ps`);
    return {
      status: result.status,
      models: Array.isArray(result.body.models) ? result.body.models.map((item) => ({
        name: item.name,
        sizeGiB: Number.isFinite(Number(item.size)) ? Number((Number(item.size) / 1024 ** 3).toFixed(2)) : null,
        vramGiB: Number.isFinite(Number(item.size_vram)) ? Number((Number(item.size_vram) / 1024 ** 3).toFixed(2)) : null,
        contextLength: item.context_length ?? null,
        expiresAt: item.expires_at ?? null,
      })) : [],
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function matchesExpected(answer, expected) {
  const normalized = answer
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#]/g, "")
    .replace(/[✅✔️☑️]/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleUpperCase("fr");
  return normalized === expected.toLocaleUpperCase("fr");
}

async function runChatProbe(headers, model, prompt, expected) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/chat?stream=1`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({
      provider: "ollama",
      model,
      temperature,
      maxTokens,
      think,
      vaultContext: false,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await response.text();
  const events = [];
  for (const block of raw.split(/\r?\n\r?\n/)) {
    const line = block.split(/\r?\n/).find((value) => value.startsWith("data:"));
    if (!line) continue;
    try { events.push(JSON.parse(line.slice(5).trim())); } catch { /* ignore malformed event */ }
  }
  const answer = events.filter((event) => event.type === "delta").map((event) => event.text || "").join("").trim();
  const errors = events.filter((event) => event.type === "error").map((event) => event.error);
  const usage = events.find((event) => event.type === "done")?.usage ?? null;
  const outputTokens = Number(usage?.completionTokens ?? 0);
  const tools = events.filter((event) => event.type === "tool").map((event) => ({
    name: event.name,
    status: event.status,
  }));
  const exactMatch = matchesExpected(answer, expected);
  return {
    status: response.status,
    seconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
    usage,
    outputTokensPerSecond: outputTokens > 0 ? Number((outputTokens / ((Date.now() - startedAt) / 1000)).toFixed(2)) : null,
    answered: response.ok && exactMatch && errors.length === 0,
    exactMatch,
    expected,
    answer: answer.slice(0, 300),
    errors,
    eventTypes: events.map((event) => event.type),
    tools,
  };
}

async function main() {
  report.services.ollama = await command(["show", "ollama.service", "--property=ActiveState", "--value"]);
  report.services.superiaWeb = await command(["show", "superia-web.service", "--property=ActiveState", "--value"]);

  try {
    const result = await getJson(`${ollamaUrl}/api/tags`);
    report.endpoints.ollama = {
      status: result.status,
      models: Array.isArray(result.body.models) ? result.body.models.map((item) => item.name) : [],
      error: result.body.error || undefined,
    };
  } catch (error) {
    report.endpoints.ollama = { error: error instanceof Error ? error.message : String(error) };
  }

  report.endpoints.ollamaRuntimeBeforeChat = await readOllamaRuntime();

  let token;
  try {
    token = (await readFile(`${homedir()}/.superia/web/access.token`, "utf8")).trim();
    if (!token) throw new Error("jeton vide");
  } catch (error) {
    report.endpoints.superia = { error: `Jeton local inaccessible : ${error instanceof Error ? error.message : String(error)}` };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  const headers = { authorization: `Bearer ${token}` };
  try {
    const health = await getJson(`${baseUrl}/healthz`);
    report.endpoints.superiaHealth = { status: health.status, ok: health.body.ok === true };
    const models = await getJson(`${baseUrl}/api/chat/models`, headers);
    report.endpoints.superiaModels = {
      status: models.status,
      models: Array.isArray(models.body.models) ? models.body.models.map((item) => item.name) : [],
      error: models.body.error || undefined,
    };
    if (models.status !== 200) throw new Error(models.body.error || `Liste des modèles HTTP ${models.status}`);
    const availableModels = report.endpoints.superiaModels.models;
    const modelsToTest = requestedModel ? [requestedModel] : availableModels;
    if (!modelsToTest.length) throw new Error("Aucun modèle Ollama n’est disponible pour le test.");

    report.chat = { think, temperature, maxTokens, models: [] };
    for (const model of modelsToTest) {
      try {
        const text = await runChatProbe(headers, model, "Réponds uniquement : TEST IA OK", "TEST IA OK");
        const tools = await runChatProbe(headers, model, 'Appelle obligatoirement l’outil list_files avec le chemin "src", puis réponds exactement : TEST OUTIL OK.', "TEST OUTIL OK");
        const toolSucceeded = tools.tools.some((tool) => tool.name === "list_files" && tool.status === "effectué");
        const rackTests = {};
        for (const probe of [
          { key: "models", tool: "mother_list_models", marker: "TEST RACK MODELES OK", prompt: "Appelle obligatoirement mother_list_models pour interroger le rack MU-TH-UR. Après réception du résultat, réponds uniquement : TEST RACK MODELES OK." },
          { key: "articles", tool: "mother_search_articles", marker: "TEST RACK VEILLE OK", prompt: 'Appelle obligatoirement mother_search_articles avec query="Ollama" et limit=5 pour interroger les articles en cache. Après réception du résultat, réponds uniquement : TEST RACK VEILLE OK.' },
          { key: "trading", tool: "mother_trading_status", marker: "TEST RACK QUANT OK", prompt: "Appelle obligatoirement mother_trading_status pour lire l'état de santé Quant Core. Après réception du résultat, réponds uniquement : TEST RACK QUANT OK." },
        ]) {
          const result = await runChatProbe(headers, model, probe.prompt, probe.marker);
          const called = result.tools.some((tool) => tool.name === probe.tool && tool.status === "effectué");
          rackTests[probe.key] = { ...result, calledTool: called, succeeded: called && result.answered };
        }
        report.chat.models.push({
          model,
          text,
          toolTest: {
            ...tools,
            calledListFiles: tools.tools.some((tool) => tool.name === "list_files"),
            succeeded: toolSucceeded && tools.answered,
          },
          rackTests,
        });
      } catch (error) {
        report.chat.models.push({
          model,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    report.chat.allAnswered = report.chat.models.every((result) => result.text?.answered);
    report.chat.allToolsWorked = report.chat.models.every((result) => result.toolTest?.succeeded);
    report.chat.allRackToolsWorked = report.chat.models.every((result) => Object.values(result.rackTests || {}).length === 3 && Object.values(result.rackTests).every(test => test.succeeded));
    report.endpoints.ollamaRuntimeAfterChat = await readOllamaRuntime();
  } catch (error) {
    report.endpoints.superia = { error: error instanceof Error ? error.message : String(error) };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify(report, null, 2));
  if (!report.chat.allAnswered || !report.chat.allToolsWorked || !report.chat.allRackToolsWorked) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

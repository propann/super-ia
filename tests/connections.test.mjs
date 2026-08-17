import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connectionCatalog, defaultConnections } from "../dist/connections/catalog.js";
import { ensureConnectionStore, inspectConnection, validateConnection, writeSecretsTemplate } from "../dist/connections/store.js";

test("connection catalog covers CLI, APIs, cloud identities, protocols, SSH, web and optional local endpoints", () => {
  const ids = connectionCatalog.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  const kinds = new Set(connectionCatalog.map((item) => item.kind));
  for (const kind of ["cli-session", "api-key-env", "openai-compatible", "cloud-identity", "mcp-stdio", "mcp-http", "acp-stdio", "a2a-http", "ssh-cli", "web-assisted", "local-endpoint"]) {
    assert.equal(kinds.has(kind), true, `missing ${kind}`);
  }
  assert.equal(defaultConnections().every((item) => item.enabled === false), true);
  for (const id of ["azure-openai", "aws-bedrock", "google-vertex-ai", "github-models", "huggingface-router", "together-api"]) assert.equal(ids.includes(id), true, id);
});

test("connection store is private and never contains secret values", async () => {
  const previous = process.env.SUPERIA_HOME;
  const root = await mkdtemp(join(tmpdir(), "superia-connections-"));
  process.env.SUPERIA_HOME = root;
  try {
    const created = await ensureConnectionStore();
    assert.equal(created.created, true);
    assert.equal((await stat(created.path)).mode & 0o777, 0o600);
    const raw = await readFile(created.path, "utf8");
    assert.equal(raw.includes("sk-"), false);
    assert.equal(raw.includes("apiKey"), false);
    const template = await writeSecretsTemplate();
    assert.equal((await stat(template)).mode & 0o777, 0o600);
    const env = await readFile(template, "utf8");
    assert.match(env, /OPENAI_API_KEY=/);
    assert.match(env, /HF_TOKEN=/);
    assert.doesNotMatch(env, /=.+/);
  } finally {
    process.env.SUPERIA_HOME = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test("existing connection stores receive new defaults without losing user choices", async () => {
  const previous = process.env.SUPERIA_HOME;
  const root = await mkdtemp(join(tmpdir(), "superia-connections-migrate-"));
  process.env.SUPERIA_HOME = root;
  try {
    const created = await ensureConnectionStore();
    const custom = created.store.connections.find((item) => item.id === "codex-cli");
    custom.enabled = true;
    await writeFile(created.path, JSON.stringify({ schemaVersion: 1, updatedAt: new Date().toISOString(), connections: [custom] }), "utf8");
    const migrated = await ensureConnectionStore();
    assert.equal(migrated.created, false);
    assert.ok(migrated.addedDefaults > 0);
    assert.equal(migrated.store.connections.find((item) => item.id === "codex-cli").enabled, true);
    assert.equal(migrated.store.connections.some((item) => item.id === "github-models"), true);
  } finally {
    process.env.SUPERIA_HOME = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid connection stores fail closed and are never overwritten", async () => {
  const previous = process.env.SUPERIA_HOME;
  const root = await mkdtemp(join(tmpdir(), "superia-connections-invalid-"));
  process.env.SUPERIA_HOME = root;
  const path = join(root, "connections.json");
  const malformed = "{ this is not valid JSON\n";
  try {
    await writeFile(path, malformed, "utf8");
    await assert.rejects(() => ensureConnectionStore(), /JSON|Unexpected|position/i);
    assert.equal(await readFile(path, "utf8"), malformed);

    const incompatible = JSON.stringify({ schemaVersion: 99, updatedAt: new Date().toISOString(), connections: [] });
    await writeFile(path, incompatible, "utf8");
    await assert.rejects(() => ensureConnectionStore(), /invalide|incompatible/);
    assert.equal(await readFile(path, "utf8"), incompatible);
  } finally {
    process.env.SUPERIA_HOME = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test("connection doctor does not perform network access and checks command and env references", async () => {
  const now = new Date().toISOString();
  const api = {
    id: "test-api", label: "Test API", kind: "openai-compatible", enabled: true, authMode: "environment",
    args: [], baseUrl: "https://example.invalid/v1", requiredEnv: ["TEST_API_KEY"], notes: "test", createdAt: now, updatedAt: now,
  };
  const missing = await inspectConnection(api, {}, async () => undefined);
  assert.equal(missing.state, "needs-auth");
  assert.equal(missing.networkChecked, false);
  const ready = await inspectConnection(api, { TEST_API_KEY: "present-but-never-returned" }, async () => undefined);
  assert.equal(ready.state, "ready");
  assert.equal(JSON.stringify(ready).includes("present-but-never-returned"), false);

  const cli = { ...api, id: "test-cli", kind: "cli-session", authMode: "session", command: "missing-ai", baseUrl: undefined, requiredEnv: [] };
  const absent = await inspectConnection(cli, {}, async () => undefined);
  assert.equal(absent.state, "missing-command");
  const installed = await inspectConnection(cli, {}, async () => "/tmp/missing-ai");
  assert.equal(installed.state, "configured");
});

test("connection validation rejects malformed IDs, environment names and non-http endpoints", () => {
  const now = new Date().toISOString();
  const base = { id: "valid-id", label: "Valid", kind: "api-key-env", enabled: true, authMode: "environment", args: [], baseUrl: "https://example.invalid", requiredEnv: ["VALID_KEY"], notes: "x", createdAt: now, updatedAt: now };
  assert.doesNotThrow(() => validateConnection(base));
  assert.doesNotThrow(() => validateConnection({ ...base, kind: "cloud-identity", baseUrl: undefined, requiredEnv: [] }));
  assert.throws(() => validateConnection({ ...base, id: "BAD ID" }), /Identifiant/);
  assert.throws(() => validateConnection({ ...base, requiredEnv: ["bad-key"] }), /variable/);
  assert.throws(() => validateConnection({ ...base, baseUrl: "file:///tmp/model" }), /HTTP/);
});

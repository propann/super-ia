import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connectionCatalog, defaultConnections } from "../dist/connections/catalog.js";
import { ensureConnectionStore, inspectConnection, validateConnection, writeSecretsTemplate } from "../dist/connections/store.js";

test("connection catalog covers CLI, APIs, protocols, SSH, web and optional local endpoints", () => {
  const ids = connectionCatalog.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  const kinds = new Set(connectionCatalog.map((item) => item.kind));
  for (const kind of ["cli-session", "api-key-env", "openai-compatible", "mcp-stdio", "mcp-http", "acp-stdio", "a2a-http", "ssh-cli", "web-assisted", "local-endpoint"]) {
    assert.equal(kinds.has(kind), true, `missing ${kind}`);
  }
  assert.equal(defaultConnections().every((item) => item.enabled === false), true);
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
    assert.doesNotMatch(env, /=.+/);
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
  assert.throws(() => validateConnection({ ...base, id: "BAD ID" }), /Identifiant/);
  assert.throws(() => validateConnection({ ...base, requiredEnv: ["bad-key"] }), /variable/);
  assert.throws(() => validateConnection({ ...base, baseUrl: "file:///tmp/model" }), /HTTP/);
});

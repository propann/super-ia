import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openControlPlane } from "../dist/control/control-plane.js";
import { ensureWebAccessToken } from "../dist/web/auth.js";
import { startWebServer } from "../dist/web/server.js";

function scan(root) {
  return {
    root,
    name: "web-demo",
    isGitRepository: true,
    branch: "main",
    dirty: false,
    manifests: [],
    languages: ["TypeScript"],
    instructions: [],
    scripts: {},
    recommendedChecks: [],
  };
}

function readiness(root) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-08-15T00:00:00.000Z",
    repositoryRoot: root,
    overall: "warn",
    readyForLocalControl: true,
    readyForRealAgents: false,
    checks: [{ id: "test", label: "Test", level: "warn", summary: "Preuve injectée", details: [] }],
    counts: { pass: 0, warn: 1, fail: 0 },
    networkChecked: false,
    secretsRead: false,
  };
}

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), "superia-web-home-"));
  const root = await mkdtemp(join(tmpdir(), "superia-web-project-"));
  const control = await openControlPlane(home);
  const project = control.registerProject(scan(root));
  control.syncTasks(project.id, [{
    id: "TASK-0001",
    title: "Interface locale",
    goal: "Afficher l'état",
    status: "ready",
    branchName: "agent/task-0001",
    checks: ["npm test"],
    notes: [],
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
  }]);
  const run = control.createRun({ projectId: project.id, taskId: "TASK-0001", provider: "test" });
  control.finishRun(run.id, "completed");
  control.close();
  return { home, root, project };
}

test("web dashboard stays local, authenticated and read-only", async () => {
  const env = await fixture();
  const server = await startWebServer({
    controlHome: env.home,
    port: 0,
    sessionTtlMs: 60_000,
    readiness: async (root) => readiness(root),
  });
  const base = `http://${server.host}:${server.port}`;
  try {
    const token = (await readFile(server.tokenPath, "utf8")).trim();
    assert.ok(token.length >= 43);
    assert.equal((await stat(server.tokenPath)).mode & 0o777, 0o600);

    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, localOnly: true });

    const redirected = await fetch(`${base}/`, { redirect: "manual" });
    assert.equal(redirected.status, 303);
    assert.equal(redirected.headers.get("location"), "/login");

    const unauthorized = await fetch(`${base}/api/overview`);
    assert.equal(unauthorized.status, 401);
    assert.match(unauthorized.headers.get("content-security-policy") ?? "", /default-src 'self'/);
    assert.equal(unauthorized.headers.get("access-control-allow-origin"), null);

    const denied = await fetch(`${base}/session`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: "incorrect" }),
      redirect: "manual",
    });
    assert.equal(denied.status, 401);

    const login = await fetch(`${base}/session`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      redirect: "manual",
    });
    assert.equal(login.status, 303);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie ?? "", /superia_session=/);
    assert.match(cookie ?? "", /HttpOnly/);
    assert.match(cookie ?? "", /SameSite=Strict/);

    const page = await fetch(`${base}/`, { headers: { cookie } });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /SUPER IA \/\/ CONTROL MATRIX/);

    const overview = await fetch(`${base}/api/overview`, { headers: { cookie } });
    assert.equal(overview.status, 200);
    const data = await overview.json();
    assert.equal(data.readOnly, true);
    assert.equal(data.networkChecked, false);
    assert.equal(data.status.projects, 1);
    assert.equal(data.projects[0].id, env.project.id);
    assert.equal(data.tasks[0].id, "TASK-0001");
    assert.equal(data.runs[0].status, "completed");
    assert.equal(data.readiness.overall, "warn");

    const bearer = await fetch(`${base}/api/overview`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(bearer.status, 200);

    const destructive = await fetch(`${base}/api/overview`, { method: "DELETE", headers: { cookie } });
    assert.equal(destructive.status, 405);
  } finally {
    await server.close();
    await rm(env.home, { recursive: true, force: true });
    await rm(env.root, { recursive: true, force: true });
  }
});

test("web token files fail closed and remote listening is refused", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-web-invalid-"));
  try {
    const access = await ensureWebAccessToken(home);
    await writeFile(access.path, "invalid token\n", "utf8");
    await assert.rejects(() => ensureWebAccessToken(home), /n'a pas été remplacé/);
    assert.equal(await readFile(access.path, "utf8"), "invalid token\n");
    await assert.rejects(
      () => startWebServer({ controlHome: home, host: "0.0.0.0", port: 0 }),
      /refuse toute écoute hors boucle locale/,
    );
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openControlPlane } from "../dist/control/control-plane.js";
import { writeNotificationRecord } from "../dist/notifications/store.js";
import { engageEmergencyStop } from "../dist/safety/store.js";
import { ensureWebAccessToken } from "../dist/web/auth.js";
import { startWebServer } from "../dist/web/server.js";
import { saveMachine } from "../dist/machines/store.js";
import { saveConnection } from "../dist/connections/store.js";

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
  await writeNotificationRecord({
    schemaVersion: 1,
    id: "NTF-WEB",
    key: "web-test-notification",
    createdAt: "2026-08-15T00:02:00.000Z",
    level: "success",
    kind: "run",
    title: "Run terminé",
    message: `${run.id} · TASK-0001`,
    projectId: project.id,
    taskId: "TASK-0001",
    runId: run.id,
  }, home);
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
    const now = new Date().toISOString();
    await saveMachine({ id: "pi5", label: "Pi 5", platform: "linux", transport: "ssh", host: "192.0.2.10", port: 22, user: "azoth", enabled: true, authMode: "key", shell: "bash", sessionName: "super-agent-pi", notes: "test", createdAt: now, updatedAt: now }, env.home);
    await saveConnection({ id: "test-ai", label: "IA de test", kind: "cli-session", enabled: false, authMode: "session", command: "test-ai", args: [], requiredEnv: [], notes: "test", createdAt: now, updatedAt: now }, env.home);
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
    const pageHtml = await page.text();
    assert.match(pageHtml, /SUPER IA \/\/ CONTROL MATRIX/);
    assert.match(pageHtml, /Arène · IA \+ consoles/);
    assert.match(pageHtml, /agent-cards/);
    assert.match(pageHtml, /project-cards/);
    assert.match(pageHtml, /pair-card/);
    assert.match(pageHtml, /console-preview/);
    assert.match(pageHtml, /openConsole/);
    assert.match(pageHtml, /AGRANDIR/);
    assert.match(pageHtml, /dissolveGroup/);
    assert.match(pageHtml, /Notifications locales/);
    assert.match(pageHtml, /consoles SSH contrôlables/i);

    const overview = await fetch(`${base}/api/overview`, { headers: { cookie } });
    assert.equal(overview.status, 200);
    const data = await overview.json();
    assert.equal(data.readOnly, true);
    assert.equal(data.networkChecked, false);
    assert.equal(data.status.projects, 1);
    assert.equal(data.projects[0].id, env.project.id);
    assert.equal(data.tasks[0].id, "TASK-0001");
    assert.equal(data.runs[0].status, "completed");
    assert.equal(data.notifications.length, 1);
    assert.equal(data.notifications[0].title, "Run terminé");
    assert.equal(data.emergencyStop.engaged, false);
    assert.equal(data.machines[0].id, "pi5");
    assert.equal(data.connections.find((item) => item.id === "test-ai")?.id, "test-ai");
    const arena = await fetch(`${base}/api/arena`, { headers: { cookie } });
    assert.equal(arena.status, 200);
    const arenaState = await arena.json();
    assert.deepEqual(arenaState.groups, []);
    const savedArena = await fetch(`${base}/api/arena`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ selected: ["agent:test-ai", "machine:pi5"], groups: [["agent:test-ai", "machine:pi5"]] }) });
    assert.equal(savedArena.status, 200);
    assert.deepEqual((await savedArena.json()).groups, [["agent:test-ai", "machine:pi5"]]);
    assert.match(await readFile(join(env.home, "arena.json"), "utf8"), /agent:test-ai/);
    assert.equal(data.readiness.overall, "warn");

    await engageEmergencyStop("maintenance", env.home);
    const stopped = await fetch(`${base}/api/overview`, { headers: { cookie } });
    assert.equal(stopped.status, 200);
    const stoppedData = await stopped.json();
    assert.equal(stoppedData.emergencyStop.engaged, true);
    assert.equal(stoppedData.emergencyStop.category, "maintenance");

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

import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeNetworkTarget, classifyAddress, evaluateEndpointPolicy } from "../dist/connections/network-policy.js";
import { probeConnection } from "../dist/connections/probe.js";

function connection(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: "test-endpoint",
    label: "Test endpoint",
    kind: "openai-compatible",
    providerId: "test",
    enabled: true,
    authMode: "environment",
    args: [],
    baseUrl: "https://api.example.test/v1",
    requiredEnv: ["TEST_API_KEY"],
    notes: "test",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("address classification blocks loopback, private, link-local and metadata ranges", () => {
  assert.equal(classifyAddress("127.0.0.1"), "loopback");
  assert.equal(classifyAddress("::1"), "loopback");
  assert.equal(classifyAddress("10.0.0.1"), "private");
  assert.equal(classifyAddress("172.20.0.1"), "private");
  assert.equal(classifyAddress("192.168.1.10"), "private");
  assert.equal(classifyAddress("169.254.169.254"), "private");
  assert.equal(classifyAddress("100.64.0.1"), "private");
  assert.equal(classifyAddress("fc00::1"), "private");
  assert.equal(classifyAddress("8.8.8.8"), "public");
  assert.equal(classifyAddress("2606:4700:4700::1111"), "public");
});

test("static endpoint policy separates public remote and loopback local endpoints", () => {
  assert.equal(evaluateEndpointPolicy(connection()).allowed, true);
  assert.equal(evaluateEndpointPolicy(connection({ baseUrl: "http://api.example.test/v1" })).allowed, false);
  assert.equal(evaluateEndpointPolicy(connection({ baseUrl: "https://127.0.0.1/v1" })).allowed, false);
  assert.equal(evaluateEndpointPolicy(connection({ baseUrl: "https://169.254.169.254/latest" })).allowed, false);
  assert.equal(evaluateEndpointPolicy(connection({ baseUrl: "https://user:pass@example.test/v1" })).allowed, false);
  assert.equal(evaluateEndpointPolicy(connection({ baseUrl: "https://example.test/v1?token=secret" })).allowed, false);

  const local = connection({ kind: "local-endpoint", authMode: "none", requiredEnv: [], baseUrl: "http://127.0.0.1:11434" });
  assert.equal(evaluateEndpointPolicy(local).allowed, true);
  assert.equal(evaluateEndpointPolicy({ ...local, baseUrl: "http://192.168.1.20:11434" }).allowed, false);
});

test("DNS resolution fails closed when a public hostname resolves to a private address", async () => {
  const blocked = await assertSafeNetworkTarget(connection(), async () => ["10.0.0.4"]);
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reasons.join(" "), /adresse interdite/);

  const allowed = await assertSafeNetworkTarget(connection(), async () => ["203.0.113.10"]);
  assert.equal(allowed.allowed, true);
  assert.deepEqual(allowed.resolvedAddresses, ["203.0.113.10"]);
});

test("probe is opt-in at connection level, sends no auth and follows no redirect", async () => {
  let calls = 0;
  const disabled = await probeConnection(connection({ enabled: false }), {
    resolver: async () => ["203.0.113.10"],
    fetcher: async () => { calls += 1; throw new Error("must not run"); },
  });
  assert.equal(disabled.networkAttempted, false);
  assert.equal(calls, 0);

  const reachable = await probeConnection(connection(), {
    resolver: async () => ["203.0.113.10"],
    fetcher: async (_url, init) => {
      calls += 1;
      assert.equal(init.method, "HEAD");
      assert.equal(init.redirect, "manual");
      assert.equal(Object.keys(init.headers).some((name) => name.toLowerCase() === "authorization"), false);
      return { status: 401, headers: { get: () => null } };
    },
  });
  assert.equal(reachable.state, "reachable");
  assert.equal(reachable.reachable, true);
  assert.equal(reachable.statusCode, 401);
  assert.equal(reachable.usedAuthentication, false);
  assert.equal(reachable.followedRedirect, false);

  const redirected = await probeConnection(connection(), {
    resolver: async () => ["203.0.113.10"],
    fetcher: async () => ({ status: 302, headers: { get: (name) => name === "location" ? "https://other.example.test" : null } }),
  });
  assert.equal(redirected.state, "redirect-blocked");
  assert.equal(redirected.reachable, true);
  assert.equal(redirected.followedRedirect, false);
});

test("probe never calls fetch when endpoint policy or DNS policy blocks the target", async () => {
  let calls = 0;
  const result = await probeConnection(connection({ baseUrl: "https://localhost/v1" }), {
    resolver: async () => ["127.0.0.1"],
    fetcher: async () => { calls += 1; throw new Error("must not run"); },
  });
  assert.equal(result.state, "policy-blocked");
  assert.equal(result.networkAttempted, false);
  assert.equal(calls, 0);
});

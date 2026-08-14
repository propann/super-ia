import test from "node:test";
import assert from "node:assert/strict";
import { inspectSecretBackends, secretBackends } from "../dist/connections/secret-backends.js";

test("secret backends cover temporary, keyring, encrypted and machine-bound storage", async () => {
  assert.deepEqual(secretBackends.map((item) => item.id), ["session-env", "libsecret", "age-file", "systemd-creds"]);
  const checks = await inspectSecretBackends(async (command) => command === "age" ? "/usr/bin/age" : undefined);
  assert.equal(checks.find((item) => item.id === "session-env").available, true);
  assert.equal(checks.find((item) => item.id === "age-file").available, true);
  assert.equal(checks.find((item) => item.id === "libsecret").available, false);
  assert.equal(JSON.stringify(checks).includes("API_KEY="), false);
});

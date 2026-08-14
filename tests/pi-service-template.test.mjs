import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Pi service template keeps the configured control home", async () => {
  const template = await readFile("install/pi/superia.service.template", "utf8");
  const installer = await readFile("install/pi/install.sh", "utf8");

  assert.equal(template.includes("Environment=SUPERIA_HOME=@SUPERIA_HOME@"), true);
  assert.equal(template.includes("ReadWritePaths=@SUPERIA_HOME@"), true);
  assert.equal(template.includes("Environment=SUPERIA_HOME=@HOME@/.superia"), false);
  assert.equal(installer.includes("SUPERIA_HOME_ESCAPED="), true);
  assert.equal(installer.includes("@SUPERIA_HOME@"), true);
  assert.equal(installer.includes("sandbox-check --json >"), false);
});

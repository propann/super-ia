import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openLeaseManager } from "../dist/control/lease-manager.js";

test("only one worker can own a task lease", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-lease-"));
  try {
    const first = await openLeaseManager(home);
    const second = await openLeaseManager(home);
    assert.equal(first.acquire("agent:project:TASK-0001", "worker-a", 30_000)?.holder, "worker-a");
    assert.equal(second.acquire("agent:project:TASK-0001", "worker-b", 30_000), undefined);
    assert.equal(first.release("agent:project:TASK-0001", "worker-a"), true);
    assert.equal(second.acquire("agent:project:TASK-0001", "worker-b", 30_000)?.holder, "worker-b");
    first.close();
    second.close();
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("expired leases can be reclaimed", async () => {
  const home = await mkdtemp(join(tmpdir(), "superia-expired-"));
  let now = new Date("2026-08-14T21:00:00.000Z");
  try {
    const first = await openLeaseManager(home, () => now);
    first.acquire("agent:project:TASK-0002", "worker-a", 5_000);
    now = new Date("2026-08-14T21:00:06.000Z");
    assert.equal(first.acquire("agent:project:TASK-0002", "worker-b", 5_000)?.holder, "worker-b");
    first.close();
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

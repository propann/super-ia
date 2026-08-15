import { DatabaseSync } from "node:sqlite";
import { ensureControlHome } from "./home.js";
import type { ControlPaths } from "./types.js";

export interface LeaseRecord {
  resourceKey: string;
  holder: string;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
}

function mapLease(row: Record<string, unknown>): LeaseRecord {
  return {
    resourceKey: String(row.resource_key),
    holder: String(row.holder),
    acquiredAt: String(row.acquired_at),
    heartbeatAt: String(row.heartbeat_at),
    expiresAt: String(row.expires_at),
  };
}

export class LeaseManager {
  constructor(
    readonly paths: ControlPaths,
    private readonly database: DatabaseSync,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.database.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS leases (
        resource_key TEXT PRIMARY KEY,
        holder TEXT NOT NULL,
        acquired_at TEXT NOT NULL,
        heartbeat_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_leases_expires ON leases(expires_at);
    `);
  }

  close(): void {
    this.database.close();
  }

  acquire(resourceKey: string, holder: string, ttlMs = 30 * 60_000): LeaseRecord | undefined {
    if (!resourceKey.trim() || !holder.trim()) throw new Error("Lease invalide.");
    const now = this.now();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + Math.max(5_000, ttlMs)).toISOString();
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      this.database.prepare("DELETE FROM leases WHERE expires_at <= ?").run(nowIso);
      const existing = this.database.prepare("SELECT * FROM leases WHERE resource_key = ?").get(resourceKey);
      if (existing && String(existing.holder) !== holder) {
        this.database.exec("COMMIT;");
        return undefined;
      }
      this.database.prepare(`
        INSERT INTO leases(resource_key, holder, acquired_at, heartbeat_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(resource_key) DO UPDATE SET
          heartbeat_at=excluded.heartbeat_at,
          expires_at=excluded.expires_at
      `).run(resourceKey, holder, existing ? String(existing.acquired_at) : nowIso, nowIso, expiresAt);
      this.database.exec("COMMIT;");
      return this.get(resourceKey);
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  renew(resourceKey: string, holder: string, ttlMs = 30 * 60_000): LeaseRecord {
    const lease = this.acquire(resourceKey, holder, ttlMs);
    if (!lease) throw new Error(`Lease détenu par un autre worker : ${resourceKey}`);
    return lease;
  }

  release(resourceKey: string, holder: string): boolean {
    const result = this.database.prepare("DELETE FROM leases WHERE resource_key = ? AND holder = ?")
      .run(resourceKey, holder);
    return Number(result.changes) > 0;
  }

  get(resourceKey: string): LeaseRecord | undefined {
    const row = this.database.prepare("SELECT * FROM leases WHERE resource_key = ?").get(resourceKey);
    return row ? mapLease(row) : undefined;
  }

  list(): LeaseRecord[] {
    return this.database.prepare("SELECT * FROM leases ORDER BY expires_at").all().map(mapLease);
  }

  purgeExpired(): number {
    const result = this.database.prepare("DELETE FROM leases WHERE expires_at <= ?").run(this.now().toISOString());
    return Number(result.changes);
  }
}

export async function openLeaseManager(
  root?: string,
  now: () => Date = () => new Date(),
): Promise<LeaseManager> {
  const paths = await ensureControlHome(root);
  return new LeaseManager(paths, new DatabaseSync(paths.database), now);
}

import { readdir, readFile, realpath } from "node:fs/promises";
import { join, sep } from "node:path";

export async function findVaultContext(root: string, query: string): Promise<Array<{ path: string; excerpt: string }>> {
  if (!root) throw new Error("Coffre Obsidian non configuré.");
  const canonical = await realpath(root);
  const terms = [...new Set(query.toLocaleLowerCase("fr").split(/[^\p{L}\p{N}_-]+/u).filter(x => x.length >= 3))].slice(0, 20);
  const matches: Array<{ path: string; excerpt: string; score: number }> = [];
  let scanned = 0;
  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > 12 || scanned >= 2000) return;
    for (const name of await readdir(directory)) {
      if (name.startsWith(".") || /^(node_modules|credentials|backups)$/i.test(name) || scanned >= 2000) continue;
      const path = join(directory, name);
      const resolved = await realpath(path).catch(() => "");
      if (!resolved.startsWith(canonical + sep)) continue;
      const { lstat } = await import("node:fs/promises");
      const info = await lstat(path);
      if (info.isDirectory()) { await walk(path, depth + 1); continue; }
      if (!name.toLowerCase().endsWith(".md")) continue;
      scanned += 1;
      const content = await readFile(path, "utf8").catch(() => "");
      if (content.length > 200000) continue;
      const lower = content.toLocaleLowerCase("fr");
      const hits = terms.map(term => lower.indexOf(term)).filter(index => index >= 0);
      if (!hits.length) continue;
      const start = Math.max(0, Math.min(...hits) - 150);
      matches.push({ path: path.slice(canonical.length + 1), excerpt: content.slice(start, start + 850), score: hits.length });
    }
  }
  await walk(canonical, 0);
  return matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, 6).map(({ path, excerpt }) => ({ path, excerpt }));
}

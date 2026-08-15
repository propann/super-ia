import { execFileSync } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'data', 'projects.json');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

try {
  const raw = execFileSync('gh', [
    'repo', 'list',
    '--limit', '200',
    '--json', 'nameWithOwner,name,description,url,defaultBranchRef,updatedAt,isPrivate,isArchived'
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  const repositories = JSON.parse(raw);
  const projects = repositories
    .filter((repo) => !repo.isArchived)
    .map((repo) => {
      const [owner, name] = String(repo.nameWithOwner).split('/');
      return {
        id: repo.nameWithOwner,
        name: repo.name,
        owner,
        url: repo.url,
        description: repo.description || '',
        default_branch: repo.defaultBranchRef?.name || 'main',
        local_path: `/opt/azoth-ai/projects/${repo.name}`,
        private: Boolean(repo.isPrivate),
        archived: Boolean(repo.isArchived),
        updated_at: repo.updatedAt || null
      };
    });

  const payload = {
    schema_version: 1,
    source: 'gh repo list',
    generated_at: new Date().toISOString(),
    projects
  };

  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, output);
  console.log(`${projects.length} dépôt(s) synchronisé(s) dans ${output}`);
} catch (error) {
  fail('Impossible de synchroniser GitHub. Vérifie `gh auth status`.');
  if (process.env.DEBUG) console.error(error);
}

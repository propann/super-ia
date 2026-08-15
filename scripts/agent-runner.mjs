import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const dataRoot = resolve(process.env.SUPERIA_DATA_ROOT || join(root, 'data'));
const projectRoot = resolve(process.env.SUPERIA_PROJECTS_ROOT || '/opt/azoth-ai/projects');
const queueFile = join(dataRoot, 'agent-queue.jsonl');
const stateFile = join(dataRoot, 'agent-runner-state.json');
const activityFile = join(dataRoot, 'activity.jsonl');

const actions = {
  inspect: [
    { label: 'git status', command: 'git', args: ['status', '--short'] },
    { label: 'dernier commit', command: 'git', args: ['log', '-1', '--oneline'] }
  ],
  validate: [
    { label: 'git diff --check', command: 'git', args: ['diff', '--check'] },
    { label: 'git status', command: 'git', args: ['status', '--short'] }
  ]
};

async function readLines(path) {
  try {
    const text = await readFile(path, 'utf8');
    return text.split('\n').filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch {
    return [];
  }
}

async function writeEvent(event) {
  await mkdir(dataRoot, { recursive: true });
  await appendFile(activityFile, `${JSON.stringify({
    timestamp: new Date().toISOString(),
    source: 'agent-runner',
    ...event
  })}\n`, { mode: 0o600 });
}

async function readState() {
  try { return JSON.parse(await readFile(stateFile, 'utf8')); } catch { return { processed: {} }; }
}

async function runCommand(step, cwd) {
  try {
    const result = await execFileAsync(step.command, step.args, {
      cwd,
      timeout: 45_000,
      maxBuffer: 16 * 1024,
      windowsHide: true
    });
    return { label: step.label, state: 'ok', output: `${result.stdout}${result.stderr}`.trim() };
  } catch (error) {
    return {
      label: step.label,
      state: 'failed',
      output: `${error.stdout || ''}${error.stderr || error.message || ''}`.trim()
    };
  }
}

function safeProjectPath(project) {
  const candidate = resolve(project.local_path || join(projectRoot, project.name));
  if (candidate !== projectRoot && !candidate.startsWith(`${projectRoot}/`)) return null;
  return candidate;
}

const [projectsPayload, queue, state] = await Promise.all([
  readFile(join(dataRoot, 'projects.json'), 'utf8').then(JSON.parse).catch(() => ({ projects: [] })),
  readLines(queueFile),
  readState()
]);

const projects = new Map((projectsPayload.projects || []).map((project) => [project.id, project]));
let processed = state.processed || {};
let handled = 0;

for (const job of queue) {
  if (!job.id || processed[job.id]) continue;
  handled += 1;
  const project = projects.get(job.project_id);
  const steps = actions[job.action] || actions.inspect;
  const cwd = project && safeProjectPath(project);

  await writeEvent({ kind: 'job', state: 'started', job_id: job.id, agent_id: job.agent_id, project_id: job.project_id, action: job.action });

  if (!cwd) {
    await writeEvent({ kind: 'job', state: 'failed', job_id: job.id, agent_id: job.agent_id, project_id: job.project_id, action: job.action, message: 'Chemin de projet absent ou hors de la racine autorisée.' });
    processed[job.id] = { state: 'failed', finished_at: new Date().toISOString() };
    continue;
  }

  const results = [];
  for (const step of steps) {
    const result = await runCommand(step, cwd);
    results.push(result);
    await writeEvent({ kind: 'command', state: result.state, job_id: job.id, agent_id: job.agent_id, project_id: job.project_id, action: job.action, command: [step.command, ...step.args].join(' '), output: result.output });
    if (result.state === 'failed') break;
  }

  const finalState = results.some((result) => result.state === 'failed') ? 'failed' : 'done';
  await writeEvent({ kind: 'job', state: finalState, job_id: job.id, agent_id: job.agent_id, project_id: job.project_id, action: job.action, message: `${results.length} commande(s) allowlistée(s) exécutée(s).` });
  processed[job.id] = { state: finalState, finished_at: new Date().toISOString() };
}

await mkdir(dataRoot, { recursive: true });
await writeFile(stateFile, `${JSON.stringify({ processed }, null, 2)}\n`, { mode: 0o600 });
console.log(`${handled} mission(s) traitée(s).`);

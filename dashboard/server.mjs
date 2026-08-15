import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const publicRoot = resolve(root, 'public');
const configRoot = resolve(process.env.DASHBOARD_CONFIG_DIR || join(root, 'config'));
const dataRoot = resolve(process.env.DASHBOARD_DATA_DIR || join(root, 'data'));
const port = Number(process.env.DASHBOARD_PORT || 8080);

const services = [
  { id: 'n8n', label: 'n8n', url: 'http://n8n:5678/' },
  { id: 'litellm', label: 'LiteLLM', url: 'http://litellm:4000/health/liveliness' },
  { id: 'qdrant', label: 'Qdrant', url: 'http://qdrant:6333/' }
];

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'"
};

function writeHead(response, status, headers = {}) {
  response.writeHead(status, { ...securityHeaders, ...headers });
}

function sendJson(response, status, body) {
  writeHead(response, status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

async function readJsonFile(base, name, fallback) {
  const path = resolve(join(base, name));
  if (!path.startsWith(`${base}/`)) throw new Error('invalid_data_path');
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readConfig(name, fallback = {}) {
  return readJsonFile(configRoot, name, fallback);
}

async function readData(name, fallback = {}) {
  return readJsonFile(dataRoot, name, fallback);
}

async function readJsonLines(name, limit = 100) {
  try {
    const text = await readFile(resolve(join(dataRoot, name)), 'utf8');
    return text.split('\n').filter(Boolean).slice(-limit).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch {
    return [];
  }
}

async function appendEvent(event) {
  await mkdir(dataRoot, { recursive: true });
  await appendFile(
    join(dataRoot, 'activity.jsonl'),
    `${JSON.stringify({ timestamp: new Date().toISOString(), source: 'dashboard', ...event })}\n`,
    { mode: 0o600 }
  );
}

async function probe(service) {
  try {
    const response = await fetch(service.url, { signal: AbortSignal.timeout(2500) });
    return { id: service.id, label: service.label, state: response.ok ? 'up' : 'degraded', code: response.status };
  } catch {
    return { id: service.id, label: service.label, state: 'down', code: null };
  }
}

async function browserStatuses() {
  const config = await readConfig('browser-profiles.json', { schema_version: 1, profiles: [] });
  return Promise.all((config.profiles || []).map(async (profile) => {
    if (!profile.probe_url) return { ...profile, state: 'manual', code: null };
    try {
      const response = await fetch(profile.probe_url, { signal: AbortSignal.timeout(2500) });
      // The browser desktop is protected by Basic Auth. A 401 proves that the
      // container is alive without sending credentials to the dashboard.
      const ready = response.ok || response.status === 401 || response.status === 403;
      return { ...profile, state: ready ? 'up' : 'degraded', code: response.status };
    } catch {
      return { ...profile, state: 'down', code: null };
    }
  }));
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(new Error('body_too_large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

async function enqueueJob(body) {
  const projectsPayload = await readData('projects.json', { projects: [] });
  const agentsPayload = await readConfig('agents.json', { agents: [] });
  const project = (projectsPayload.projects || []).find((item) => item.id === body.project_id);
  const agent = (agentsPayload.agents || []).find((item) => item.id === body.agent_id);
  const action = String(body.action || 'inspect');

  if (!project || !agent) throw new Error('unknown_project_or_agent');
  if (!['inspect', 'validate'].includes(action)) throw new Error('action_not_allowed');

  const job = {
    id: randomUUID(),
    project_id: project.id,
    agent_id: agent.id,
    action,
    task: String(body.task || '').trim().slice(0, 2000),
    requested_at: new Date().toISOString(),
    state: 'queued'
  };

  await mkdir(dataRoot, { recursive: true });
  await appendFile(join(dataRoot, 'agent-queue.jsonl'), `${JSON.stringify(job)}\n`, { mode: 0o600 });
  await appendEvent({ kind: 'job', state: 'queued', job_id: job.id, project_id: job.project_id, agent_id: job.agent_id, action: job.action, message: 'Mission placée dans la file locale.' });
  return job;
}

async function serveStatic(request, response, pathname) {
  const relative = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(join(publicRoot, relative));
  if (!filePath.startsWith(`${publicRoot}/`)) {
    sendJson(response, 403, { error: 'forbidden' });
    return;
  }

  try {
    const body = await readFile(filePath);
    writeHead(response, 200, {
      'content-type': contentTypes[extname(filePath)] || 'application/octet-stream',
      'cache-control': extname(filePath) === '.html' ? 'no-store' : 'public, max-age=300'
    });
    if (request.method !== 'HEAD') response.end(body);
    else response.end();
  } catch {
    sendJson(response, 404, { error: 'not_found' });
  }
}

const server = createServer(async (request, response) => {
  if (!request.url || !['GET', 'HEAD', 'POST'].includes(request.method || '')) {
    sendJson(response, 405, { error: 'method_not_allowed' });
    return;
  }

  const url = new URL(request.url, 'http://127.0.0.1');

  if (url.pathname === '/healthz' && request.method !== 'POST') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (url.pathname === '/api/status' && request.method !== 'POST') {
    const [result, browsers] = await Promise.all([
      Promise.all(services.map(probe)),
      browserStatuses()
    ]);
    sendJson(response, 200, { generated_at: new Date().toISOString(), services: result, browsers });
    return;
  }

  if (url.pathname === '/api/connectors' && request.method !== 'POST') {
    sendJson(response, 200, await readConfig('connectors.json', { schema_version: 1, connectors: [] }));
    return;
  }

  if (url.pathname === '/api/browser-profiles' && request.method !== 'POST') {
    const config = await readConfig('browser-profiles.json', { schema_version: 1, profiles: [] });
    sendJson(response, 200, { ...config, profiles: await browserStatuses() });
    return;
  }

  if (url.pathname === '/api/agents' && request.method !== 'POST') {
    sendJson(response, 200, await readConfig('agents.json', { schema_version: 1, agents: [] }));
    return;
  }

  if (url.pathname === '/api/projects' && request.method !== 'POST') {
    const generated = await readData('projects.json', null);
    sendJson(response, 200, generated || await readConfig('projects.json', { schema_version: 1, projects: [] }));
    return;
  }

  if (url.pathname === '/api/activity' && request.method !== 'POST') {
    sendJson(response, 200, { events: await readJsonLines('activity.jsonl', 120) });
    return;
  }

  if (url.pathname === '/api/queue' && request.method === 'GET') {
    sendJson(response, 200, { jobs: await readJsonLines('agent-queue.jsonl', 80) });
    return;
  }

  if (url.pathname === '/api/queue' && request.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(request));
      sendJson(response, 202, { job: await enqueueJob(body) });
    } catch (error) {
      const status = error.message === 'body_too_large' ? 413 : 400;
      sendJson(response, status, { error: error.message || 'invalid_request' });
    }
    return;
  }

  if (request.method === 'POST') {
    sendJson(response, 405, { error: 'post_not_allowed' });
    return;
  }

  await serveStatic(request, response, url.pathname);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Super IA dashboard listening on ${port}`);
});

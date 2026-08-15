import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const publicRoot = resolve(root, 'public');
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

async function probe(service) {
  try {
    const response = await fetch(service.url, { signal: AbortSignal.timeout(2500) });
    return { id: service.id, label: service.label, state: response.ok ? 'up' : 'degraded', code: response.status };
  } catch {
    return { id: service.id, label: service.label, state: 'down', code: null };
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
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
    response.writeHead(200, { 'content-type': contentTypes[extname(filePath)] || 'application/octet-stream' });
    if (request.method !== 'HEAD') response.end(body);
    else response.end();
  } catch {
    sendJson(response, 404, { error: 'not_found' });
  }
}

const server = createServer(async (request, response) => {
  if (!request.url || !['GET', 'HEAD'].includes(request.method || '')) {
    sendJson(response, 405, { error: 'method_not_allowed' });
    return;
  }

  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/healthz') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (url.pathname === '/api/status') {
    const result = await Promise.all(services.map(probe));
    sendJson(response, 200, { generated_at: new Date().toISOString(), services: result });
    return;
  }

  await serveStatic(request, response, url.pathname);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Super IA dashboard listening on ${port}`);
});

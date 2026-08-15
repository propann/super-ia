import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const publicRoot = resolve(root, 'public');
const configRoot = resolve(process.env.DASHBOARD_CONFIG_DIR || join(root, 'config'));
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

async function probe(service) {
  try {
    const response = await fetch(service.url, { signal: AbortSignal.timeout(2500) });
    return { id: service.id, label: service.label, state: response.ok ? 'up' : 'degraded', code: response.status };
  } catch {
    return { id: service.id, label: service.label, state: 'down', code: null };
  }
}

function sendJson(response, status, body) {
  writeHead(response, status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

async function readConfig(name) {
  const path = resolve(join(configRoot, name));
  if (!path.startsWith(`${configRoot}/`)) throw new Error('invalid_config_path');
  return JSON.parse(await readFile(path, 'utf8'));
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

  if (url.pathname === '/api/connectors') {
    try {
      sendJson(response, 200, await readConfig('connectors.json'));
    } catch {
      sendJson(response, 503, { error: 'connectors_unavailable' });
    }
    return;
  }

  if (url.pathname === '/api/browser-profiles') {
    try {
      sendJson(response, 200, await readConfig('browser-profiles.json'));
    } catch {
      sendJson(response, 503, { error: 'browser_profiles_unavailable' });
    }
    return;
  }

  await serveStatic(request, response, url.pathname);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Super IA dashboard listening on ${port}`);
});

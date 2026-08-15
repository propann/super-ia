const services = document.querySelector('#services');
const browserTools = document.querySelector('#browser-tools');
const overallDot = document.querySelector('#overall-dot');
const overallLabel = document.querySelector('#overall-label');
const lastCheck = document.querySelector('#last-check');
const toast = document.querySelector('#toast');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showToast(message) {
  toast.textContent = message;
  window.setTimeout(() => {
    if (toast.textContent === message) toast.textContent = '';
  }, 1800);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast('commande copiée');
  } catch {
    showToast('copie refusée par le navigateur');
  }
}

function serviceCard(service) {
  const labels = { up: 'opérationnel', degraded: 'réponse dégradée', down: 'injoignable' };
  const card = el('article', 'card service-card');
  const top = el('div', 'card-top');
  top.append(el('h3', '', service.label), el('span', 'mode', String(service.code ?? '—')));
  const state = el('div', 'service-state');
  state.append(el('span', `dot ${service.state}`), el('span', '', labels[service.state] || 'inconnu'));
  card.append(top, state);
  return card;
}

function profileCard(profile) {
  const accent = ['orange', 'blue', 'purple', 'green'].includes(profile.accent) ? profile.accent : 'green';
  const card = el('article', `card tool-card accent-${accent}`);
  const top = el('div', 'card-top');
  top.append(el('span', 'icon', profile.icon || '◉'), el('span', 'mode', 'NAVIGATEUR ISOLÉ'));

  const title = el('h3', '', profile.label);
  const description = el('p', '', profile.description);
  const capabilities = el('div', 'profile-meta');
  for (const capability of profile.capabilities || []) {
    capabilities.append(el('span', 'tag', capability));
  }

  const actions = el('div', 'tool-actions');
  const open = el('a', 'button', 'Ouvrir le web');
  open.href = profile.url;
  open.target = '_blank';
  open.rel = 'noreferrer';

  const copy = el('button', 'button secondary', 'Copier lancement isolé');
  copy.type = 'button';
  copy.addEventListener('click', () => copyText(profile.command));

  actions.append(open, copy);
  card.append(top, title, description, capabilities, actions);
  return card;
}

async function refreshStatus() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('status_unavailable');
    const payload = await response.json();

    services.replaceChildren(...payload.services.map(serviceCard));
    const states = payload.services.map((item) => item.state);
    const allUp = states.every((state) => state === 'up');
    const someUp = states.some((state) => state === 'up');
    overallDot.className = `dot ${allUp ? 'up' : someUp ? 'degraded' : 'down'}`;
    overallLabel.textContent = allUp ? 'Tout est opérationnel' : someUp ? 'État partiel' : 'Services à vérifier';
    lastCheck.textContent = new Date(payload.generated_at).toLocaleTimeString('fr-FR');
  } catch {
    overallDot.className = 'dot down';
    overallLabel.textContent = 'Dashboard déconnecté';
  }
}

async function loadBrowserProfiles() {
  try {
    const response = await fetch('/api/browser-profiles', { cache: 'no-store' });
    if (!response.ok) throw new Error('profiles_unavailable');
    const payload = await response.json();
    browserTools.replaceChildren(...payload.profiles.map(profileCard));
  } catch {
    browserTools.replaceChildren(el('article', 'card empty-card', 'Registre navigateur indisponible.'));
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-copy]');
  if (button) copyText(button.dataset.copy);
});

refreshStatus();
loadBrowserProfiles();
window.setInterval(refreshStatus, 10000);

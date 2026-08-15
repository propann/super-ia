const services = document.querySelector('#services');
const connectors = document.querySelector('#connectors');
const browserTools = document.querySelector('#browser-tools');
const agents = document.querySelector('#agents');
const activity = document.querySelector('#activity');
const projectSelect = document.querySelector('#project-select');
const agentSelect = document.querySelector('#agent-select');
const actionSelect = document.querySelector('#action-select');
const taskInput = document.querySelector('#task-input');
const queueButton = document.querySelector('#queue-task');
const queueState = document.querySelector('#queue-state');
const projectSummary = document.querySelector('#project-summary');
const projectCount = document.querySelector('#project-count');
const overallDot = document.querySelector('#overall-dot');
const overallLabel = document.querySelector('#overall-label');
const lastCheck = document.querySelector('#last-check');
const toast = document.querySelector('#toast');

const state = { projects: [], agents: [], profiles: [] };

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
  }, 2200);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast('commande copiée');
  } catch {
    showToast('copie refusée par le navigateur');
  }
}

function statusLabel(status) {
  return { up: 'en ligne', degraded: 'réponse dégradée', down: 'hors ligne', manual: 'manuel' }[status] || 'inconnu';
}

function serviceCard(service) {
  const card = el('article', 'card service-card');
  const top = el('div', 'card-top');
  top.append(el('h3', '', service.label), el('span', 'mode', String(service.code ?? '—')));
  const status = el('div', 'service-state');
  status.append(el('span', `dot ${service.state}`), el('span', '', statusLabel(service.state)));
  card.append(top, status);
  return card;
}

function connectorCard(connector) {
  const accent = ['orange', 'blue', 'purple', 'green'].includes(connector.accent) ? connector.accent : 'green';
  const card = el('article', `card connector-card accent-${accent}`);
  const top = el('div', 'card-top');
  top.append(el('span', 'icon', connector.icon || '◉'), el('span', 'mode', 'CONNECTEUR'));
  card.append(top, el('h3', '', connector.label));
  const modes = el('div', 'profile-meta');
  for (const mode of connector.preferred_modes || []) modes.append(el('span', 'tag', mode));
  card.append(modes);
  const sensitive = connector.sensitive_actions || [];
  card.append(el('p', 'muted', sensitive.length ? `Validation humaine : ${sensitive.join(', ')}` : 'Aucune action sensible déclarée.'));
  return card;
}

function profileCard(profile) {
  const accent = ['orange', 'blue', 'purple', 'green'].includes(profile.accent) ? profile.accent : 'green';
  const card = el('article', `card tool-card accent-${accent}`);
  const top = el('div', 'card-top');
  top.append(el('span', 'icon', profile.icon || '◉'), el('span', 'mode', 'CHROMIUM // PI'));
  const titleLine = el('div', 'title-line');
  titleLine.append(el('h3', '', profile.label), el('span', `mini-state ${profile.state || 'manual'}`, statusLabel(profile.state || 'manual')));
  card.append(top, titleLine, el('p', '', profile.description));
  const capabilities = el('div', 'profile-meta');
  for (const capability of profile.capabilities || []) capabilities.append(el('span', 'tag', capability));
  card.append(capabilities);

  const actions = el('div', 'tool-actions');
  const open = el('a', 'button', profile.remote_url ? 'Ouvrir sur le Pi' : 'Ouvrir le web');
  open.href = profile.remote_url || profile.url;
  open.target = '_blank';
  open.rel = 'noreferrer';
  const copy = el('button', 'button secondary', 'Copier démarrage');
  copy.type = 'button';
  copy.addEventListener('click', () => copyText(profile.command));
  actions.append(open, copy);
  card.append(actions);
  return card;
}

function agentCard(agent) {
  const accent = ['orange', 'blue', 'purple', 'green'].includes(agent.accent) ? agent.accent : 'green';
  const card = el('article', `card agent-card accent-${accent}`);
  const top = el('div', 'card-top');
  top.append(el('span', 'icon', agent.icon || '◎'), el('span', 'mode', agent.approval || 'agent'));
  card.append(top, el('h3', '', agent.label), el('p', '', agent.role));
  const tags = el('div', 'profile-meta');
  for (const connector of agent.connectors || []) tags.append(el('span', 'tag', connector.replace('-web', '')));
  card.append(tags);
  return card;
}

function updateProjectSummary() {
  const project = state.projects.find((item) => item.id === projectSelect.value);
  projectSummary.replaceChildren();
  if (!project) {
    projectSummary.append(el('span', 'muted', 'Aucun dépôt sélectionné.'));
    return;
  }
  projectSummary.append(el('strong', '', project.name));
  projectSummary.append(el('span', 'muted', ` ${project.default_branch || 'main'} · ${project.local_path || 'chemin local non défini'}`));
}

function populateControls() {
  projectSelect.replaceChildren();
  if (!state.projects.length) {
    projectSelect.append(el('option', '', 'Synchronise d’abord tes dépôts'));
    projectSelect.disabled = true;
  } else {
    projectSelect.disabled = false;
    for (const project of state.projects) projectSelect.append(new Option(`${project.owner || ''}/${project.name}`, project.id));
  }

  agentSelect.replaceChildren();
  for (const agent of state.agents) agentSelect.append(new Option(agent.label, agent.id));
  projectCount.textContent = state.projects.length ? `${state.projects.length} dépôt(s)` : 'non synchronisés';
  updateProjectSummary();
}

function renderActivity(events) {
  activity.replaceChildren();
  if (!events.length) {
    activity.append(el('p', 'muted', 'Aucune activité pour le moment. Lance une mission depuis le cockpit.'));
    return;
  }
  for (const event of [...events].reverse()) {
    const row = el('article', 'activity-row');
    const top = el('div', 'activity-top');
    const when = event.timestamp ? new Date(event.timestamp).toLocaleTimeString('fr-FR') : '—';
    top.append(el('strong', '', event.kind || 'événement'), el('span', 'mode', `${when} · ${event.state || 'info'}`));
    row.append(top);
    if (event.project_id || event.agent_id) row.append(el('div', 'activity-context', `${event.agent_id || 'système'} → ${event.project_id || 'plan de contrôle'}`));
    if (event.command) row.append(el('code', 'activity-command', event.command));
    if (event.message) row.append(el('p', 'muted', event.message));
    if (event.output) row.append(el('pre', 'activity-output', event.output));
    activity.append(row);
  }
}

async function refreshStatus() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('status_unavailable');
    const payload = await response.json();
    services.replaceChildren(...payload.services.map(serviceCard));
    state.profiles = payload.browsers || [];
    browserTools.replaceChildren(...state.profiles.map(profileCard));
    const states = payload.services.map((item) => item.state);
    const allUp = states.every((item) => item === 'up');
    const someUp = states.some((item) => item === 'up');
    overallDot.className = `dot ${allUp ? 'up' : someUp ? 'degraded' : 'down'}`;
    overallLabel.textContent = allUp ? 'Plan de contrôle opérationnel' : someUp ? 'État partiel' : 'Services à vérifier';
    lastCheck.textContent = new Date(payload.generated_at).toLocaleTimeString('fr-FR');
  } catch {
    overallDot.className = 'dot down';
    overallLabel.textContent = 'Dashboard déconnecté';
  }
}

async function loadControlPlane() {
  try {
    const [connectorPayload, projectPayload, agentPayload] = await Promise.all([
      fetch('/api/connectors', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/projects', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/agents', { cache: 'no-store' }).then((response) => response.json())
    ]);
    connectors.replaceChildren(...(connectorPayload.connectors || []).map(connectorCard));
    state.projects = projectPayload.projects || [];
    state.agents = agentPayload.agents || [];
    agents.replaceChildren(...state.agents.map(agentCard));
    populateControls();
  } catch {
    connectors.replaceChildren(el('article', 'card empty-card', 'Registre indisponible.'));
  }
}

async function refreshActivity() {
  try {
    const response = await fetch('/api/activity', { cache: 'no-store' });
    if (response.ok) renderActivity((await response.json()).events || []);
  } catch {
    // The status banner already signals a disconnected dashboard.
  }
}

async function queueMission() {
  queueState.textContent = '';
  if (!projectSelect.value || !agentSelect.value) {
    queueState.textContent = 'Choisis un projet et un agent.';
    return;
  }
  queueButton.disabled = true;
  try {
    const response = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project_id: projectSelect.value,
        agent_id: agentSelect.value,
        action: actionSelect.value,
        task: taskInput.value
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'queue_failed');
    queueState.textContent = `Mission armée : ${payload.job.id.slice(0, 8)}`;
    taskInput.value = '';
    await refreshActivity();
  } catch (error) {
    queueState.textContent = `Échec : ${error.message}`;
  } finally {
    queueButton.disabled = false;
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-copy]');
  if (button) copyText(button.dataset.copy);
});
projectSelect.addEventListener('change', updateProjectSummary);
queueButton.addEventListener('click', queueMission);

refreshStatus();
loadControlPlane();
refreshActivity();
window.setInterval(refreshStatus, 10000);
window.setInterval(refreshActivity, 2500);

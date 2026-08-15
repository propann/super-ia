const services = document.querySelector('#services');
const overallDot = document.querySelector('#overall-dot');
const overallLabel = document.querySelector('#overall-label');
const lastCheck = document.querySelector('#last-check');
const toast = document.querySelector('#toast');

function serviceCard(service) {
  const labels = { up: 'opérationnel', degraded: 'réponse dégradée', down: 'injoignable' };
  return `<article class="card service-card"><div class="card-top"><h3>${service.label}</h3><span class="mode">${service.code ?? '—'}</span></div><div class="service-state"><span class="dot ${service.state}"></span><span>${labels[service.state]}</span></div></article>`;
}

async function refresh() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const payload = await response.json();
    services.innerHTML = payload.services.map(serviceCard).join('');
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

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(button.dataset.copy);
    toast.textContent = 'commande copiée';
    setTimeout(() => { toast.textContent = ''; }, 1600);
  });
});

refresh();
setInterval(refresh, 10000);

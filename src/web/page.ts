function shell(title: string, body: string, script = ""): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
:root{color-scheme:dark;--bg:#050806;--panel:#0b120d;--line:#1e3b27;--green:#7cff96;--muted:#8ca493;--amber:#ffbd59;--red:#ff6b6b;--white:#e8f1ea}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#102018 0,#050806 42%);color:var(--white);font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
a{color:var(--green)}button,input,select{font:inherit}.wrap{max-width:1280px;margin:auto;padding:24px}.top{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-bottom:20px}.brand{font-size:22px;font-weight:800;letter-spacing:.08em;color:var(--green)}.sub{color:var(--muted)}.panel{background:rgba(11,18,13,.94);border:1px solid var(--line);box-shadow:0 12px 40px #0008;padding:16px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card{background:#081009;border:1px solid var(--line);padding:14px}.value{font-size:24px;color:var(--green);font-weight:800}.label{color:var(--muted);text-transform:uppercase;font-size:11px;letter-spacing:.08em}.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.controls select,.login input{background:#030604;color:var(--white);border:1px solid var(--line);padding:10px}.btn{background:var(--green);color:#021005;border:0;padding:10px 14px;font-weight:800;cursor:pointer}.btn.secondary{background:#17231a;color:var(--white);border:1px solid var(--line)}table{border-collapse:collapse;width:100%;display:block;overflow:auto}th,td{border-bottom:1px solid #16251b;padding:9px 10px;text-align:left;white-space:nowrap}th{color:var(--muted);font-size:11px;text-transform:uppercase}.status{font-weight:800}.pass,.completed,.done,.ready,.success,.libre{color:var(--green)}.warn,.warning,.running,.review{color:var(--amber)}.fail,.error,.failed,.blocked,.interrupted,.engag{color:var(--red)}.info{color:var(--white)}.empty{color:var(--muted);padding:20px 0}.login{max-width:520px;margin:12vh auto}.login input{width:100%;margin:14px 0}.error{color:var(--red);min-height:1.5em}.section-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.section-title h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;margin:0;color:var(--green)}code{color:#c8fbd2}.pill{display:inline-block;border:1px solid var(--line);padding:2px 7px;border-radius:999px}.footer{color:var(--muted);text-align:center;padding:20px}.emergency{display:none;border-color:var(--red);color:var(--red);font-weight:800}
</style>
</head>
<body>${body}${script ? `<script>${script}</script>` : ""}</body>
</html>`;
}

export function renderLoginPage(error = ""): string {
  return shell("Super IA — connexion", `<main class="wrap login">
  <section class="panel">
    <div class="brand">SUPER IA // LOCAL ACCESS</div>
    <p class="sub">Interface locale en lecture seule. Le token reste dans <code>SUPERIA_HOME/web/access.token</code>.</p>
    <form method="post" action="/session">
      <label for="token">Token local</label>
      <input id="token" name="token" type="password" autocomplete="current-password" required autofocus>
      <div class="error">${error}</div>
      <button class="btn" type="submit">OUVRIR LA MATRICE</button>
    </form>
  </section>
</main>`);
}

const dashboardScript = `
const el = (id) => document.getElementById(id);
const text = (value) => value === undefined || value === null || value === '' ? '-' : String(value);
const cls = (value) => String(value || '').toLowerCase().replace(/[^a-z-]/g, '');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function api(path){
  const response = await fetch(path,{headers:{'Accept':'application/json'},cache:'no-store'});
  if(response.status===401){location.href='/login';throw new Error('session expirée');}
  if(!response.ok) throw new Error((await response.json().catch(()=>({}))).error || ('HTTP '+response.status));
  return response.json();
}
function rows(items, columns){
  if(!items.length) return '<tr><td class="empty" colspan="'+columns.length+'">Aucune donnée</td></tr>';
  return items.map((item)=>'<tr>'+columns.map((column)=>'<td>'+column(item)+'</td>').join('')+'</tr>').join('');
}
function status(value){return '<span class="status '+cls(value)+'">'+esc(text(value))+'</span>';}
async function load(projectId){
  el('error').textContent='';
  const query = projectId ? '?projectId='+encodeURIComponent(projectId) : '';
  try{
    const data=await api('/api/overview'+query);
    const selector=el('project');
    selector.innerHTML=data.projects.map((project)=>'<option value="'+esc(project.id)+'" '+(data.selectedProject?.id===project.id?'selected':'')+'>'+esc(project.name)+'</option>').join('');
    const stopLabel=data.emergencyStop.engaged?'ENGAGÉ':'LIBRE';
    el('cards').innerHTML=[
      ['Projets',data.status.projects],['Missions',data.status.tasks],['Runs',data.status.runs],['Runs actifs',data.status.activeRuns],['Arrêt urgence',stopLabel],['Readiness',data.readiness?.overall || 'indisponible']
    ].map((item)=>'<div class="card"><div class="label">'+esc(item[0])+'</div><div class="value '+cls(item[1])+'">'+esc(item[1])+'</div></div>').join('');
    const banner=el('emergency');
    if(data.emergencyStop.engaged){
      banner.style.display='block';
      banner.textContent='ARRÊT D’URGENCE ENGAGÉ · '+text(data.emergencyStop.category)+' · génération '+text(data.emergencyStop.generation)+' · seuls diagnostics et dry-runs autorisés';
    }else{banner.style.display='none';banner.textContent='';}
    el('project-meta').textContent=data.selectedProject ? data.selectedProject.root+' · '+text(data.selectedProject.defaultBranch) : 'Aucun projet enregistré';
    el('tasks').innerHTML=rows(data.tasks,[
      (x)=>esc(x.id),(x)=>esc(x.title),(x)=>status(x.status),(x)=>esc(text(x.provider)),(x)=>esc(text(x.branchName)),(x)=>esc(text(x.updatedAt))
    ]);
    el('runs').innerHTML=rows(data.runs,[
      (x)=>esc(x.id.slice(0,12)),(x)=>esc(text(x.taskId)),(x)=>esc(x.provider),(x)=>status(x.status),(x)=>esc(x.startedAt),(x)=>esc(text(x.finishedAt))
    ]);
    el('notifications').innerHTML=rows(data.notifications,[
      (x)=>esc(x.createdAt),(x)=>status(x.level),(x)=>esc(x.title),(x)=>esc(x.message),(x)=>esc(x.kind)
    ]);
    el('events').innerHTML=rows(data.events,[
      (x)=>esc(x.id),(x)=>esc(x.type),(x)=>esc(x.aggregateType),(x)=>esc(x.aggregateId.slice(0,18)),(x)=>esc(x.createdAt)
    ]);
    const readiness=data.readiness;
    el('readiness').innerHTML=readiness ? readiness.checks.map((x)=>'<div class="card"><div class="label">'+esc(x.label)+'</div><div class="status '+cls(x.level)+'">'+esc(x.level.toUpperCase())+'</div><div>'+esc(x.summary)+'</div></div>').join('') : '<div class="empty">'+esc(data.readinessError || 'Readiness indisponible')+'</div>';
    el('generated').textContent='Actualisé '+new Date().toLocaleString();
  }catch(error){el('error').textContent=error instanceof Error?error.message:String(error);}
}
el('project').addEventListener('change',(event)=>load(event.target.value));
el('refresh').addEventListener('click',()=>load(el('project').value));
load('');
setInterval(()=>load(el('project').value),30000);
`;

export function renderDashboardPage(): string {
  return shell("Super IA — matrice locale", `<main class="wrap">
  <header class="top"><div><div class="brand">SUPER IA // CONTROL MATRIX</div><div class="sub" id="generated">Chargement…</div></div><form method="post" action="/logout"><button class="btn secondary" type="submit">FERMER LA SESSION</button></form></header>
  <section class="panel emergency" id="emergency"></section>
  <section class="panel controls"><label for="project">Projet</label><select id="project"><option>Chargement…</option></select><button class="btn" id="refresh" type="button">ACTUALISER</button><span class="error" id="error"></span></section>
  <section class="grid" id="cards"></section>
  <section class="panel"><div class="section-title"><h2>Projet sélectionné</h2><span class="sub" id="project-meta"></span></div><table><thead><tr><th>ID</th><th>Mission</th><th>Statut</th><th>Agent</th><th>Branche</th><th>Mise à jour</th></tr></thead><tbody id="tasks"></tbody></table></section>
  <section class="panel"><div class="section-title"><h2>Runs récents</h2></div><table><thead><tr><th>Run</th><th>Mission</th><th>Agent</th><th>Statut</th><th>Début</th><th>Fin</th></tr></thead><tbody id="runs"></tbody></table></section>
  <section class="panel"><div class="section-title"><h2>Notifications locales</h2></div><table><thead><tr><th>Date</th><th>Niveau</th><th>Titre</th><th>Message</th><th>Type</th></tr></thead><tbody id="notifications"></tbody></table></section>
  <section class="panel"><div class="section-title"><h2>Readiness hors ligne</h2></div><div class="grid" id="readiness"></div></section>
  <section class="panel"><div class="section-title"><h2>Événements récents</h2></div><table><thead><tr><th>ID</th><th>Type</th><th>Agrégat</th><th>Cible</th><th>Date</th></tr></thead><tbody id="events"></tbody></table></section>
  <div class="footer">Lecture seule · arrêt d'urgence via CLI uniquement · boucle locale · aucune CORS · rafraîchissement 30 s</div>
</main>`, dashboardScript);
}

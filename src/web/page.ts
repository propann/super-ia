function shell(title: string, body: string, script = ""): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>.arena-columns{grid-template-columns:repeat(3,minmax(0,1fr))}.arena-grid{grid-template-columns:repeat(auto-fit,minmax(118px,1fr))}.entity-card{min-height:68px;padding:8px}.entity-icon{width:24px;height:24px;margin-bottom:5px}.entity-meta{font-size:10px;margin-top:2px}.console-preview{display:block;margin:7px 0 6px;padding:6px;min-height:42px;max-height:58px;overflow:hidden;background:#020503;border:1px solid #16351e;border-radius:7px;color:#9edaa7;font-size:10px;line-height:1.35;white-space:pre-wrap}.console-actions{display:flex;justify-content:flex-end}.card-expand{border:1px solid #315d3a;border-radius:6px;background:#102317;color:var(--green);padding:4px 7px;font-size:10px;font-weight:800;cursor:pointer}.console-drawer{display:none;position:fixed;inset:0;z-index:20;padding:8vh 18px;background:#000b}.console-drawer.open{display:grid;place-items:center}.console-window{width:min(900px,100%);max-height:80vh;background:#071009;border:1px solid var(--green);border-radius:16px;box-shadow:0 20px 80px #000;overflow:hidden}.console-window pre{margin:0;padding:18px;min-height:260px;max-height:55vh;overflow:auto;background:#020503;color:#a9f5b5;font-size:12px;line-height:1.5;white-space:pre-wrap}.console-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line)}.console-head strong{color:var(--green)}.group-chip{display:flex;align-items:center;gap:8px}.group-chip .btn{padding:4px 8px;font-size:10px;margin-left:auto}@media(max-width:980px){.arena-columns{grid-template-columns:1fr 1fr}}@media(max-width:760px){.arena-columns{grid-template-columns:1fr}}</style>
<style>
:root{color-scheme:dark;--bg:#050806;--panel:#0b120d;--line:#1e3b27;--green:#7cff96;--muted:#8ca493;--amber:#ffbd59;--red:#ff6b6b;--white:#e8f1ea}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#102018 0,#050806 42%);color:var(--white);font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
a{color:var(--green)}button,input,select{font:inherit}.wrap{max-width:1280px;margin:auto;padding:24px}.top{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-bottom:20px}.brand{font-size:22px;font-weight:800;letter-spacing:.08em;color:var(--green)}.sub{color:var(--muted)}.panel{background:rgba(11,18,13,.94);border:1px solid var(--line);box-shadow:0 12px 40px #0008;padding:16px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.card{background:#081009;border:1px solid var(--line);padding:14px}.arena-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.entity-card{appearance:none;text-align:left;width:100%;min-height:78px;background:#081009;border:1px solid var(--line);border-radius:12px;padding:10px;color:var(--white);cursor:pointer;transition:.15s transform,.15s border-color,.15s background}.entity-card:hover{transform:translateY(-2px);border-color:var(--green)}.entity-card.selected{border-color:var(--green);background:#102317;box-shadow:0 0 0 1px var(--green) inset}.entity-icon{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#14271a;color:var(--green);font-weight:900;margin-bottom:7px}.entity-name{display:block;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.entity-meta{display:block;color:var(--muted);font-size:11px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.arena-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.arena-column{min-width:0}.pair-card{min-height:142px;border:1px solid var(--green);border-radius:16px;background:linear-gradient(135deg,#112319,#081009);padding:14px;display:grid;grid-template-columns:1fr 28px 1fr;gap:10px;align-items:center}.pair-side{min-width:0}.pair-side strong,.pair-side span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pair-side span{color:var(--muted);font-size:11px;margin-top:4px}.pair-link{font-size:20px;color:var(--amber);text-align:center}.group-list{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.group-chip{border:1px solid var(--line);border-radius:999px;padding:6px 9px;background:#0d1b11;color:var(--white);font-size:11px}.value{font-size:24px;color:var(--green);font-weight:800}.label{color:var(--muted);text-transform:uppercase;font-size:11px;letter-spacing:.08em}.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.controls select,.login input{background:#030604;color:var(--white);border:1px solid var(--line);padding:10px}.btn{background:var(--green);color:#021005;border:0;padding:10px 14px;font-weight:800;cursor:pointer}.btn.secondary{background:#17231a;color:var(--white);border:1px solid var(--line)}table{border-collapse:collapse;width:100%;display:block;overflow:auto}th,td{border-bottom:1px solid #16251b;padding:9px 10px;text-align:left;white-space:nowrap}th{color:var(--muted);font-size:11px;text-transform:uppercase}.status{font-weight:800}.pass,.completed,.done,.ready,.success,.libre{color:var(--green)}.warn,.warning,.running,.review{color:var(--amber)}.fail,.error,.failed,.blocked,.interrupted,.engag{color:var(--red)}.info{color:var(--white)}.empty{color:var(--muted);padding:20px 0}.login{max-width:520px;margin:12vh auto}.login input{width:100%;margin:14px 0}.error{color:var(--red);min-height:1.5em}.section-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.section-title h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;margin:0;color:var(--green)}code{color:#c8fbd2}.pill{display:inline-block;border:1px solid var(--line);padding:2px 7px;border-radius:999px}.footer{color:var(--muted);text-align:center;padding:20px}.emergency{display:none;border-color:var(--red);color:var(--red);font-weight:800}@media(max-width:760px){.arena-columns{grid-template-columns:1fr}.wrap{padding:14px}.pair-card{grid-template-columns:1fr}.pair-link{transform:rotate(90deg)}}
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
let arenaState={selected:[],groups:[]};
function saveArena(){void fetch('/api/arena',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(arenaState)}).catch(()=>{});}
function entityKey(type,id){return type+':'+id;}
function selectEntity(type,id){const key=entityKey(type,id);arenaState.selected=arenaState.selected.includes(key)?arenaState.selected.filter((x)=>x!==key):[...arenaState.selected,key];saveArena();renderArena(window.arenaData||{});}
function consoleLines(machine){return ['[SUPER IA] Console aperçue — '+String(machine.state||'inconnue').toUpperCase(),'CIBLE '+String(machine.user||'user')+'@'+String(machine.host||'hôte')+':'+String(machine.port||22),...(Array.isArray(machine.reasons)?machine.reasons.slice(0,3):[]),machine.networkChecked===false?'[INFO] Aucun test réseau automatique':'' ].filter(Boolean);}
function openConsole(id){const machine=(window.arenaData?.machines||[]).find((item)=>item.id===id);if(!machine)return;el('console-title').textContent=machine.label||id;el('console-meta').textContent=String(machine.platform||'machine').toUpperCase()+' · '+String(machine.transport||'ssh').toUpperCase();el('console-output').textContent=consoleLines(machine).join('\n');el('console-drawer').classList.add('open');}
function closeConsole(){el('console-drawer').classList.remove('open');}
function dragEntity(event,type,id){event.dataTransfer.setData('text/superia-entity',entityKey(type,id));event.dataTransfer.effectAllowed='move';}
function dropEntity(event,type,id){event.preventDefault();const source=event.dataTransfer.getData('text/superia-entity');if(!source)return;mergeGroup(source,entityKey(type,id));}
function mergeGroup(source,target){if(source===target)return;const groups=arenaState.groups.map((group)=>[...new Set(group)]);const sourceGroup=groups.find((group)=>group.includes(source))||[source];const targetGroup=groups.find((group)=>group.includes(target))||[target];const remaining=groups.filter((group)=>group!==sourceGroup&&group!==targetGroup);arenaState.groups=[...remaining,[...new Set([...sourceGroup,...targetGroup])]];arenaState.selected=[];saveArena();renderArena(window.arenaData||{});}
function dropOnGroup(event,index){event.preventDefault();const source=event.dataTransfer.getData('text/superia-entity');if(!source)return;const groups=arenaState.groups.map((group)=>[...group]);const sourceIndex=groups.findIndex((group)=>group.includes(source));if(sourceIndex>=0&&sourceIndex!==index){groups[index]=[...new Set([...groups[index],...groups[sourceIndex])];groups.splice(sourceIndex,1);}else if(!groups[index].includes(source)){groups[index].push(source);}arenaState.groups=groups;arenaState.selected=[];saveArena();renderArena(window.arenaData||{});}
function groupSelected(){if(arenaState.selected.length<2)return;arenaState.groups.push([...new Set(arenaState.selected)]);arenaState.selected=[];saveArena();renderArena(window.arenaData||{});}
function dissolveGroup(index){arenaState.groups.splice(index,1);saveArena();renderArena(window.arenaData||{});}
function renderArena(data){
  window.arenaData=data;
  const agents=data.connections||[], machines=data.machines||[], projects=data.projects||[];
  const agentCards=agents.map((x)=>'<button draggable="true" ondragstart="dragEntity(event,\'agent\',\''+esc(x.id)+'\')" ondragover="event.preventDefault()" ondrop="dropEntity(event,\'agent\',\''+esc(x.id)+'\')" class="entity-card '+(arenaState.selected.includes(entityKey('agent',x.id))?'selected':'')+'" type="button" onclick="selectEntity(\'agent\',\''+esc(x.id)+'\')"><span class="entity-icon">AI</span><span class="entity-name">'+esc(x.label)+'</span><span class="entity-meta">'+esc(x.kind)+' · '+esc(x.state)+'</span></button>').join('');
  const machineCards=machines.map((x)=>'<article draggable="true" ondragstart="dragEntity(event,\'machine\',\''+esc(x.id)+'\')" ondragover="event.preventDefault()" ondrop="dropEntity(event,\'machine\',\''+esc(x.id)+'\')" class="entity-card '+(arenaState.selected.includes(entityKey('machine',x.id))?'selected':'')+'" onclick="selectEntity(\'machine\',\''+esc(x.id)+'\')"><span class="entity-icon">⌘</span><span class="entity-name">'+esc(x.label)+'</span><span class="entity-meta">'+esc(x.platform)+' · '+esc(x.state)+'</span><pre class="console-preview">'+esc(consoleLines(x).slice(0,3).join('\n'))+'</pre><span class="console-actions"><button class="card-expand" type="button" onclick="event.stopPropagation();openConsole(\''+esc(x.id)+'\')">AGRANDIR</button></span></article>').join('');
  const projectCards=projects.map((x)=>'<button draggable="true" ondragstart="dragEntity(event,\'project\',\''+esc(x.id)+'\')" ondragover="event.preventDefault()" ondrop="dropEntity(event,\'project\',\''+esc(x.id)+'\')" class="entity-card '+(arenaState.selected.includes(entityKey('project',x.id))?'selected':'')+'" type="button" onclick="selectEntity(\'project\',\''+esc(x.id)+'\')"><span class="entity-icon">G</span><span class="entity-name">'+esc(x.name)+'</span><span class="entity-meta">Git · '+esc(x.status)+'</span></button>').join('');
  el('agent-cards').innerHTML=agentCards||'<div class="empty">Aucune IA enregistrée</div>';
  el('machine-cards').innerHTML=machineCards||'<div class="empty">Aucune console enregistrée</div>';
  el('project-cards').innerHTML=projectCards||'<div class="empty">Aucun dépôt Git enregistré</div>';
  const all=new Map([...agents.map((x)=>[entityKey('agent',x.id),x]),...machines.map((x)=>[entityKey('machine',x.id),x]),...projects.map((x)=>[entityKey('project',x.id),x])]);
  const selected=arenaState.selected.map((key)=>all.get(key)).filter(Boolean);
  el('pair-card').innerHTML=selected.length?'<div class="pair-side"><strong>'+selected.map((x)=>esc(x.label)).join(' + ')+'</strong><span>'+selected.length+' élément(s) sélectionné(s)</span></div><button class="btn" type="button" onclick="groupSelected()">CRÉER LE GROUPE</button>':'<div class="empty">Glisse une carte sur une autre, ou sélectionne plusieurs cartes puis crée le groupe.</div>';
  el('groups').innerHTML=arenaState.groups.map((group,index)=>'<div class="group-chip" draggable="true" ondragover="event.preventDefault()" ondrop="dropOnGroup(event,'+index+')">GROUPE '+(index+1)+' · '+group.map((key)=>esc(all.get(key)?.label||all.get(key)?.name||key)).join(' ↔ ')+' <button class="btn secondary" type="button" onclick="event.stopPropagation();dissolveGroup('+index+')">DISSOUT</button></div>').join('')||'<span class="sub">Aucun groupe isolé</span>';
}
async function load(projectId){
  el('error').textContent='';
  const query = projectId ? '?projectId='+encodeURIComponent(projectId) : '';
  try{
    const [data,persistedArena]=await Promise.all([api('/api/overview'+query),api('/api/arena')]);
    arenaState=persistedArena;
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
    renderArena(data);
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
  <section class="panel"><div class="section-title"><h2>Arène · IA + consoles + projets</h2><span class="sub">Glisse une carte sur une autre pour créer ou fusionner un groupe</span></div><div class="arena-columns"><div class="arena-column"><div class="label">ARMÉE DES IA</div><div class="arena-grid" id="agent-cards"></div></div><div class="arena-column"><div class="label">CONSOLES LINUX / WINDOWS</div><div class="arena-grid" id="machine-cards"></div></div><div class="arena-column"><div class="label">PROJETS GIT</div><div class="arena-grid" id="project-cards"></div></div></div><div class="label" style="margin:18px 0 8px">SÉLECTION / GROUPE ACTUEL</div><div class="pair-card" id="pair-card"></div><div class="group-list" id="groups"></div></section>
  <section class="console-drawer" id="console-drawer" onclick="if(event.target===this)closeConsole()"><div class="console-window"><div class="console-head"><div><strong id="console-title">Console</strong><div class="sub" id="console-meta"></div></div><button class="btn secondary" type="button" onclick="closeConsole()">FERMER</button></div><pre id="console-output"></pre></div></section>
  <section class="panel"><div class="section-title"><h2>Projet sélectionné</h2><span class="sub" id="project-meta"></span></div><table><thead><tr><th>ID</th><th>Mission</th><th>Statut</th><th>Agent</th><th>Branche</th><th>Mise à jour</th></tr></thead><tbody id="tasks"></tbody></table></section>
  <section class="panel"><div class="section-title"><h2>Runs récents</h2></div><table><thead><tr><th>Run</th><th>Mission</th><th>Agent</th><th>Statut</th><th>Début</th><th>Fin</th></tr></thead><tbody id="runs"></tbody></table></section>
  <section class="panel"><div class="section-title"><h2>Notifications locales</h2></div><table><thead><tr><th>Date</th><th>Niveau</th><th>Titre</th><th>Message</th><th>Type</th></tr></thead><tbody id="notifications"></tbody></table></section>
  <section class="panel"><div class="section-title"><h2>Readiness hors ligne</h2></div><div class="grid" id="readiness"></div></section>
  <section class="panel"><div class="section-title"><h2>Événements récents</h2></div><table><thead><tr><th>ID</th><th>Type</th><th>Agrégat</th><th>Cible</th><th>Date</th></tr></thead><tbody id="events"></tbody></table></section>
  <div class="footer">Lecture seule · arrêt d'urgence via CLI uniquement · boucle locale · aucune CORS · rafraîchissement 30 s</div>
</main>`, dashboardScript);
}

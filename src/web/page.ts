function shell(title: string, body: string, script = ""): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
:root{
  color-scheme:dark;
  --bg:#050806;
  --panel:rgba(11,18,13,0.96);
  --card-bg:#081009;
  --line:#1e3b27;
  --line-bright:#2e5c3c;
  --green:#7cff96;
  --green-dim:#1b4426;
  --muted:#8ca493;
  --amber:#ffbd59;
  --gold:#facc15;
  --red:#ff6b6b;
  --cyan:#64d8ff;
  --purple:#c084fc;
  --orange:#fb923c;
  --pink:#f472b6;
  --blue:#60a5fa;
  --white:#e8f1ea;
}
*{box-sizing:border-box}
body{
  margin:0;
  background:radial-gradient(circle at top,#102018 0,#050806 48%);
  color:var(--white);
  font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  min-height:100vh;
}
a{color:var(--green);text-decoration:none}
a:hover{text-decoration:underline}
button,input,select,textarea{font:inherit}
.wrap{max-width:1600px;margin:auto;padding:16px}

/* Top bar */
.top{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap}
.brand{font-size:20px;font-weight:900;letter-spacing:.08em;color:var(--green);display:flex;align-items:center;gap:10px}
.brand .badge{font-size:10px;padding:2px 8px;border-radius:4px;background:var(--green-dim);color:var(--green);border:1px solid var(--line-bright);letter-spacing:normal}
.sub{color:var(--muted);font-size:11.5px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 40px #0008;padding:14px;margin-bottom:14px}
.section-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px}
.section-title h2{font-size:13.5px;text-transform:uppercase;letter-spacing:.08em;margin:0;color:var(--green);display:flex;align-items:center;gap:8px}

/* Layout: Left Sidebar for Projects + Main Arena for Matrix & Groups */
.app-layout{display:grid;grid-template-columns:310px 1fr;gap:14px;align-items:start}
@media(max-width:1080px){.app-layout{grid-template-columns:1fr}}

/* Left Sidebar - Projects Column */
.projects-sidebar{display:flex;flex-direction:column;gap:12px}
.folder-add-box{background:#040905;border:1px solid var(--line-bright);border-radius:8px;padding:10px}
.folder-hint{font-size:10px;color:var(--muted);margin-top:6px;line-height:1.35;text-align:center}

.projects-mini-list{display:flex;flex-direction:column;gap:8px;max-height:640px;overflow-y:auto;padding-right:2px}
.project-mini-card{
  background:#071109;
  border:1px solid var(--line);
  border-radius:8px;
  padding:10px;
  cursor:grab;
  user-select:none;
  transition:transform .15s, border-color .15s, background .15s;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.project-mini-card:hover{
  transform:translateX(3px);
  border-color:var(--green);
  background:#0c1d11;
}
.project-mini-card.active{
  border-color:var(--green);
  background:#112618;
  box-shadow:0 0 0 1px var(--green) inset;
}
.project-mini-header{display:flex;align-items:center;justify-content:space-between;gap:6px}
.project-mini-name{font-weight:800;font-size:12.5px;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.project-mini-path{font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.project-mini-meta{display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:2px;font-size:10px}
.project-save-badge{font-size:9.5px;color:var(--green);display:flex;align-items:center;gap:3px}

/* Right Main Area: 4-Columns Matrix Grid for IA & Consoles */
.matrix-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
@media(max-width:1440px){.matrix-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:840px){.matrix-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:540px){.matrix-grid{grid-template-columns:1fr}}

.matrix-card{
  background:#07110a;
  border:1px solid var(--line);
  border-radius:9px;
  padding:11px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  min-height:210px;
  position:relative;
  transition:transform .15s, border-color .15s, box-shadow .15s;
  cursor:grab;
}
.matrix-card:hover{
  transform:translateY(-2px);
  border-color:var(--green);
  box-shadow:0 6px 20px rgba(0,0,0,0.6);
}
.matrix-card.selected{
  border-color:var(--green);
  background:#0f2216;
  box-shadow:0 0 0 1px var(--green) inset, 0 6px 20px rgba(124,255,150,0.15);
}
.matrix-card.is-leader{
  border-color:var(--gold);
  box-shadow:0 0 0 1px var(--gold) inset, 0 6px 24px rgba(250,204,21,0.15);
}
.matrix-card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px}
.matrix-card-title{font-weight:800;font-size:12.5px;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.leader-badge{
  font-size:9.5px;
  font-weight:900;
  padding:2px 7px;
  border-radius:4px;
  background:#3b3208;
  color:var(--gold);
  border:1px solid #7d6b12;
  display:inline-flex;
  align-items:center;
  gap:3px;
  margin-top:3px;
}
.role-badge{
  font-size:9.5px;
  padding:2px 6px;
  border-radius:4px;
  background:#13291b;
  color:var(--green);
  border:1px solid #234c31;
  display:inline-flex;
  align-items:center;
  gap:4px;
  margin-top:3px;
}
.role-badge.dessinateur{background:#2a1128;color:var(--pink);border-color:#6d2466}
.role-badge.musicien{background:#102538;color:var(--cyan);border-color:#1c557d}
.role-badge.midi{background:#281838;color:var(--purple);border-color:#5c2d82}
.role-badge.microcontroleur{background:#38240a;color:var(--orange);border-color:#824b12}
.role-badge.codeur{background:#112e1b;color:var(--green);border-color:#236b3b}
.role-badge.architecte{background:#152238;color:var(--blue);border-color:#2b4b7c}
.role-badge.securite{background:#381111;color:var(--red);border-color:#7d2222}
.role-badge.qa{background:#2e3612;color:var(--amber);border-color:#697d21}
.role-badge.math{background:#0d233a;color:#60a5fa;border-color:#1d4ed8}
.role-badge.souverain{background:#2e1810;color:#fb923c;border-color:#c2410c}
.role-badge.passerelle{background:#1a102e;color:#c084fc;border-color:#7e22ce}

.matrix-badge{font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em}
.badge-gpt{background:#103b22;color:#7cff96;border:1px solid #287a48}
.badge-claude{background:#3b2310;color:#fb923c;border:1px solid #7a461d}
.badge-gemini{background:#0e2e3b;color:#64d8ff;border:1px solid #1c627d}
.badge-grok{background:#2a123b;color:#c084fc;border:1px solid #58287a}
.badge-groq{background:#3b320e;color:#ffbd59;border:1px solid #7d681c}
.badge-mistral{background:#3b1414;color:#ff8e6b;border:1px solid #7a2b28}
.badge-deepseek{background:#0c2538;color:#60a5fa;border:1px solid #1e40af}
.badge-openrouter{background:#211438;color:#d8b4fe;border:1px solid #6b21a8}
.badge-pi{background:#3b1022;color:#ff7cb4;border:1px solid #7a1d44}
.badge-win{background:#0f243b;color:#7cb4ff;border:1px solid #1d4d7a}
.badge-local{background:#202b23;color:#a9f5b5;border:1px solid #36573e}

.card-select-row{display:flex;flex-direction:column;gap:3px;margin:5px 0}
.card-select-row label{font-size:9px;color:var(--muted);text-transform:uppercase;font-weight:700}
.model-dropdown{
  width:100%;
  background:#030704;
  color:#a9f5b5;
  border:1px solid #1e4428;
  border-radius:4px;
  padding:3px 5px;
  font-size:10px;
  outline:none;
}
.model-dropdown:focus{border-color:var(--green)}

/* 2-Way Routing & Auth Path Switcher (CLI Session vs Direct API Key) */
.auth-path-box{
  display:flex;
  flex-direction:column;
  gap:3px;
  margin:4px 0 6px;
  padding:4px 6px;
  background:#040a06;
  border:1px solid #142e1b;
  border-radius:4px;
}
.auth-path-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  font-size:8.5px;
  color:var(--muted);
  font-weight:700;
  text-transform:uppercase;
}
.auth-path-switcher{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:3px;
  margin-top:2px;
}
.auth-path-btn{
  border:1px solid #1c3b24;
  background:#07140a;
  color:#7ea386;
  border-radius:3px;
  padding:3px 4px;
  font-size:8.5px;
  font-weight:800;
  cursor:pointer;
  text-align:center;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  transition:all .15s;
}
.auth-path-btn:hover{border-color:var(--green);color:var(--white)}
.auth-path-btn.cli.active{
  background:#102e17;
  border-color:var(--green);
  color:var(--green);
  box-shadow:0 0 8px rgba(124,255,150,0.18);
}
.auth-path-btn.api.active{
  background:#2e240a;
  border-color:var(--gold);
  color:var(--gold);
  box-shadow:0 0 8px rgba(255,209,102,0.18);
}
.auth-path-status{
  font-size:8.5px;
  margin-top:2px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:4px;
  line-height:1.2;
}
.auth-path-status.ready{color:#7cff96}
.auth-path-status.warn{color:var(--amber)}
.auth-path-status.missing{color:var(--red)}

.vault-security-badge{
  display:inline-flex;
  align-items:center;
  gap:4px;
  background:#071d0e;
  border:1px solid #1c5528;
  color:#7cff96;
  padding:3px 8px;
  border-radius:4px;
  font-size:10px;
  font-weight:800;
  letter-spacing:.02em;
}

.console-preview{
  display:block;
  margin:4px 0;
  padding:4px 6px;
  min-height:36px;
  max-height:48px;
  overflow:hidden;
  background:#020503;
  border:1px solid #16351e;
  border-radius:4px;
  color:#9edaa7;
  font-size:9px;
  line-height:1.3;
  white-space:pre-wrap;
}
.matrix-footer{display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:4px;flex-wrap:wrap}
.card-btn{
  border:1px solid #315d3a;
  border-radius:4px;
  background:#102317;
  color:var(--green);
  padding:3px 6px;
  font-size:9.5px;
  font-weight:800;
  cursor:pointer;
  transition:background .15s, border-color .15s;
}
.card-btn:hover{background:var(--green);color:#021005}
.card-btn.leader{border-color:#7d6b12;background:#241e05;color:var(--gold)}
.card-btn.leader:hover{background:var(--gold);color:#000}
.card-btn.prompt{border-color:#1c557d;background:#0d2230;color:var(--cyan)}
.card-btn.prompt:hover{background:var(--cyan);color:#000}

/* Double Size Group Cards & Inner Mini-cards */
.group-list{display:flex;gap:14px;flex-direction:column;margin-top:8px}

.group-card{
  border-radius:10px;
  padding:14px 16px;
  transition:border-color .2s, box-shadow .2s, background .2s;
  display:flex;
  flex-direction:column;
  gap:10px;
  position:relative;
}

/* Red group card when NO project is attached */
.group-card.no-project{
  border:2px solid var(--red);
  background:rgba(255,107,107,0.06);
  box-shadow:0 0 20px rgba(255,107,107,0.2);
}

/* Green group card when Project IS attached */
.group-card.has-project{
  border:2px solid var(--green);
  background:rgba(124,255,150,0.06);
  box-shadow:0 0 20px rgba(124,255,150,0.15);
}

.group-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.group-title-box{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.group-title{font-size:14px;font-weight:900;letter-spacing:.05em}

.group-project-badge{
  font-size:10.5px;
  font-weight:800;
  padding:3px 8px;
  border-radius:4px;
  display:inline-flex;
  align-items:center;
  gap:4px;
}
.group-project-badge.missing{
  background:#3b1010;
  color:var(--red);
  border:1px solid #7d2020;
  animation:pulse 2s infinite;
}
.group-project-badge.ok{
  background:#103b1d;
  color:var(--green);
  border:1px solid #237a3d;
}

@keyframes pulse {
  0%{opacity:1}
  50%{opacity:0.6}
  100%{opacity:1}
}

/* Grid of Mini-Cards inside the group (Max 6 IA) */
.group-mini-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:8px;
  margin:4px 0;
}
.group-mini-card{
  background:#060e08;
  border:1px solid var(--line);
  border-radius:6px;
  padding:8px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  min-height:96px;
  transition:border-color .15s, background .15s;
}
.group-mini-card:hover{
  border-color:var(--green);
  background:#0c1c11;
}
.group-mini-card.is-leader{
  border-color:var(--gold);
  background:#141708;
}
.group-mini-card.is-project{
  border-color:var(--green);
  background:#0e2414;
}
.group-mini-card-head{display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:4px}
.group-mini-card-name{font-weight:800;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.group-mini-card-meta{font-size:9.5px;color:var(--muted);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.group-mini-card-actions{display:flex;justify-content:space-between;align-items:center;gap:4px;margin-top:auto}

.group-orchestration{
  font-size:11px;
  color:#b6f0c3;
  background:#030805;
  border:1px solid var(--line);
  border-radius:6px;
  padding:8px 10px;
  line-height:1.45;
}

/* Prompt Order Modal */
.prompt-modal-backdrop{display:none;position:fixed;inset:0;z-index:50;padding:20px;background:rgba(0,0,0,0.88);backdrop-filter:blur(4px);place-items:center}
.prompt-modal-backdrop.open{display:grid}
.prompt-modal-window{width:min(640px,100%);background:#09140c;border:1px solid var(--cyan);border-radius:10px;box-shadow:0 24px 80px rgba(0,0,0,0.9);display:flex;flex-direction:column;overflow:hidden}
.prompt-modal-head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);background:#0a1e28}
.prompt-modal-body{padding:16px;overflow-y:auto}
.prompt-modal-footer{padding:12px 16px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px;background:#0a1e28}
.prompt-quick-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.prompt-chip{font-size:10px;padding:3px 7px;border-radius:4px;background:#071c26;color:var(--cyan);border:1px solid #1c5273;cursor:pointer}
.prompt-chip:hover{background:var(--cyan);color:#000}

/* Standard Modals & Drawer */
.modal-backdrop{display:none;position:fixed;inset:0;z-index:40;padding:20px;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);place-items:center}
.modal-backdrop.open{display:grid}
.modal-window{width:min(680px,100%);max-height:90vh;background:#09140c;border:1px solid var(--green);border-radius:10px;box-shadow:0 24px 80px rgba(0,0,0,0.9);display:flex;flex-direction:column;overflow:hidden}
.modal-head{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line);background:#0c1c11}
.modal-body{padding:16px;overflow-y:auto;flex:1}
.modal-footer{padding:12px 16px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px;background:#0c1c11}
.form-group{margin-bottom:12px}
.form-group label{display:block;margin-bottom:4px;font-weight:700;font-size:10.5px;color:var(--green);text-transform:uppercase}
.form-group input,.form-group select,.form-group textarea{width:100%;background:#040905;color:var(--white);border:1px solid var(--line-bright);border-radius:5px;padding:7px 9px;font-size:12px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}

.console-drawer{display:none;position:fixed;inset:0;z-index:30;padding:5vh 16px;background:rgba(0,0,0,0.85);backdrop-filter:blur(3px)}
.console-drawer.open{display:grid;place-items:center}
.console-window{width:min(940px,100%);height:80vh;background:#071009;border:1px solid var(--green);border-radius:10px;box-shadow:0 20px 80px #000;display:flex;flex-direction:column;overflow:hidden}
.console-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);background:#0a170d}
.console-head strong{color:var(--green);font-size:13px}
.console-window pre{margin:0;padding:14px;flex:1;overflow:auto;background:#020503;color:#a9f5b5;font-size:11.5px;line-height:1.45;white-space:pre-wrap}
.console-input{display:flex;gap:6px;padding:10px 14px;border-top:1px solid var(--line);background:#0a170d}
.console-input input{flex:1;min-width:0;background:#030604;color:var(--white);border:1px solid var(--line-bright);border-radius:5px;padding:8px 10px}

/* Selection pairing & hidden indexes */
.pair-card{
  min-height:64px;
  border:1px solid var(--green);
  border-radius:8px;
  background:linear-gradient(135deg,#112319,#081009);
  padding:10px 14px;
  display:grid;
  grid-template-columns:1fr auto;
  gap:10px;
  align-items:center;
}
.pair-side strong,.pair-side span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pair-side span{color:var(--muted);font-size:10.5px;margin-top:2px}

.arena-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}
.arena-column{min-width:0}
.arena-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}
.entity-card{appearance:none;text-align:left;width:100%;min-height:68px;background:#081009;border:1px solid var(--line);border-radius:6px;padding:7px 9px;color:var(--white);cursor:pointer}
.entity-card:hover{border-color:var(--green)}
.entity-card.selected{border-color:var(--green);background:#102317}
.entity-icon{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:4px;background:#14271a;color:var(--green);font-weight:900;margin-bottom:4px;font-size:10px}
.entity-name{display:block;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}

/* Application Nav Tabs & View Switcher */
.app-nav-tabs{
  display:flex;
  gap:8px;
  margin-bottom:14px;
  border-bottom:1px solid var(--line);
  padding-bottom:10px;
  overflow-x:auto;
}
.nav-tab{
  display:inline-flex;
  align-items:center;
  gap:8px;
  background:#07120a;
  border:1px solid var(--line);
  color:var(--muted);
  padding:9px 16px;
  border-radius:6px;
  font-weight:800;
  font-size:12px;
  cursor:pointer;
  transition:all .15s ease;
  white-space:nowrap;
}
.nav-tab:hover{
  background:#0e2415;
  color:var(--white);
  border-color:var(--line-bright);
}
.nav-tab.active{
  background:#143820;
  color:var(--green);
  border-color:var(--green);
  box-shadow:0 0 16px rgba(124,255,150,0.18);
}
.nav-tab-badge{
  font-size:9.5px;
  padding:2px 7px;
  border-radius:10px;
  background:#040c06;
  border:1px solid var(--line-bright);
  color:var(--white);
}
.nav-tab.active .nav-tab-badge{
  background:#082210;
  border-color:var(--green);
  color:var(--green);
}

/* Drag & Drop Visual Glow & Drop Target Highlights */
.is-dragging{
  opacity:0.45 !important;
  border-style:dashed !important;
  border-color:var(--green) !important;
  transform:scale(0.97) !important;
}
.drag-over{
  border-color:var(--green) !important;
  background:rgba(124,255,150,0.12) !important;
  box-shadow:0 0 22px rgba(124,255,150,0.4) !important;
  transform:scale(1.02) !important;
}
.drop-zone-new-group{
  border:2px dashed var(--line-bright);
  border-radius:9px;
  padding:14px 18px;
  text-align:center;
  color:var(--muted);
  font-size:11.5px;
  background:rgba(5,15,8,0.7);
  cursor:pointer;
  transition:all .2s ease;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  margin-top:10px;
}
.drop-zone-new-group:hover, .drop-zone-new-group.drag-over{
  border-color:var(--green);
  color:var(--green);
  background:rgba(16,42,24,0.85);
  box-shadow:0 0 24px rgba(124,255,150,0.25);
}
.entity-meta{display:block;color:var(--muted);font-size:9.5px;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Stats, Buttons & Tables */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.card{background:var(--card-bg);border:1px solid var(--line);border-radius:6px;padding:9px}
.value{font-size:18px;color:var(--green);font-weight:800}
.label{color:var(--muted);text-transform:uppercase;font-size:10px;letter-spacing:.05em;font-weight:700}
.btn{background:var(--green);color:#021005;border:0;border-radius:5px;padding:7px 12px;font-weight:800;font-size:11.5px;cursor:pointer}
.btn:hover{opacity:.9}
.btn.secondary{background:#142318;color:var(--white);border:1px solid var(--line-bright)}
.btn.secondary:hover{background:#1b3021}
.btn.danger{background:#3b1010;color:var(--red);border:1px solid #7d2020}
.btn.danger:hover{background:var(--red);color:#000}
.btn.small{padding:3px 7px;font-size:10px}

table{border-collapse:collapse;width:100%;display:block;overflow:auto}
th,td{border-bottom:1px solid #16251b;padding:7px 9px;text-align:left;white-space:nowrap;font-size:11.5px}
th{color:var(--muted);font-size:10px;text-transform:uppercase}
.status{font-weight:800}
.pass,.completed,.done,.ready,.success,.libre,.active{color:var(--green)}
.warn,.warning,.running,.review{color:var(--amber)}
.fail,.error,.failed,.blocked,.interrupted,.engag,.disabled{color:var(--red)}
.empty{color:var(--muted);padding:12px 0;text-align:center;font-size:11.5px}
.error{color:var(--red);min-height:1.2em;font-weight:700;font-size:11.5px}
.footer{color:var(--muted);text-align:center;padding:20px;font-size:11px;line-height:1.5}
.emergency{display:none;border-color:var(--red);color:var(--red);font-weight:800}
</style>
</head>
<body>${body}${script ? `<script>${script}</script>` : ""}</body>
</html>`;
}

export function renderLoginPage(error = "", tokenHint = ""): string {
  return shell("Super IA — connexion", `<main class="wrap" style="max-width:500px;margin:12vh auto">
  <section class="panel">
    <div class="brand">SUPER IA // LOCAL ACCESS</div>
    <p class="sub">Interface locale en lecture seule. Le token reste dans <code>SUPERIA_HOME/web/access.token</code>.</p>
    <form method="post" action="/session">
      <div class="form-group" style="margin-top:14px">
        <label for="token">Token local</label>
        <input id="token" name="token" type="password" autocomplete="current-password" ${tokenHint ? `value="${tokenHint}" ` : ""}required autofocus style="width:100%;padding:9px;background:#030604;border:1px solid var(--line-bright);border-radius:6px;color:var(--white)">
      </div>
      <div class="error">${error}</div>
      ${tokenHint ? `<div class="sub" style="margin-bottom:10px;font-size:11.5px;color:var(--green)">✓ Jeton de session pré-chargé : <code>${tokenHint}</code></div>` : ""}
      <button class="btn" type="submit" style="width:100%;margin-top:8px">OUVRIR LA MATRICE</button>
    </form>
  </section>
</main>`);
}

const dashboardScript = `
const el = (id) => document.getElementById(id);
const text = (value) => value === undefined || value === null || value === '' ? '-' : String(value);
const cls = (value) => String(value || '').toLowerCase().replace(/[^a-z-]/g, '');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function api(path, options){
  const response = await fetch(path, { headers: { 'Accept': 'application/json', ...(options?.headers || {}) }, cache: 'no-store', ...options });
  if(response.status === 401){ location.href = '/login'; throw new Error('Session expirée'); }
  if(!response.ok){ const err = await response.json().catch(()=>({})); throw new Error(err.error || ('HTTP ' + response.status)); }
  return response.json();
}

function rows(items, columns){
  if(!items || !items.length) return '<tr><td class="empty" colspan="'+columns.length+'">Aucune donnée</td></tr>';
  return items.map((item) => '<tr>' + columns.map((column) => '<td>' + column(item) + '</td>').join('') + '</tr>').join('');
}
function status(value){ return '<span class="status ' + cls(value) + '">' + esc(text(value)) + '</span>'; }

let arenaState = { selected: [], groups: [] };
function saveArena(){ void fetch('/api/arena', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(arenaState) }).catch(()=>{}); }
function entityKey(type, id){ return type + ':' + id; }

function selectEntity(type, id){
  const key = entityKey(type, id);
  arenaState.selected = arenaState.selected.includes(key) ? arenaState.selected.filter((x) => x !== key) : [...arenaState.selected, key];
  saveArena();
  renderArena(window.arenaData || {});
}

const PROVIDER_MODELS = {
  'groq': [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Défaut)' },
    { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B (Raisonnement)' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Instantané)' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32k Contexte)' },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B (Google/Groq)' }
  ],
  'openai': [
    { id: 'gpt-4o', label: 'GPT-4o (Omnimodal Haute Précision)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini (Rapide & Léger)' },
    { id: 'o3-mini', label: 'o3-mini (Raisonnement STEM)' },
    { id: 'o1', label: 'o1 (Raisonnement Profond)' }
  ],
  'anthropic': [
    { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet (Hybride/Code)' },
    { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Éclair)' }
  ],
  'gemini': [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (2M Contexte)' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rapide)' },
    { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp' }
  ],
  'xai': [
    { id: 'grok-3', label: 'Grok 3 (Raisonnement & Debug)' },
    { id: 'grok-2-1212', label: 'Grok 2' },
    { id: 'grok-beta', label: 'Grok Beta' }
  ],
  'mistral': [
    { id: 'mistral-large-latest', label: 'Mistral Large 2 (Souverain)' },
    { id: 'codestral-latest', label: 'Codestral (Code spécialisé)' },
    { id: 'mistral-small-latest', label: 'Mistral Small 3' }
  ],
  'deepseek': [
    { id: 'deepseek-chat', label: 'DeepSeek V3 (Chat & Code)' },
    { id: 'deepseek-reasoner', label: 'DeepSeek R1 (Raisonnement)' }
  ],
  'openrouter': [
    { id: 'anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet (via OpenRouter)' },
    { id: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)' },
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (via OpenRouter)' },
    { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (via OpenRouter)' }
  ]
};

const PROVIDER_DEFAULTS = {
  'groq': { name: 'Groq', envVar: 'GROQ_API_KEY', defaultUrl: 'https://api.groq.com/openai/v1', cli: 'groq', tag: 'Ultra-Rapide / Éco' },
  'openai': { name: 'OpenAI', envVar: 'OPENAI_API_KEY', defaultUrl: 'https://api.openai.com/v1', cli: 'codex', tag: 'Standard / GPT-4o' },
  'anthropic': { name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY', defaultUrl: 'https://api.anthropic.com', cli: 'claude', tag: 'Code & Raisonnement' },
  'gemini': { name: 'Google Gemini', envVar: 'GEMINI_API_KEY', defaultUrl: 'https://generativelanguage.googleapis.com', cli: 'gemini', tag: 'Contexte 2M / Flash' },
  'xai': { name: 'xAI', envVar: 'XAI_API_KEY', defaultUrl: 'https://api.x.ai/v1', cli: 'grok', tag: 'Raisonnement & Debug' },
  'mistral': { name: 'Mistral AI', envVar: 'MISTRAL_API_KEY', defaultUrl: 'https://api.mistral.ai/v1', cli: 'vibe', tag: 'Souverain & Spécialisé' },
  'deepseek': { name: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY', defaultUrl: 'https://api.deepseek.com', cli: 'deepseek', tag: 'R1 / V3 Économique' },
  'openrouter': { name: 'OpenRouter', envVar: 'OPENROUTER_API_KEY', defaultUrl: 'https://openrouter.ai/api/v1', cli: 'openrouter', tag: 'Passerelle Multi-IA' }
};

function getProviderKey(id, label){
  const str = (id + ' ' + label).toLowerCase();
  if(str.includes('groq')) return 'groq';
  if(str.includes('gpt') || str.includes('openai') || str.includes('codex') || str.includes('embedded') || str.includes('microcontr')) return 'openai';
  if(str.includes('claude') || str.includes('anthropic') || str.includes('audio') || str.includes('midi')) return 'anthropic';
  if(str.includes('gemini') || str.includes('google') || str.includes('ui-designer') || str.includes('dessin')) return 'gemini';
  if(str.includes('grok') || str.includes('xai')) return 'xai';
  if(str.includes('mistral') || str.includes('vibe')) return 'mistral';
  if(str.includes('deepseek')) return 'deepseek';
  if(str.includes('openrouter')) return 'openrouter';
  return '';
}

async function switchAgentAuthMode(agentId, authPath){
  try{
    await api('/api/credentials/set-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, authPath })
    });
    await load(el('project').value);
  }catch(err){
    alert('Erreur bascule de mode : ' + (err instanceof Error ? err.message : String(err)));
  }
}

let vaultEntriesCache = [];

async function openCredentialsModal(targetProvider = ''){
  el('credentials-modal').classList.add('open');
  el('cred-save-feedback').textContent = '';
  el('cred-api-key').value = '';
  try{
    const res = await api('/api/credentials');
    vaultEntriesCache = res.entries || [];
    renderVaultTable(vaultEntriesCache);
  }catch(err){
    console.error('Erreur chargement clés:', err);
  }

  if(targetProvider){
    el('cred-provider').value = targetProvider.toLowerCase();
  }
  onCredProviderChange();
}

function closeCredentialsModal(){
  el('credentials-modal').classList.remove('open');
}

function toggleKeyVisibility(){
  const inp = el('cred-api-key');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function onCredProviderChange(){
  const prov = el('cred-provider').value;
  const def = PROVIDER_DEFAULTS[prov] || { envVar: 'API_KEY', defaultUrl: '', name: prov };
  const existing = vaultEntriesCache.find(e => e.provider === prov);
  el('cred-env-name').textContent = def.envVar;
  el('cred-url').value = existing?.customBaseUrl || def.defaultUrl;
  el('cred-mode').value = existing?.preferredMode || 'api';
  if(existing && existing.isConfigured){
    el('cred-status-note').innerHTML = '✓ Clé active chiffrée (AES-256) : <code style="color:var(--green);font-size:11px">' + esc(existing.preview) + '</code>';
    el('btn-cred-delete').style.display = 'inline-block';
  } else {
    el('cred-status-note').innerHTML = '⚠️ Aucune clé enregistrée pour ce fournisseur';
    el('btn-cred-delete').style.display = 'none';
  }
}

function renderVaultTable(entries){
  const html = (!entries || !entries.length)
    ? '<tr><td colspan="5" class="empty">Aucune clé enregistrée dans le coffre local.</td></tr>'
    : entries.map(e => {
        const def = PROVIDER_DEFAULTS[e.provider] || { name: e.provider };
        return '<tr>' +
          '<td><strong>' + esc(def.name || e.provider.toUpperCase()) + '</strong></td>' +
          '<td><span class="auth-path-btn ' + (e.preferredMode === 'cli' ? 'cli' : 'api') + ' active" style="display:inline-block;padding:1px 6px">' + (e.preferredMode === 'cli' ? '💻 CLI Session (Éco)' : '⚡ Clé API (Jetons)') + '</span></td>' +
          '<td>' + (e.isConfigured ? '<code style="color:var(--green);font-size:11px">' + esc(e.preview) + '</code>' : '<span style="color:var(--muted)">(non configurée)</span>') + '</td>' +
          '<td>' + (e.isConfigured ? '<span class="status pass">✓ CHIFFRÉ AES-256</span>' : '<span class="status disabled">NON CONFIGURÉ</span>') + '</td>' +
          '<td>' +
            '<button class="card-btn" type="button" onclick="openCredentialsModal(\\''+esc(e.provider)+'\\')" style="padding:2px 6px;font-size:9px">CONFIGURER</button> ' +
            (e.isConfigured ? '<button class="btn danger small" type="button" onclick="deleteCredentialsKey(\\''+esc(e.provider)+'\\')" style="padding:2px 6px;font-size:9px">SUPPRIMER</button>' : '') +
          '</td>' +
        '</tr>';
      }).join('');

  const modalTbody = el('vault-entries-body');
  if(modalTbody) modalTbody.innerHTML = html;
  const tabTbody = el('vault-tab-entries-body');
  if(tabTbody) tabTbody.innerHTML = html;
}

async function submitCredentialsForm(event){
  event.preventDefault();
  const provider = el('cred-provider').value;
  const apiKey = el('cred-api-key').value.trim();
  const preferredMode = el('cred-mode').value;
  const customBaseUrl = el('cred-url').value.trim();
  const def = PROVIDER_DEFAULTS[provider];

  if(!apiKey){
    const existing = vaultEntriesCache.find(e => e.provider === provider);
    if(!existing || !existing.isConfigured){
      alert('Veuillez saisir une clé API.');
      return;
    }
  }

  el('cred-save-feedback').textContent = 'Chiffrement AES-256-GCM et enregistrement local…';
  try{
    const res = await api('/api/credentials/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey: apiKey || (vaultEntriesCache.find(e=>e.provider===provider)?.preview ? 'KEEP_EXISTING' : ''),
        preferredMode,
        customBaseUrl,
        envVarName: def?.envVar
      })
    });
    el('cred-save-feedback').textContent = '✓ ' + (res.message || 'Clé chiffrée avec succès !');
    el('cred-api-key').value = '';
    const updated = await api('/api/credentials');
    vaultEntriesCache = updated.entries || [];
    renderVaultTable(vaultEntriesCache);
    onCredProviderChange();
    await load(el('project').value);
  }catch(err){
    el('cred-save-feedback').textContent = 'Erreur : ' + (err instanceof Error ? err.message : String(err));
  }
}

async function deleteCredentialsKey(provider){
  if(!confirm('Supprimer la clé ' + provider.toUpperCase() + ' du coffre local chiffré ?')) return;
  try{
    await api('/api/credentials/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    const updated = await api('/api/credentials');
    vaultEntriesCache = updated.entries || [];
    renderVaultTable(vaultEntriesCache);
    onCredProviderChange();
    await load(el('project').value);
  }catch(err){
    alert('Erreur suppression clé : ' + (err instanceof Error ? err.message : String(err)));
  }
}

function generateSystemPrompt(role, isLeader, model){
  const r = (role || '').toLowerCase();
  if(isLeader || r.includes('chef') || r.includes('orchestrateur')){
    return 'Tu es le CHEF D\\'ÉQUIPE et ORCHESTRATEUR PRINCIPAL du groupe de travail (Modèle: ' + (model || 'Standard') + ').\\n' +
      'Tes directives absolues :\\n' +
      '1. Analyser les besoins du projet et segmenter rigoureusement la mission en sous-tâches techniques indépendantes.\\n' +
      '2. DÉLÉGUER et FAIRE TRAVAILLER chaque collaborateur selon son rôle spécifique :\\n' +
      '   - Dessinateur / Designer -> Maquettes UI/UX, icônes, SVGs vectoriels et animations.\\n' +
      '   - Musicien / Sound Designer -> Harmonie, synthèse sonore, effets audio, WebAudio API.\\n' +
      '   - Spécialiste MIDI -> Trames MIDI (Note/CC/SysEx), synchronisation d\\'horloge, Web MIDI.\\n' +
      '   - Spécialiste Microcontrôleurs -> Drivers C/C++, protocoles I2C/SPI/UART, GPIO/PWM, ESP32/Pico.\\n' +
      '   - Codeur Principal -> Implémentation robuste TypeScript/Node/React.\\n' +
      '   - Testeur QA -> Vérification des tests unitaires et simulations de cas limites.\\n' +
      '   - Consoles SSH -> Exécution distante et déploiement matériel.\\n' +
      '3. Coordonner les dépendances, suivre l\\'avancement de chacun, valider la conformité des livrables et synthétiser l\\'état global pour l\\'utilisateur.';
  }
  if(r.includes('dessinateur') || r.includes('designer') || r.includes('ui') || r.includes('graphi')){
    return 'Tu es le DESSINATEUR et DESIGNER VISUEL expert en interfaces graphiques, design vectoriel SVG, illustrations, chartes graphiques, animations Canvas, shaders GLSL et ergonomie UI/UX. Tu produis des structures visuelles propres, du SVG optimisé et des composants graphiques prêts à l\\'intégration.';
  }
  if(r.includes('musicien') || r.includes('sound') || r.includes('audio') || r.includes('composit')){
    return 'Tu es le MUSICIEN et SOUND DESIGNER expert en théorie musicale (harmonie, gammes, progressions d\\'accords), synthèse audio (soustractive, FM, wavetable), traitement du signal (DSP, filtres, réverbération, enveloppes ADSR) et intégration WebAudio API.';
  }
  if(r.includes('midi')){
    return 'Tu es le SPÉCIALISTE DU PROTOCOLE MIDI (MIDI 1.0 / 2.0). Tu maîtrises l\\'encodage et le décodage des trames MIDI (Note On/Off, Control Change, Program Change, PitchBend, SysEx, horloge MIDI Clock 24 PPQN, MTC), le Web MIDI API, les séquenceurs pas-à-pas et le routage multipiste matériel et virtuel.';
  }
  if(r.includes('microcontr') || r.includes('embarqu') || r.includes('esp32') || r.includes('arduino') || r.includes('stm32') || r.includes('pico')){
    return 'Tu es le SPÉCIALISTE MICROCONTRÔLEURS & SYSTÈMES EMBARQUÉS (ESP32, STM32, Arduino, Raspberry Pi Pico / RP2040, AVR, ARM Cortex). Tu écris du code C/C++ ou Rust bare-metal/RTOS, maîtrises les bus I2C, SPI, UART, PWM, GPIO, DMA, interruptions matérielles (ISR) et la gestion stricte de la mémoire et des timings temps réel.';
  }
  if(r.includes('codeur') || r.includes('développeur')){
    return 'Tu es le CODEUR FULL-STACK PRINCIPAL. Tu implémentes le code applicatif avec rigueur, robustesse, typage strict TypeScript et architecture modulaire selon les consignes du Chef d\\'équipe.';
  }
  if(r.includes('architecte')){
    return 'Tu es l\\'ARCHITECTE LOGICIEL. Tu définis la structure, les interfaces, les contrats de données, les flux logiques et la séparation nette des couches logicielles.';
  }
  if(r.includes('reviewer') || r.includes('sécurité')){
    return 'Tu es l\\'AUDITEUR SÉCURITÉ & CODE REVIEWER. Tu inspectes chaque ligne de code, traques les failles, injections, fuites mémoire et veilles à la conformité absolue.';
  }
  if(r.includes('qa') || r.includes('test')){
    return 'Tu es le TESTEUR QA. Tu rédiges et vérifies les suites de tests unitaires, d\\'intégration, simulations matérielles/MIDI et cas limites.';
  }
  return 'Tu es un AGENT IA collaboratif membre de l\\'arène Super IA.';
}

function getRoleBadgeClass(role){
  const r = (role || '').toLowerCase();
  if(r.includes('dessinateur') || r.includes('designer')) return 'dessinateur';
  if(r.includes('musicien') || r.includes('sound')) return 'musicien';
  if(r.includes('midi')) return 'midi';
  if(r.includes('microcontr') || r.includes('embarqu') || r.includes('iot') || r.includes('esp32')) return 'microcontroleur';
  if(r.includes('codeur') || r.includes('éclair') || r.includes('principal')) return 'codeur';
  if(r.includes('architecte')) return 'architecte';
  if(r.includes('sécurité') || r.includes('reviewer')) return 'securite';
  if(r.includes('qa') || r.includes('test')) return 'qa';
  if(r.includes('math') || r.includes('stem') || r.includes('deepseek') || r.includes('raisonnement')) return 'math';
  if(r.includes('souverain') || r.includes('validateur')) return 'souverain';
  if(r.includes('passerelle') || r.includes('openrouter')) return 'passerelle';
  return '';
}

function getRoleIcon(role){
  const r = (role || '').toLowerCase();
  if(r.includes('chef')) return '👑';
  if(r.includes('dessinateur') || r.includes('designer')) return '🎨';
  if(r.includes('musicien') || r.includes('sound')) return '🎵';
  if(r.includes('midi')) return '🎹';
  if(r.includes('microcontr') || r.includes('embarqu') || r.includes('iot') || r.includes('esp32')) return '⚡';
  if(r.includes('codeur') || r.includes('éclair')) return '💻';
  if(r.includes('architecte')) return '🏗️';
  if(r.includes('sécurité')) return '🛡️';
  if(r.includes('qa') || r.includes('test')) return '🧪';
  if(r.includes('math') || r.includes('stem') || r.includes('deepseek') || r.includes('raisonnement')) return '🧮';
  if(r.includes('souverain') || r.includes('validateur')) return '⚜️';
  if(r.includes('passerelle') || r.includes('openrouter')) return '🌐';
  if(r.includes('contexte') || r.includes('multimodal')) return '🔮';
  return '🤖';
}

async function updateAgentModel(agentId, newModel){
  try{
    const agent = (window.arenaData?.connections || []).find((c) => c.id === agentId);
    const role = agent?.role || extractRole(agent?.notes, agent?.label);
    const isLeader = Boolean(agent?.isLeader);
    const prompt = generateSystemPrompt(role, isLeader, newModel);
    await api('/api/connections/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agentId, model: newModel, systemPrompt: prompt })
    });
    await load(el('project').value);
  }catch(err){
    alert('Erreur changement modèle : ' + (err instanceof Error ? err.message : String(err)));
  }
}

async function toggleLeader(agentId){
  try{
    const agent = (window.arenaData?.connections || []).find((c) => c.id === agentId);
    const newIsLeader = !agent?.isLeader;
    const newRole = newIsLeader ? 'Chef d\\'équipe' : 'Codeur Principal';
    const prompt = generateSystemPrompt(newRole, newIsLeader, agent?.model);
    await api('/api/connections/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agentId, isLeader: newIsLeader, role: newRole, systemPrompt: prompt })
    });
    await load(el('project').value);
  }catch(err){
    alert('Erreur assignation chef : ' + (err instanceof Error ? err.message : String(err)));
  }
}

/* Prompt Order Dialog */
let activePromptTarget = { type: 'agent', id: '', label: '', role: '', groupIndex: -1 };

function openPromptModal(targetType, targetId, groupIndex = -1){
  activePromptTarget = { type: targetType, id: targetId, groupIndex };
  let title = '';
  let role = '';
  const data = window.arenaData || {};

  if(targetType === 'group'){
    const group = arenaState.groups[groupIndex] || [];
    title = 'ORDRE / MISSION POUR LE GROUPE ' + (groupIndex + 1);
    role = 'Groupe';
  } else {
    const agent = (data.connections || []).find((c) => c.id === targetId);
    title = 'DONNER UN ORDRE À : ' + (agent?.label || targetId);
    role = agent?.role || extractRole(agent?.notes, agent?.label);
  }

  el('prompt-modal-title').textContent = title;
  el('prompt-modal-target-meta').textContent = 'Rôle cible : ' + role + (activePromptTarget.groupIndex >= 0 ? ' · Dans le cadre du Groupe ' + (activePromptTarget.groupIndex + 1) : '');
  el('prompt-order-text').value = '';
  el('prompt-feedback').textContent = '';

  // Generate role-specific quick prompt chips
  const chips = getPromptChips(role);
  el('prompt-quick-chips').innerHTML = chips.map((c) => '<button class="prompt-chip" type="button" onclick="insertPromptChip(\\''+esc(c.replace(/'/g, "\\\\'"))+'\\')">'+esc(c)+'</button>').join('');

  el('prompt-modal').classList.add('open');
  el('prompt-order-text').focus();
}

function insertPromptChip(textVal){
  const textarea = el('prompt-order-text');
  if(textarea.value.trim()){
    textarea.value = textarea.value + '\\n' + textVal;
  } else {
    textarea.value = textVal;
  }
}

function getPromptChips(role){
  const r = (role || '').toLowerCase();
  if(r.includes('chef') || r.includes('groupe')){
    return [
      'Segmenter le projet en étapes techniques et répartir le travail.',
      'Lancer l\\'analyse d\\'architecture et faire valider la structure par l\\'équipe.',
      'Ordonner au Spécialiste Microcontrôleur d\\'écrire le driver matériel.',
      'Demander au Spécialiste MIDI de concevoir le protocole de messages.',
      'Demander au Dessinateur de créer les maquettes SVG et l\\'interface.',
      'Faire exécuter les tests de conformité par le Testeur QA.'
    ];
  }
  if(r.includes('dessinateur') || r.includes('designer')){
    return [
      'Créer les maquettes SVG et icônes vectorielles pour l\\'interface.',
      'Concevoir le composant d\\'affichage des potentiomètres/faders.',
      'Écrire le CSS/Tailwind pour un design sombre épuré et contrasté.'
    ];
  }
  if(r.includes('musicien') || r.includes('sound')){
    return [
      'Définir la synthèse sonore WebAudio (oscillateurs, enveloppes ADSR, filtres).',
      'Créer les tables d\\'accords et progressions harmoniques.',
      'Concevoir les effets sonores (SFX) et textures ambiantes.'
    ];
  }
  if(r.includes('midi')){
    return [
      'Implémenter la réception et le décodage des messages MIDI Note On/Off et CC.',
      'Gérer l\\'horloge MIDI Clock (24 PPQN) et la synchronisation du tempo.',
      'Créer le protocole SysEx pour la configuration des paramètres hardware.'
    ];
  }
  if(r.includes('microcontr') || r.includes('embarqu')){
    return [
      'Écrire le driver I2C/SPI pour la communication avec le contrôleur.',
      'Configurer les interruptions GPIO et la gestion PWM pour ESP32 / Pico.',
      'Optimiser la boucle temps réel et la consommation mémoire RAM/Flash.'
    ];
  }
  return [
    'Implémenter la fonctionnalité demandée avec typage strict.',
    'Effectuer une passe de revue de code et de robustesse.',
    'Écrire la suite de tests unitaires correspondante.'
  ];
}

function closePromptModal(){
  el('prompt-modal').classList.remove('open');
}

async function submitPromptOrder(event){
  event.preventDefault();
  const order = el('prompt-order-text').value.trim();
  if(!order) return;
  el('prompt-feedback').textContent = 'Envoi de l\\'ordre en cours…';
  try{
    const res = await api('/api/agent/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: activePromptTarget.type === 'agent' ? activePromptTarget.id : undefined,
        groupIndex: activePromptTarget.groupIndex >= 0 ? activePromptTarget.groupIndex : undefined,
        order
      })
    });
    el('prompt-feedback').textContent = '✓ ' + (res.message || 'Ordre enregistré avec succès !');
    setTimeout(() => {
      closePromptModal();
      load(el('project').value);
    }, 900);
  }catch(err){
    el('prompt-feedback').textContent = 'Erreur : ' + (err instanceof Error ? err.message : String(err));
  }
}

function openConfigModal(agentId){
  const agent = (window.arenaData?.connections || []).find((c) => c.id === agentId);
  if(!agent) return;
  const providerKey = getProviderKey(agent.id, agent.label);
  el('cfg-agent-id').value = agent.id;
  el('cfg-label').value = agent.label;
  el('cfg-role').value = agent.role || extractRole(agent.notes, agent.label);
  el('cfg-is-leader').checked = Boolean(agent.isLeader || (agent.role||'').includes('Chef'));
  el('cfg-prompt').value = agent.systemPrompt || generateSystemPrompt(el('cfg-role').value, el('cfg-is-leader').checked, agent.model);
  el('cfg-auth-path').value = agent.authPath || (agent.kind === 'cli-session' ? 'cli' : 'api');
  el('cfg-base-url').value = agent.customBaseUrl || agent.baseUrl || '';
  el('cfg-api-key').value = '';
  
  if(agent.keyPreview || agent.apiKeyConfigured){
    el('cfg-key-preview').innerHTML = '✓ Clé active chiffrée (AES-256) : <code style="color:var(--green)">' + esc(agent.keyPreview || 'Configurée') + '</code>';
  } else {
    el('cfg-key-preview').innerHTML = '<span style="color:var(--muted)">Aucune clé personnalisée pour cet agent.</span>';
  }
  el('config-modal').classList.add('open');
}

function closeConfigModal(){
  el('config-modal').classList.remove('open');
}

async function submitConfigModal(event){
  event.preventDefault();
  const id = el('cfg-agent-id').value;
  const role = el('cfg-role').value;
  const isLeader = el('cfg-is-leader').checked;
  const systemPrompt = el('cfg-prompt').value;
  const authPath = el('cfg-auth-path').value;
  const customBaseUrl = el('cfg-base-url').value.trim();
  const apiKey = el('cfg-api-key').value.trim();

  try{
    if(apiKey){
      const agent = (window.arenaData?.connections || []).find((c) => c.id === id);
      const provider = getProviderKey(id, agent?.label || '') || 'custom';
      await api('/api/credentials/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, preferredMode: authPath, customBaseUrl })
      });
    }

    await api('/api/connections/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role, isLeader, systemPrompt, authPath, customBaseUrl })
    });
    closeConfigModal();
    await load(el('project').value);
  }catch(err){
    alert('Erreur sauvegarde config : ' + (err instanceof Error ? err.message : String(err)));
  }
}

function consoleLines(machine){
  return [
    '[SUPER IA] Console aperçue — ' + String(machine.state || 'active').toUpperCase(),
    'CIBLE ' + String(machine.user || 'user') + '@' + String(machine.host || 'hôte') + ':' + String(machine.port || 22),
    ...(Array.isArray(machine.reasons) ? machine.reasons.slice(0, 3) : []),
    machine.networkChecked === false ? '[INFO] Aucun test réseau automatique' : ''
  ].filter(Boolean);
}

let consoleStream;
let activeConsoleId = '';

function appendConsole(value){
  const output = el('console-output');
  output.textContent = (output.textContent + value).slice(-20000);
  output.scrollTop = output.scrollHeight;
}

async function sendConsoleInput(){
  const input = el('console-input');
  const data = input.value + '\\n';
  if(!activeConsoleId || !input.value) return;
  input.value = '';
  await fetch('/api/console/' + encodeURIComponent(activeConsoleId) + '/input', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ data }) });
}

async function openConsole(id){
  const machines = (window.arenaData?.machines || []);
  const machine = machines.find((item) => item.id === id) || { id, label: id, platform: 'linux', transport: 'ssh' };
  activeConsoleId = id;
  el('console-title').textContent = machine.label || id;
  el('console-meta').textContent = String(machine.platform || 'machine').toUpperCase() + ' · ' + String(machine.transport || 'ssh').toUpperCase();
  el('console-output').textContent = consoleLines(machine).join('\\n') + '\\n';
  el('console-drawer').classList.add('open');
  try{
    const opened = await fetch('/api/console/' + encodeURIComponent(id) + '/open', { method: 'POST', headers: { 'Accept': 'application/json' } });
    if(!opened.ok) throw new Error((await opened.json()).error || 'Ouverture SSH refusée');
    consoleStream = new EventSource('/api/console/' + encodeURIComponent(id) + '/stream');
    consoleStream.addEventListener('history', (event) => { el('console-output').textContent = event.data ? JSON.parse(event.data) : ''; });
    consoleStream.addEventListener('output', (event) => appendConsole(JSON.parse(event.data)));
  }catch(error){
    appendConsole('\\n[SUPER IA] ' + (error instanceof Error ? error.message : String(error)) + '\\n');
  }
}

function closeConsole(){
  if(consoleStream){ consoleStream.close(); consoleStream = undefined; }
  if(activeConsoleId) void fetch('/api/console/' + encodeURIComponent(activeConsoleId) + '/close', { method: 'POST' });
  activeConsoleId = '';
  el('console-drawer').classList.remove('open');
}

let currentDraggedEntity = '';
let currentDraggedGroup = -1;

function switchMainTab(tabName){
  const tabs = ['team', 'ledger', 'vault', 'activity'];
  tabs.forEach((t) => {
    const btn = el('tab-btn-' + t);
    const view = el('view-' + t);
    if(btn) btn.classList.toggle('active', t === tabName);
    if(view) view.style.display = t === tabName ? 'block' : 'none';
  });
  try { localStorage.setItem('superia-main-tab', tabName); } catch(e){}
}
window.switchMainTab = switchMainTab;

function dragEntity(event, type, id){
  const key = entityKey(type, id);
  currentDraggedEntity = key;
  currentDraggedGroup = -1;
  event.dataTransfer.setData('text/superia-entity', key);
  event.dataTransfer.setData('text/plain', key);
  event.dataTransfer.effectAllowed = 'copyMove';
}

function dropEntity(event, type, id){
  event.preventDefault();
  const source = event.dataTransfer.getData('text/superia-entity') || currentDraggedEntity;
  if(!source) return;
  mergeGroup(source, entityKey(type, id));
}

function createNewGroupFromEntity(entity){
  if(!entity) return;
  const items = arenaState.selected.includes(entity) ? [...new Set(arenaState.selected)] : [entity];
  const activeProjId = el('project')?.value;
  if(items.length === 1 && entity.startsWith('agent:') && activeProjId && activeProjId !== 'Chargement…'){
    items.push(entityKey('project', activeProjId));
  }
  const chosen = new Set(items);
  arenaState.groups = arenaState.groups.map((group) => group.filter((key) => !chosen.has(key))).filter((group) => group.length >= 2);
  arenaState.groups.push(items);
  arenaState.selected = [];
  saveArena();
  renderArena(window.arenaData || {});
}

function mergeGroup(source, target){
  if(source === target) return;
  const groups = arenaState.groups.map((group) => [...new Set(group)]);
  const sourceGroup = groups.find((group) => group.includes(source)) || [source];
  const targetGroup = groups.find((group) => group.includes(target)) || [target];
  const merged = [...new Set([...sourceGroup, ...targetGroup])];
  
  // Strict 6 IA limit validation
  const agentCount = merged.filter((k) => k.startsWith('agent:')).length;
  if(agentCount > 6){
    alert('Limite atteinte : un groupe de travail ne peut comporter que 6 IA au maximum.');
    return;
  }

  const remaining = groups.filter((group) => group !== sourceGroup && group !== targetGroup);
  arenaState.groups = [...remaining, merged];
  arenaState.selected = [];
  saveArena();
  renderArena(window.arenaData || {});
}

function dragGroup(event, index){
  currentDraggedGroup = index;
  currentDraggedEntity = '';
  event.dataTransfer.setData('text/superia-group', String(index));
  event.dataTransfer.setData('text/plain', 'group:' + index);
  event.dataTransfer.effectAllowed = 'move';
}

function dropOnGroup(event, index){
  event.preventDefault();
  const groupIndex = event.dataTransfer.getData('text/superia-group') || (currentDraggedGroup >= 0 ? String(currentDraggedGroup) : '');
  if(groupIndex !== ''){
    const source = Number(groupIndex);
    if(Number.isInteger(source) && source !== index){
      const groups = arenaState.groups.map((group) => [...group]);
      if(groups[index] && groups[source]){
        const merged = [...new Set([...groups[index], ...groups[source]])];
        if(merged.filter((k) => k.startsWith('agent:')).length > 6){
          alert('Limite atteinte : un groupe de travail ne peut comporter que 6 IA au maximum.');
          return;
        }
        groups[index] = merged;
        groups.splice(source, 1);
        arenaState.groups = groups;
        arenaState.selected = [];
        saveArena();
        renderArena(window.arenaData || {});
      }
    }
    return;
  }
  const source = event.dataTransfer.getData('text/superia-entity') || currentDraggedEntity;
  if(!source) return;
  const groups = arenaState.groups.map((group) => [...group]);
  const sourceIndex = groups.findIndex((group) => group.includes(source));
  
  const testGroup = [...(groups[index] || [])];
  if(!testGroup.includes(source)) testGroup.push(source);
  if(testGroup.filter((k) => k.startsWith('agent:')).length > 6){
    alert('Limite atteinte : un groupe de travail ne peut comporter que 6 IA au maximum.');
    return;
  }

  if(sourceIndex >= 0 && sourceIndex !== index){
    groups[index] = [...new Set([...groups[index], ...groups[sourceIndex]])];
    groups.splice(sourceIndex, 1);
  }else if(!groups[index].includes(source)){
    groups[index].push(source);
  }
  arenaState.groups = groups;
  arenaState.selected = [];
  saveArena();
  renderArena(window.arenaData || {});
}

function groupSelected(){
  const selected = [...new Set(arenaState.selected)];
  if(selected.length < 2) return;
  if(selected.filter((k) => k.startsWith('agent:')).length > 6){
    alert('Limite de 6 IA maximum par groupe.');
    return;
  }
  const chosen = new Set(selected);
  arenaState.groups = arenaState.groups.map((group) => group.filter((key) => !chosen.has(key))).filter((group) => group.length >= 2);
  arenaState.groups.push(selected);
  arenaState.selected = [];
  saveArena();
  renderArena(window.arenaData || {});
}

function dissolveGroup(index){
  arenaState.groups.splice(index, 1);
  saveArena();
  renderArena(window.arenaData || {});
}

function removeMemberFromGroup(groupIndex, memberKey){
  if(!arenaState.groups[groupIndex]) return;
  arenaState.groups[groupIndex] = arenaState.groups[groupIndex].filter((k) => k !== memberKey);
  if(arenaState.groups[groupIndex].length < 2){
    arenaState.groups.splice(groupIndex, 1);
  }
  saveArena();
  renderArena(window.arenaData || {});
}

function badgeClass(id, label){
  const str = (id + ' ' + label).toLowerCase();
  if(str.includes('groq')) return 'badge-groq';
  if(str.includes('gpt') || str.includes('openai') || str.includes('codex')) return 'badge-gpt';
  if(str.includes('claude') || str.includes('anthropic')) return 'badge-claude';
  if(str.includes('gemini') || str.includes('google')) return 'badge-gemini';
  if(str.includes('grok') || str.includes('xai')) return 'badge-grok';
  if(str.includes('mistral') || str.includes('vibe')) return 'badge-mistral';
  if(str.includes('deepseek')) return 'badge-deepseek';
  if(str.includes('openrouter')) return 'badge-openrouter';
  if(str.includes('pi') || str.includes('arm')) return 'badge-pi';
  if(str.includes('win') || str.includes('powershell')) return 'badge-win';
  return 'badge-local';
}

function extractRole(notes, label){
  if(notes && notes.includes('Rôle:')) {
    const part = notes.split('Rôle:')[1].split('.')[0].trim();
    if(part) return part;
  }
  if(label && label.includes('—')) return label.split('—')[1].trim();
  if(label && label.includes('(')) return label.split('(')[1].replace(')', '').trim();
  return 'Agent IA';
}

function renderMatrix(data){
  const agents = data.connections || [];
  const machines = data.machines || [];

  // Sort: Leader first, then defined role cards
  const sortedAgents = [...agents].sort((a, b) => {
    if(a.isLeader && !b.isLeader) return -1;
    if(!a.isLeader && b.isLeader) return 1;
    return a.id.localeCompare(b.id);
  });

  const cardsHtml = [
    ...sortedAgents.map((x) => {
      const isSelected = arenaState.selected.includes(entityKey('agent', x.id));
      const badgeCls = badgeClass(x.id, x.label);
      const isLeader = Boolean(x.isLeader || (x.role && x.role.includes('Chef')));
      const role = x.role || extractRole(x.notes, x.label);
      const roleCls = getRoleBadgeClass(role);
      const roleIcon = getRoleIcon(role);
      const providerKey = getProviderKey(x.id, x.label);
      const modelList = PROVIDER_MODELS[providerKey] || [];
      const currentModel = x.model || (modelList[0]?.id || 'default');

      const modelSelectHtml = modelList.length > 0
        ? '<div class="card-select-row">' +
            '<label>Modèle IA :</label>' +
            '<select class="model-dropdown" data-action="change-model" data-id="'+esc(x.id)+'" onchange="event.stopPropagation();updateAgentModel(\\''+esc(x.id)+'\\', this.value)">' +
              modelList.map((m) => '<option value="'+esc(m.id)+'" '+(m.id===currentModel?'selected':'')+'>'+esc(m.label)+'</option>').join('') +
            '</select>' +
          '</div>'
        : '';

      const authPath = x.authPath || (x.kind === 'cli-session' ? 'cli' : 'api');
      const hasKey = Boolean(x.keyPreview || x.apiKeyConfigured);
      const keyPreview = x.keyPreview || '';
      const cliCommand = x.command || PROVIDER_DEFAULTS[providerKey]?.cli || 'cli';

      let authStatusText = '';
      let authStatusCls = 'ready';
      if(authPath === 'cli'){
        authStatusText = '🟢 Session CLI (<code>$ ' + esc(cliCommand) + '</code>) · Éco / Forfait';
        authStatusCls = 'ready';
      } else {
        if(hasKey){
          authStatusText = '🔒 Clé API: <code style="color:var(--green)">' + esc(keyPreview || 'Active') + '</code> (AES-256)';
          authStatusCls = 'ready';
        } else {
          authStatusText = '⚠️ Clé requise · <button type="button" class="card-btn prompt" onclick="event.stopPropagation();openCredentialsModal(\\''+esc(providerKey||'openai')+'\\')" style="padding:1px 5px;font-size:8.5px">Configurer</button>';
          authStatusCls = 'warn';
        }
      }

      const authSwitcherHtml = providerKey ? (
        '<div class="auth-path-box">' +
          '<div class="auth-path-header">' +
            '<span>Mode d\\'exécution :</span>' +
            '<span>' + (authPath === 'cli' ? '🟢 ÉCO / LOCAL' : '⚡ DIRECT API') + '</span>' +
          '</div>' +
          '<div class="auth-path-switcher">' +
            '<button type="button" class="auth-path-btn cli '+(authPath==='cli'?'active':'')+'" onclick="event.stopPropagation();switchAgentAuthMode(\\''+esc(x.id)+'\\', \\'cli\\')" title="Utilise la session CLI installée (moins cher, forfait / local)">💻 CLI Session (Éco)</button>' +
            '<button type="button" class="auth-path-btn api '+(authPath==='api'?'active':'')+'" onclick="event.stopPropagation();switchAgentAuthMode(\\''+esc(x.id)+'\\', \\'api\\')" title="Utilise l\\'appel API direct avec clé chiffrée (jetons / pay-as-you-go)">⚡ Clé API (Direct)</button>' +
          '</div>' +
          '<div class="auth-path-status '+authStatusCls+'">' +
            '<span>' + authStatusText + '</span>' +
          '</div>' +
        '</div>'
      ) : '';

      return '<div class="matrix-card '+(isSelected?'selected':'')+' '+(isLeader?'is-leader':'')+'" draggable="true" data-type="agent" data-id="'+esc(x.id)+'" title="Glisser sur une autre carte pour former un groupe">' +
        '<div>' +
          '<div class="matrix-card-header">' +
            '<div>' +
              '<div class="matrix-card-title">'+esc(x.label)+'</div>' +
              (isLeader ? '<div class="leader-badge">👑 CHEF D\\'ÉQUIPE</div>' : '<div class="role-badge '+roleCls+'">'+roleIcon+' '+esc(role)+'</div>') +
            '</div>' +
            '<span class="matrix-badge '+badgeCls+'">'+esc(providerKey ? providerKey.toUpperCase() : x.kind)+'</span>' +
          '</div>' +
          modelSelectHtml +
          authSwitcherHtml +
          '<pre class="console-preview">'+esc(x.systemPrompt || x.notes || (x.command ? '$ ' + x.command : (x.baseUrl || 'Connexion IA')))+'</pre>' +
        '</div>' +
        '<div class="matrix-footer">' +
          '<button class="card-btn '+(isLeader?'leader':'')+'" type="button" data-action="toggle-leader" data-id="'+esc(x.id)+'" title="Définir ce modèle comme Chef d\\'équipe pour segmenter les tâches et diriger le groupe">'+(isLeader?'👑 CHEF':'★ NOMMER CHEF')+'</button>' +
          '<button class="card-btn prompt" type="button" data-action="prompt-agent" data-id="'+esc(x.id)+'" title="Ouvrir la fenêtre pour donner des ordres et consignes">💬 PROMPT</button>' +
          '<button class="card-btn" type="button" data-action="config-agent" data-id="'+esc(x.id)+'">CONFIG</button>' +
          '<button class="card-btn" type="button" data-action="expand-agent" data-id="'+esc(x.id)+'">AGRANDIR</button>' +
        '</div>' +
      '</div>';
    }),
    ...machines.map((x) => {
      const isSelected = arenaState.selected.includes(entityKey('machine', x.id));
      const badgeCls = badgeClass(x.id, x.label);
      return '<div class="matrix-card '+(isSelected?'selected':'')+'" draggable="true" data-type="machine" data-id="'+esc(x.id)+'">' +
        '<div>' +
          '<div class="matrix-card-header">' +
            '<div><div class="matrix-card-title">'+esc(x.label)+'</div><div class="role-badge">🖥️ '+esc(x.platform.toUpperCase())+' · '+esc(x.transport.toUpperCase())+'</div></div>' +
            '<span class="matrix-badge '+badgeCls+'">'+esc(x.platform)+'</span>' +
          '</div>' +
          '<pre class="console-preview">'+esc(consoleLines(x).slice(0,3).join('\\n'))+'</pre>' +
        '</div>' +
        '<div class="matrix-footer">' +
          '<span class="status '+(x.state||'ready')+'">'+esc((x.state||'ready').toUpperCase())+'</span>' +
          '<button class="card-btn" type="button" data-action="expand" data-id="'+esc(x.id)+'">AGRANDIR</button>' +
        '</div>' +
      '</div>';
    })
  ].join('');

  el('matrix-grid').innerHTML = cardsHtml || '<div class="empty">Aucune carte disponible</div>';
}

function renderProjectsSidebar(projects, selectedProject){
  const container = el('projects-mini-list');
  const validProjects = (projects || []).filter((p) => p && p.name && !p.name.startsWith('.') && !p.name.includes('.superia') && !(p.root || '').includes('/.superia') && p.name !== 'node_modules' && p.name !== 'dist');
  if(!validProjects.length){
    container.innerHTML = '<div class="empty">Aucun projet trouvé dans ce dossier.<br>Cliquez sur le bouton ci-dessus pour sélectionner un dossier.</div>';
    return;
  }
  container.innerHTML = validProjects.map((p) => {
    const isSelected = selectedProject && selectedProject.id === p.id;
    const isArenaSelected = arenaState.selected.includes(entityKey('project', p.id));
    return '<div class="project-mini-card '+((isSelected || isArenaSelected)?'active':'')+'" draggable="true" data-type="project" data-id="'+esc(p.id)+'" title="Glisser sur une IA pour créer un groupe de travail">' +
      '<div class="project-mini-header">' +
        '<strong class="project-mini-name">📁 ' + esc(p.name) + '</strong>' +
        '<span class="status ' + cls(p.status) + '">' + esc(p.status) + '</span>' +
      '</div>' +
      '<div class="project-mini-path">' + esc(p.root) + '</div>' +
      '<div class="project-mini-meta">' +
        '<span>Branche: ' + esc(p.defaultBranch || 'main') + '</span>' +
        '<span class="project-save-badge">💾 .superia/project.json</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderArena(data){
  window.arenaData = data;
  const agents = data.connections || [], machines = data.machines || [], projects = data.projects || [];
  renderMatrix(data);
  renderProjectsSidebar(projects, data.selectedProject);

  const agentCards = agents.map((x)=>'<button draggable="true" data-type="agent" data-id="'+esc(x.id)+'" class="entity-card '+(arenaState.selected.includes(entityKey('agent',x.id))?'selected':'')+'" type="button"><span class="entity-icon">AI</span><span class="entity-name">'+esc(x.label)+'</span><span class="entity-meta">'+esc(x.kind)+' · '+(x.enabled!==false?'prêt':'off')+'</span></button>').join('');
  const machineCards = machines.map((x)=>'<article draggable="true" data-type="machine" data-id="'+esc(x.id)+'" class="entity-card '+(arenaState.selected.includes(entityKey('machine',x.id))?'selected':'')+'"><span class="entity-icon">⌘</span><span class="entity-name">'+esc(x.label)+'</span><span class="entity-meta">'+esc(x.platform)+' · '+esc(x.state||'ready')+'</span><pre class="console-preview">'+esc(consoleLines(x).slice(0,3).join('\\n'))+'</pre><span class="console-actions"><button class="card-expand" type="button" data-action="expand" data-id="'+esc(x.id)+'">AGRANDIR</button></span></article>').join('');
  const projectCards = projects.map((x)=>'<button draggable="true" data-type="project" data-id="'+esc(x.id)+'" class="entity-card '+(arenaState.selected.includes(entityKey('project',x.id))?'selected':'')+'" type="button"><span class="entity-icon">G</span><span class="entity-name">'+esc(x.name)+'</span><span class="entity-meta">Git · '+esc(x.status)+'</span></button>').join('');

  el('agent-cards').innerHTML = agentCards || '<div class="empty">Aucune IA enregistrée</div>';
  el('machine-cards').innerHTML = machineCards || '<div class="empty">Aucune console enregistrée</div>';
  el('project-cards').innerHTML = projectCards || '<div class="empty">Aucun dépôt Git enregistré</div>';

  const all = new Map([...agents.map((x)=>[entityKey('agent',x.id),x]), ...machines.map((x)=>[entityKey('machine',x.id),x]), ...projects.map((x)=>[entityKey('project',x.id),x])]);
  const selected = arenaState.selected.map((key)=>all.get(key)).filter(Boolean);

  el('pair-card').innerHTML = selected.length
    ? '<div class="pair-side"><strong>' + selected.map((x)=>esc(x.label||x.name)).join(' ⟷ ') + '</strong><span>' + selected.length + ' élément(s) sélectionné(s) pour collaboration</span></div><button class="btn" id="btn-group-selected" type="button">CRÉER LE GROUPE COLLABORATIF</button>'
    : '<div class="empty">Glisse une carte Projet sur une IA (ou une IA sur une autre) à la souris pour former un groupe de travail.</div>';

  // Render Rich Double-Size Group Cards with Clean Inner Mini-Cards (Max 6 IA)
  el('groups').innerHTML = arenaState.groups.map((group, index) => {
    const members = group.map((k) => all.get(k)).filter(Boolean);
    const leader = members.find((m) => m && (m.isLeader || (m.role && m.role.includes('Chef'))));
    const otherAgents = members.filter((m) => m !== leader && m.kind !== undefined);
    const projectItem = members.find((m) => m && m.status !== undefined && m.root !== undefined);
    const machineItems = members.filter((m) => m && m.platform !== undefined);
    const hasProject = Boolean(projectItem);

    // Render inner mini-cards
    const miniCardsHtml = group.map((key) => {
      const item = all.get(key);
      if(!item) return '';
      const isProj = key.startsWith('project:');
      const isMach = key.startsWith('machine:');
      const isAg = key.startsWith('agent:');
      const isLead = isAg && Boolean(item.isLeader || (item.role && item.role.includes('Chef')));
      const role = isAg ? (item.role || extractRole(item.notes, item.label)) : (isProj ? 'Dépôt Git' : 'Console SSH');
      const roleCls = isAg ? getRoleBadgeClass(role) : '';
      const icon = isAg ? getRoleIcon(role) : (isProj ? '📁' : '🖥️');

      return '<div class="group-mini-card '+(isLead?'is-leader':'')+' '+(isProj?'is-project':'')+'">' +
        '<div>' +
          '<div class="group-mini-card-head">' +
            '<span class="group-mini-card-name">'+icon+' '+esc(item.label || item.name)+'</span>' +
            '<button class="btn secondary small" style="padding:1px 5px;font-size:9px" type="button" data-action="remove-member" data-group-index="'+index+'" data-key="'+esc(key)+'" title="Retirer ce membre">✕</button>' +
          '</div>' +
          '<div class="group-mini-card-meta">' +
            (isLead ? '<span class="leader-badge" style="font-size:8.5px">👑 CHEF</span> ' : '') +
            '<span class="role-badge '+roleCls+'" style="font-size:8.5px">'+esc(role)+'</span>' +
            (item.model ? ' · ' + esc(item.model) : '') +
          '</div>' +
        '</div>' +
        '<div class="group-mini-card-actions">' +
          (isAg ? '<button class="card-btn prompt" type="button" data-action="prompt-agent" data-id="'+esc(item.id)+'" data-group-index="'+index+'" style="font-size:8.5px;padding:2px 5px">💬 ORDRE</button>' : '<span></span>') +
          (isMach ? '<button class="card-btn" type="button" data-action="expand" data-id="'+esc(item.id)+'" style="font-size:8.5px;padding:2px 5px">CONSOLE</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="group-card '+(hasProject?'has-project':'no-project')+'" draggable="true" data-group-index="'+index+'">' +
      '<div class="group-head">' +
        '<div class="group-title-box">' +
          '<span class="group-title">GROUPE DE TRAVAIL '+(index+1)+'</span>' +
          (hasProject 
            ? '<span class="group-project-badge ok">✓ PROJET ACTIF : 📁 ' + esc(projectItem.name) + '</span>' 
            : '<span class="group-project-badge missing">⚠️ AUCUN PROJET ASSOCIÉ · Glissez un dossier projet ici pour activer</span>') +
          (leader ? '<span class="leader-badge">👑 Chef : ' + esc(leader.label) + '</span>' : '<span class="sub" style="font-size:10px">(Aucun chef désigné)</span>') +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<button class="card-btn prompt" type="button" data-action="prompt-group" data-group-index="'+index+'">💬 ORDRE DE GROUPE</button>' +
          '<button class="btn danger small" type="button" data-action="dissolve" data-index="'+index+'">DISSOUDRE LE GROUPE</button>' +
        '</div>' +
      '</div>' +
      
      '<!-- Mini-cartes intérieures bien rangées (Max 6 IA) -->' +
      '<div class="group-mini-grid">' + miniCardsHtml + '</div>' +

      '<div class="group-orchestration">' +
        '⚡ <strong>Plan d\\'orchestration :</strong> ' + (leader ? 'L\\'IA Chef <strong>' + esc(leader.label) + '</strong> segmente les tâches, organise le flux et supervise les livrables de : ' + (otherAgents.map(a => esc(a.label)).join(', ') || 'l\\'équipe') + '.' : 'Collaboration directe entre pairs.') +
      '</div>' +
    '</div>';
  }).join('') || '<span class="sub">Aucun groupe actif. Déplace à la souris une carte sur une autre pour créer une équipe.</span>';
}

function setupArenaListeners(){
  document.addEventListener('click', (event)=>{
    const target = event.target;
    if(target.id === 'btn-group-selected'){ groupSelected(); return; }
    if(target.closest('#drop-zone-new-group')){
      if(arenaState.selected.length >= 1){
        groupSelected();
      } else {
        const activeProjId = el('project')?.value;
        const defaultAgent = (window.arenaData?.connections || [])[0];
        if(defaultAgent && activeProjId && activeProjId !== 'Chargement…'){
          createNewGroupFromEntity(entityKey('agent', defaultAgent.id));
        }
      }
      return;
    }
    const dissolveBtn = target.closest('button[data-action="dissolve"]');
    if(dissolveBtn){ event.stopPropagation(); dissolveGroup(Number(dissolveBtn.dataset.index)); return; }
    const removeMemberBtn = target.closest('button[data-action="remove-member"]');
    if(removeMemberBtn){ event.stopPropagation(); removeMemberFromGroup(Number(removeMemberBtn.dataset.groupIndex), removeMemberBtn.dataset.key); return; }
    const leaderBtn = target.closest('button[data-action="toggle-leader"]');
    if(leaderBtn){ event.stopPropagation(); toggleLeader(leaderBtn.dataset.id); return; }
    const promptAgentBtn = target.closest('button[data-action="prompt-agent"]');
    if(promptAgentBtn){ event.stopPropagation(); openPromptModal('agent', promptAgentBtn.dataset.id, Number(promptAgentBtn.dataset.groupIndex ?? -1)); return; }
    const promptGroupBtn = target.closest('button[data-action="prompt-group"]');
    if(promptGroupBtn){ event.stopPropagation(); openPromptModal('group', '', Number(promptGroupBtn.dataset.groupIndex)); return; }
    const configBtn = target.closest('button[data-action="config-agent"]');
    if(configBtn){ event.stopPropagation(); openConfigModal(configBtn.dataset.id); return; }
    const expandBtn = target.closest('button[data-action="expand"]');
    if(expandBtn){ event.stopPropagation(); openConsole(expandBtn.dataset.id); return; }
    const expandAgentBtn = target.closest('button[data-action="expand-agent"]');
    if(expandAgentBtn){
      event.stopPropagation();
      const agent = (window.arenaData?.connections||[]).find((c)=>c.id===expandAgentBtn.dataset.id);
      if(agent) openConsole(agent.id);
      return;
    }
    const card = target.closest('[data-type][data-id]');
    if(card && !target.closest('button') && !target.closest('select') && !target.closest('input')){
      if(card.dataset.type === 'project'){
        el('project').value = card.dataset.id;
        load(card.dataset.id);
      } else {
        selectEntity(card.dataset.type, card.dataset.id);
      }
      return;
    }
  });

  document.addEventListener('dragstart', (event)=>{
    const card = event.target.closest('[data-type][data-id]');
    if(card){
      dragEntity(event, card.dataset.type, card.dataset.id);
      card.classList.add('is-dragging');
      return;
    }
    const group = event.target.closest('.group-card[data-group-index]');
    if(group){
      dragGroup(event, Number(group.dataset.groupIndex));
      group.classList.add('is-dragging');
      return;
    }
  });

  document.addEventListener('dragend', ()=>{
    document.querySelectorAll('.is-dragging').forEach((el) => el.classList.remove('is-dragging'));
    document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    currentDraggedEntity = '';
    currentDraggedGroup = -1;
  });

  document.addEventListener('dragover', (event)=>{
    const dropTarget = event.target.closest('[data-type][data-id]') || 
                       event.target.closest('.group-card[data-group-index]') ||
                       event.target.closest('#drop-zone-new-group') ||
                       event.target.closest('#groups');
    if(dropTarget){
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  });

  document.addEventListener('dragenter', (event)=>{
    const dropTarget = event.target.closest('[data-type][data-id]') || 
                       event.target.closest('.group-card[data-group-index]') ||
                       event.target.closest('#drop-zone-new-group');
    if(dropTarget){
      dropTarget.classList.add('drag-over');
    }
  });

  document.addEventListener('dragleave', (event)=>{
    const dropTarget = event.target.closest('[data-type][data-id]') || 
                       event.target.closest('.group-card[data-group-index]') ||
                       event.target.closest('#drop-zone-new-group');
    if(dropTarget && !dropTarget.contains(event.relatedTarget)){
      dropTarget.classList.remove('drag-over');
    }
  });

  document.addEventListener('drop', (event)=>{
    document.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    document.querySelectorAll('.is-dragging').forEach((el) => el.classList.remove('is-dragging'));

    const newGroupZone = event.target.closest('#drop-zone-new-group');
    if(newGroupZone){
      event.preventDefault();
      const entity = event.dataTransfer.getData('text/superia-entity') || currentDraggedEntity;
      if(entity){
        createNewGroupFromEntity(entity);
      }
      return;
    }

    const group = event.target.closest('.group-card[data-group-index]');
    if(group){
      event.preventDefault();
      dropOnGroup(event, Number(group.dataset.groupIndex));
      return;
    }

    const card = event.target.closest('[data-type][data-id]');
    if(card){
      event.preventDefault();
      dropEntity(event, card.dataset.type, card.dataset.id);
      return;
    }
  });
}
setupArenaListeners();

async function triggerFolderPicker(){
  if(window.showDirectoryPicker){
    try{
      const handle = await window.showDirectoryPicker();
      if(handle && handle.name){
        el('folder-input').value = handle.name;
        await syncFolderProject(handle.name);
        return;
      }
    }catch(err){
      if(err && err.name === 'AbortError') return;
    }
  }
  el('folder-picker').click();
}

async function onNativeFolderPicked(event){
  const files = event.target.files;
  if(files && files.length > 0){
    const relative = files[0].webkitRelativePath || '';
    const folderName = relative.split('/')[0] || files[0].name || 'projet-local';
    el('folder-input').value = folderName;
    await syncFolderProject(folderName);
  }
}

async function syncFolderProject(customFolder){
  const folder = (customFolder || el('folder-input').value || '').trim();
  if(!folder) { alert('Veuillez sélectionner un dossier'); return; }
  try{
    el('error').textContent = 'Validation du dossier et sauvegarde de la configuration…';
    const result = await api('/api/projects/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory: folder })
    });
    el('folder-input').value = '';
    el('error').textContent = '✓ Dossier validé · .superia/project.json créé avec succès !';
    await load(result.project?.id || '');
  }catch(error){
    el('error').textContent = 'Erreur dossier : ' + (error instanceof Error ? error.message : String(error));
  }
}

function openNewCardModal(){
  el('create-modal').classList.add('open');
  updateCreationPresets();
}
function closeNewCardModal(){
  el('create-modal').classList.remove('open');
}

const PRESET_CONFIGS = {
  'groq-llama': { label: 'Groq — Llama 3.3', kind: 'openai-compatible', authMode: 'environment', baseUrl: 'https://api.groq.com/openai/v1', requiredEnv: ['GROQ_API_KEY'], model: 'llama-3.3-70b-versatile', notes: 'Inférence ultra-rapide 500+ tok/s sur Groq.' },
  'gpt-4o': { label: 'OpenAI — GPT-4o', kind: 'cli-session', authMode: 'session', command: 'codex', model: 'gpt-4o', notes: 'Codeur Principal & Architecture OpenAI.' },
  'claude-3-7': { label: 'Anthropic — Claude 3.7', kind: 'cli-session', authMode: 'session', command: 'claude', model: 'claude-3-7-sonnet-latest', notes: 'Architecte Système & Raisonnement complexe.' },
  'gemini-2-5-pro': { label: 'Google — Gemini 2.5 Pro', kind: 'cli-session', authMode: 'session', command: 'gemini', model: 'gemini-2.5-pro', notes: 'Super Contexte 2M tokens & Multimodal.' },
  'grok-3': { label: 'xAI — Grok 3', kind: 'openai-compatible', authMode: 'environment', baseUrl: 'https://api.x.ai/v1', requiredEnv: ['XAI_API_KEY'], model: 'grok-3', notes: 'Raisonnement profond & Débogage xAI.' },
  'mistral-large': { label: 'Mistral AI — Large 2', kind: 'api-key-env', authMode: 'environment', baseUrl: 'https://api.mistral.ai/v1', requiredEnv: ['MISTRAL_API_KEY'], model: 'mistral-large-latest', notes: 'Contrôle souverain & respect strict des consignes.' },
  'pi-ssh': { type: 'machine', label: 'Console Raspberry Pi (SSH)', platform: 'linux', transport: 'ssh', host: '192.168.1.50', user: 'pi', port: 22, notes: 'Console Linux ARM64 SSH' },
  'win-ssh': { type: 'machine', label: 'Console Windows 11 (SSH)', platform: 'windows', transport: 'ssh', host: '192.168.1.100', user: 'developer', port: 22, shell: 'powershell.exe', notes: 'Console Windows PowerShell SSH' }
};

function updateCreationPresets(){
  const modelKey = el('preset-model').value;
  const roleKey = el('preset-role').value;
  const config = PRESET_CONFIGS[modelKey] || {};
  
  if(config.type === 'machine'){
    el('field-card-type').value = 'machine';
    el('field-label').value = config.label || '';
    el('field-id').value = 'console-' + Math.random().toString(36).slice(2,7);
    el('field-notes').value = 'Rôle: ' + roleKey + ' · ' + (config.notes || '');
  } else {
    el('field-card-type').value = 'agent';
    el('field-label').value = (config.label || 'Agent IA');
    el('field-id').value = 'agent-' + Math.random().toString(36).slice(2,7);
    el('field-notes').value = 'Rôle: ' + roleKey + '. ' + (config.notes || '');
  }
}

async function submitCreateCard(event){
  event.preventDefault();
  const cardType = el('field-card-type').value;
  const id = el('field-id').value.trim();
  const label = el('field-label').value.trim();
  const notes = el('field-notes').value.trim();
  const modelKey = el('preset-model').value;
  const roleKey = el('preset-role').value;
  const isLeader = roleKey.includes('Chef');
  const preset = PRESET_CONFIGS[modelKey] || {};
  const prompt = generateSystemPrompt(roleKey, isLeader, preset.model);

  try{
    if(cardType === 'machine'){
      await api('/api/machines/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          label,
          platform: preset.platform || 'linux',
          transport: preset.transport || 'ssh',
          host: preset.host || '127.0.0.1',
          port: preset.port || 22,
          user: preset.user || 'root',
          shell: preset.shell || 'bash',
          notes
        })
      });
    } else {
      await api('/api/connections/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          label,
          kind: preset.kind || 'cli-session',
          command: preset.command,
          baseUrl: preset.baseUrl,
          requiredEnv: preset.requiredEnv,
          model: preset.model,
          role: roleKey,
          isLeader,
          systemPrompt: prompt,
          notes
        })
      });
    }
    closeNewCardModal();
    await load(el('project').value);
  }catch(error){
    alert('Erreur lors de la création : ' + (error instanceof Error ? error.message : String(error)));
  }
}

async function load(projectId){
  el('error').textContent = '';
  const query = projectId ? '?projectId=' + encodeURIComponent(projectId) : '';
  try{
    const [data, persistedArena] = await Promise.all([api('/api/overview' + query), api('/api/arena')]);
    arenaState = persistedArena;
    
    // Populate projects dropdown
    const selector = el('project');
    selector.innerHTML = data.projects.map((project) => '<option value="' + esc(project.id) + '" ' + (data.selectedProject?.id === project.id ? 'selected' : '') + '>📁 ' + esc(project.name) + ' (' + esc(project.root) + ')</option>').join('') || '<option value="">Aucun projet enregistré</option>';

    const stopLabel = data.emergencyStop.engaged ? 'ENGAGÉ' : 'LIBRE';
    el('cards').innerHTML = [
      ['Projets', data.status.projects],
      ['Missions', data.status.tasks],
      ['Runs', data.status.runs],
      ['Runs actifs', data.status.activeRuns],
      ['Arrêt urgence', stopLabel],
      ['Readiness', data.readiness?.overall || 'indisponible']
    ].map((item) => '<div class="card"><div class="label">' + esc(item[0]) + '</div><div class="value ' + cls(item[1]) + '">' + esc(item[1]) + '</div></div>').join('');

    const banner = el('emergency');
    if(data.emergencyStop.engaged){
      banner.style.display = 'block';
      banner.textContent = 'ARRÊT D’URGENCE ENGAGÉ · ' + text(data.emergencyStop.category) + ' · génération ' + text(data.emergencyStop.generation) + ' · diagnostics seuls autorisés';
    }else{
      banner.style.display = 'none';
      banner.textContent = '';
    }

    el('project-meta').textContent = data.selectedProject ? data.selectedProject.root + ' · Branche: ' + text(data.selectedProject.defaultBranch || 'main') : 'Aucun projet sélectionné';
    renderArena(data);

    el('tasks').innerHTML = rows(data.tasks, [
      (x) => esc(x.id), (x) => esc(x.title), (x) => status(x.status), (x) => esc(text(x.provider)), (x) => esc(text(x.branchName)), (x) => esc(text(x.updatedAt))
    ]);
    el('runs').innerHTML = rows(data.runs, [
      (x) => esc(x.id.slice(0,12)), (x) => esc(text(x.taskId)), (x) => esc(x.provider), (x) => status(x.status), (x) => esc(x.startedAt), (x) => esc(text(x.finishedAt))
    ]);
    el('notifications').innerHTML = rows(data.notifications, [
      (x) => esc(x.createdAt), (x) => status(x.level), (x) => esc(x.title), (x) => esc(x.message), (x) => esc(x.kind)
    ]);
    el('events').innerHTML = rows(data.events, [
      (x) => esc(x.id), (x) => esc(x.type), (x) => esc(x.aggregateType), (x) => esc(x.aggregateId.slice(0,18)), (x) => esc(x.createdAt)
    ]);

    const readiness = data.readiness;
    el('readiness').innerHTML = readiness ? readiness.checks.map((x) => '<div class="card"><div class="label">' + esc(x.label) + '</div><div class="status ' + cls(x.level) + '">' + esc(x.level.toUpperCase()) + '</div><div>' + esc(x.summary) + '</div></div>').join('') : '<div class="empty">' + esc(data.readinessError || 'Readiness indisponible') + '</div>';

    // Rendu du grand tableau de comptabilité du travail des IA
    const ledger = (data.agentLedger || []).filter((it) => it && it.id);
    const ledgerHtml = ledger.length ? ledger.map((item) => {
      const isLead = Boolean(item.isLeader || (item.role && item.role.includes('Chef')));
      const roleCls = getRoleBadgeClass(item.role);
      const icon = getRoleIcon(item.role);
      const hasActivity = item.tasksCompleted > 0 || item.runsCount > 0;
      return '<tr>' +
        '<td><strong>' + esc(item.label) + '</strong> ' + (isLead ? '<span class="leader-badge" style="font-size:8.5px">👑 CHEF</span>' : '') + '</td>' +
        '<td><span class="role-badge ' + roleCls + '">' + icon + ' ' + esc(item.role) + '</span></td>' +
        '<td><code>' + (item.authPath === 'cli' ? '💻 CLI (Éco)' : '⚡ API Direct') + '</code>' + (item.model ? ' · <span class="sub" style="font-size:10px">' + esc(item.model) + '</span>' : '') + '</td>' +
        '<td><strong style="color:var(--green)">' + item.tasksCompleted + '</strong> mission(s)</td>' +
        '<td><strong>' + item.runsCount + '</strong> run(s)</td>' +
        '<td>' + (item.totalTokens ? item.totalTokens.toLocaleString() + ' tok' : '—') + '</td>' +
        '<td>' + (item.authPath === 'cli' ? '<span style="color:var(--green)">Forfait Éco</span>' : (hasActivity ? item.estimatedCostEur + ' €' : '0.00 €')) + '</td>' +
        '<td><span class="status ready" style="font-size:9px">✓ CERTIFIÉ</span></td>' +
        '<td class="sub" style="font-size:10px">' + (item.lastActivity ? esc(new Date(item.lastActivity).toLocaleTimeString()) : 'Prêt') + '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="9" class="empty">Aucune IA enregistrée dans la matrice</td></tr>';
    
    const ledgerBody = el('agent-ledger-body');
    if(ledgerBody) ledgerBody.innerHTML = ledgerHtml;

    el('generated').textContent = 'Actualisé ' + new Date().toLocaleTimeString();
  }catch(error){
    el('error').textContent = error instanceof Error ? error.message : String(error);
  }
}

el('project').addEventListener('change', (event) => load(event.target.value));
el('refresh').addEventListener('click', () => load(el('project').value));
el('btn-sync-folder').addEventListener('click', () => triggerFolderPicker());
el('folder-picker').addEventListener('change', (event) => onNativeFolderPicked(event));
el('btn-new-card').addEventListener('click', () => openNewCardModal());
el('btn-open-credentials').addEventListener('click', () => openCredentialsModal());
el('cred-provider').addEventListener('change', () => onCredProviderChange());
el('btn-cred-toggle-eye').addEventListener('click', () => toggleKeyVisibility());
el('form-credentials').addEventListener('submit', (e) => submitCredentialsForm(e));
el('btn-cred-delete').addEventListener('click', () => deleteCredentialsKey(el('cred-provider').value));
el('preset-model').addEventListener('change', () => updateCreationPresets());
el('preset-role').addEventListener('change', () => updateCreationPresets());
el('form-create-card').addEventListener('submit', (e) => submitCreateCard(e));
el('form-config-agent').addEventListener('submit', (e) => submitConfigModal(e));
el('form-prompt-order').addEventListener('submit', (e) => submitPromptOrder(e));

try {
  const savedTab = localStorage.getItem('superia-main-tab') || 'team';
  switchMainTab(savedTab);
} catch(_) {}

load('');
setInterval(() => load(el('project').value), 30000);
`;

export function renderDashboardPage(): string {
  return shell("Super IA — matrice locale", `<main class="wrap">
  <header class="top">
    <div>
      <div class="brand">SUPER IA // CONTROL MATRIX <span class="badge">V1.0</span></div>
      <div class="sub" id="generated">Chargement de la matrice…</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="btn" id="btn-open-credentials" type="button" style="background:#0b2413;border-color:#1c5528;color:#7cff96;font-size:11px;display:flex;align-items:center;gap:6px">
        <span>🔐</span> <span>COFFRE CLÉS API (AES-256)</span>
      </button>
      <button class="btn" id="btn-new-card" type="button">+ NOUVELLE CARTE IA / CONSOLE</button>
      <form method="post" action="/logout"><button class="btn secondary" type="submit">FERMER LA SESSION</button></form>
    </div>
  </header>

  <section class="panel emergency" id="emergency"></section>

  <!-- Métriques rapides -->
  <section class="grid" id="cards" style="margin-bottom:14px"></section>

  <!-- Barre d'onglets de navigation principale -->
  <nav class="app-nav-tabs">
    <button class="nav-tab active" id="tab-btn-team" type="button" onclick="switchMainTab('team')">
      <span class="nav-tab-icon">👥</span>
      <span class="nav-tab-label">PAGE TEAM & ARÈNE</span>
      <span class="nav-tab-badge" id="badge-team-count">11 IA · 4 Consoles</span>
    </button>
    <button class="nav-tab" id="tab-btn-ledger" type="button" onclick="switchMainTab('ledger')">
      <span class="nav-tab-icon">📊</span>
      <span class="nav-tab-label">COMPTABILITÉ & BILAN DU TRAVAIL</span>
      <span class="nav-tab-badge" style="color:var(--green)">Traçabilité & Coûts</span>
    </button>
    <button class="nav-tab" id="tab-btn-vault" type="button" onclick="switchMainTab('vault')">
      <span class="nav-tab-icon">🔐</span>
      <span class="nav-tab-label">COFFRE CLÉS API (AES-256)</span>
    </button>
    <button class="nav-tab" id="tab-btn-activity" type="button" onclick="switchMainTab('activity')">
      <span class="nav-tab-icon">⚡</span>
      <span class="nav-tab-label">JOURNAL D'ACTIVITÉ & RUNS</span>
    </button>
  </nav>

  <!-- ================= VUE 1 : PAGE TEAM & ARÈNE (COLONNE PROJETS + MATRICE IA 4-COLONNES + GROUPES) ================= -->
  <div id="view-team" class="main-view">
    <!-- Disposition Principale : Colonne Projets à gauche + Matrice IA à droite -->
    <div class="app-layout">
      
      <!-- Colonne de Gauche : Gestion des dossiers de projets (petites cartes déplaçables) -->
      <aside class="projects-sidebar">
        <div class="panel" style="margin-bottom:0">
          <div class="section-title">
            <h2>📁 Projets Client (Cartes Déplaçables)</h2>
          </div>
          
          <!-- Sélection directe de dossier projet -->
          <div class="folder-add-box">
            <input type="file" id="folder-picker" webkitdirectory directory multiple style="display:none" />
            <input id="folder-input" type="hidden" />
            <button class="btn" id="btn-sync-folder" type="button" style="width:100%;padding:10px;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px">
              <span>📁</span> <span>CHOISIR UN DOSSIER PROJET</span>
            </button>
            <div class="folder-hint">
              Glisse une petite carte de projet sur une IA pour démarrer une mission d'équipe.
            </div>
          </div>

          <div style="margin:12px 0 6px" class="label">Projet actif :</div>
          <select id="project" style="width:100%;background:#020503;color:var(--white);border:1px solid var(--line-bright);border-radius:5px;padding:6px 8px;margin-bottom:10px">
            <option>Chargement…</option>
          </select>
          <button class="btn secondary small" id="refresh" type="button" style="width:100%;margin-bottom:10px">ACTUALISER</button>
          <span class="error" id="error"></span>

          <div style="margin:10px 0 6px" class="label">Dossiers & dépôts (glisser sur une IA pour créer un groupe) :</div>
          <div class="projects-mini-list" id="projects-mini-list"></div>
        </div>
      </aside>

      <!-- Zone Centrale / Droite : Matrice des Cartes IA & Consoles (Lignes de 4) + Arène de Groupes -->
      <div style="display:flex;flex-direction:column;gap:14px">
        
        <!-- Matrice IA & Consoles (Grille de 4 colonnes) -->
        <section class="panel" style="margin-bottom:0">
          <div class="section-title">
            <h2>⚡ Terminaux & Cartes IA Préconfigurées (Lignes de 4)</h2>
            <span class="sub">1 carte par IA & 1 par console · Rôles spécialisés, toggle CLI/API, bouton Prompt 💬</span>
          </div>
          <div class="matrix-grid" id="matrix-grid"></div>
        </section>

        <!-- Arène Collaborative & Groupes formés par glisser-déposer -->
        <section class="panel" style="margin-bottom:0">
          <div class="section-title">
            <h2>Arène · IA + consoles</h2>
            <span class="sub">Grandes cartes d'équipe · Max 6 IA · Cadre vert si projet actif / Rouge si projet manquant</span>
          </div>
          
          <div class="label" style="margin-bottom:6px">SÉLECTION EN COURS :</div>
          <div class="pair-card" id="pair-card"></div>
          
          <div class="label" style="margin:12px 0 6px">ÉQUIPES & GROUPES DE TRAVAIL ACTIFS :</div>
          <div class="group-list" id="groups"></div>

          <!-- Zone de Dépôt Visuelle pour Nouvelle Équipe -->
          <div class="drop-zone-new-group" id="drop-zone-new-group" title="Glissez une carte de projet ou d'IA ici pour créer une nouvelle équipe collaborative">
            <span>✨ <strong>DÉPOSER ICI POUR CRÉER UNE NOUVELLE ÉQUIPE COLLABORATIVE</strong> (ou glissez un projet directement sur une IA)</span>
          </div>

          <!-- Conteneurs de réserve pour compatibilité des sélecteurs -->
          <div class="arena-columns" style="margin-top:14px;border-top:1px dashed var(--line);padding-top:10px">
            <div class="arena-column">
              <div class="label" style="margin-bottom:6px">INDEX AGENTS IA</div>
              <div class="arena-grid" id="agent-cards"></div>
            </div>
            <div class="arena-column">
              <div class="label" style="margin-bottom:6px">INDEX CONSOLES SSH</div>
              <div class="arena-grid" id="machine-cards"></div>
            </div>
            <div class="arena-column">
              <div class="label" style="margin-bottom:6px">INDEX DÉPÔTS GIT</div>
              <div class="arena-grid" id="project-cards"></div>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>

  <!-- ================= VUE 2 : COMPTABILITÉ & BILAN DU TRAVAIL DES IA ================= -->
  <div id="view-ledger" class="main-view" style="display:none">
    <section class="panel" id="accounting-panel" style="margin-bottom:0">
      <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
        <h2>📊 Comptabilité & Bilan d'Activité des IA</h2>
        <span class="sub" style="color:var(--green)">✓ Traçabilité certifiée · Reçus d'exécution et calcul de charge Super IA</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Agent IA</th>
            <th>Rôle Assigné</th>
            <th>Mode / Modèle</th>
            <th>Missions Complétées</th>
            <th>Runs Exécutés</th>
            <th>Volume Traité (Jetons)</th>
            <th>Coût Estimé (€)</th>
            <th>Certificat</th>
            <th>Dernière Activité</th>
          </tr>
        </thead>
        <tbody id="agent-ledger-body"></tbody>
      </table>
    </section>
  </div>

  <!-- ================= VUE 3 : COFFRE CLÉS API (AES-256) ================= -->
  <div id="view-vault" class="main-view" style="display:none">
    <section class="panel" style="margin-bottom:0">
      <div class="section-title">
        <h2>🔐 Coffre-Fort Local de Clés API (Chiffrement AES-256-GCM)</h2>
        <button class="btn" type="button" onclick="openCredentialsModal()">+ AJOUTER / CONFIGURER UNE CLÉ</button>
      </div>
      <div class="vault-security-badge" style="margin-bottom:14px">
        <span>🛡️</span> <span>CHIFFREMENT LOCAL STRICT DANS <code>~/.superia/credentials/vault.enc</code> · AUCUN ENVOI DISTANT NON AUTORISÉ</span>
      </div>
      <p class="sub" style="margin-bottom:14px">
        Toutes vos clés API (OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, DeepSeek) sont chiffrées localement sur le disque de votre machine avec une clé matérielle dérivée.
      </p>
      <div class="label" style="margin-bottom:8px">CLÉS ENREGISTRÉES & SÉCURISÉES :</div>
      <table>
        <thead><tr><th>Fournisseur</th><th>Mode Authentification</th><th>Aperçu Clé Chiffrée</th><th>Statut</th><th>Gestion</th></tr></thead>
        <tbody id="vault-tab-entries-body"></tbody>
      </table>
    </section>
  </div>

  <!-- ================= VUE 4 : JOURNAL D'ACTIVITÉ, RUNS & NOTIFICATIONS ================= -->
  <div id="view-activity" class="main-view" style="display:none">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <section class="panel" style="margin-bottom:0">
        <div class="section-title">
          <h2>Projet sélectionné</h2>
          <span class="sub" id="project-meta"></span>
        </div>
        <table>
          <thead><tr><th>ID</th><th>Mission</th><th>Statut</th><th>Agent</th><th>Branche</th><th>Mise à jour</th></tr></thead>
          <tbody id="tasks"></tbody>
        </table>
      </section>

      <section class="panel" style="margin-bottom:0">
        <div class="section-title"><h2>Runs récents</h2></div>
        <table>
          <thead><tr><th>Run</th><th>Mission</th><th>Agent</th><th>Statut</th><th>Début</th><th>Fin</th></tr></thead>
          <tbody id="runs"></tbody>
        </table>
      </section>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
      <section class="panel" style="margin-bottom:0">
        <div class="section-title"><h2>Notifications locales</h2></div>
        <table>
          <thead><tr><th>Date</th><th>Niveau</th><th>Titre</th><th>Message</th><th>Type</th></tr></thead>
          <tbody id="notifications"></tbody>
        </table>
      </section>

      <section class="panel" style="margin-bottom:0">
        <div class="section-title"><h2>Readiness hors ligne</h2></div>
        <div class="grid" id="readiness"></div>
      </section>
    </div>

    <section class="panel" style="margin-top:14px">
      <div class="section-title"><h2>Événements récents</h2></div>
      <table>
        <thead><tr><th>ID</th><th>Type</th><th>Agrégat</th><th>Cible</th><th>Date</th></tr></thead>
        <tbody id="events"></tbody>
      </table>
    </section>
  </div>

  <!-- Mini-fenêtre Modale : PROMPT / ORDRE À L'IA OU AU CHEF DE GROUPE -->
  <div class="prompt-modal-backdrop" id="prompt-modal" onclick="if(event.target===this)closePromptModal()">
    <div class="prompt-modal-window">
      <div class="prompt-modal-head">
        <div>
          <strong style="color:var(--cyan);font-size:13px" id="prompt-modal-title">💬 DONNER UN ORDRE / CONSIGNE</strong>
          <div class="sub" id="prompt-modal-target-meta" style="color:#9ad7f5"></div>
        </div>
        <button class="btn secondary small" type="button" onclick="closePromptModal()">✕</button>
      </div>
      <form id="form-prompt-order">
        <div class="prompt-modal-body">
          <div class="label" style="color:var(--cyan);margin-bottom:4px">ORDRES RAPIDES SUGGÉRÉS SELON LE RÔLE :</div>
          <div class="prompt-quick-chips" id="prompt-quick-chips"></div>

          <div class="form-group" style="margin-top:12px">
            <label for="prompt-order-text" style="color:var(--cyan)">VOTRE INSTRUCTION / ORDRE DE MISSION :</label>
            <textarea id="prompt-order-text" rows="5" placeholder="Ex: Segmenter les sous-tâches du projet, assigner la création du driver SPI ESP32 et concevoir la trame MIDI…" required style="font-family:monospace;border-color:#1c557d"></textarea>
          </div>
          <div id="prompt-feedback" style="min-height:1.2em;font-size:11.5px;color:var(--green);font-weight:700"></div>
        </div>
        <div class="prompt-modal-footer">
          <button class="btn secondary" type="button" onclick="closePromptModal()">ANNULER</button>
          <button class="btn" type="submit" style="background:var(--cyan);color:#000">TRANSMETTRE L'ORDRE</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal Coffre-Fort Chiffré AES-256-GCM : GESTIONNAIRE DE CLÉS API LOCALES -->
  <div class="modal-backdrop" id="credentials-modal" onclick="if(event.target===this)closeCredentialsModal()">
    <div class="modal-window" style="max-width:700px">
      <div class="modal-head">
        <div>
          <strong style="color:var(--green);font-size:13px">🔐 COFFRE-FORT LOCAL DE CLÉS API & CHIFFREMENT (AES-256-GCM)</strong>
          <div class="sub" style="color:#a9f5b5;font-size:10.5px">Stockage local sécurisé dans <code>~/.superia/credentials/vault.enc</code> avec clé dérivée machine (0600)</div>
        </div>
        <button class="btn secondary small" type="button" onclick="closeCredentialsModal()">✕</button>
      </div>
      <form id="form-credentials">
        <div class="modal-body">
          <div class="vault-security-badge" style="margin-bottom:12px">
            <span>🛡️</span> <span>CHIFFREMENT LOCAL AES-256-GCM AUTOMATIQUE · AUCUNE CLÉ DANS GIT NI ENVOYÉE DISTANTE</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="cred-provider">Fournisseur d'IA</label>
              <select id="cred-provider">
                <option value="groq">⚡ Groq (Llama 3.3 70B / DeepSeek R1 - Ultra Rapide & Éco)</option>
                <option value="openai">🤖 OpenAI (GPT-4o, o3-mini, Codex)</option>
                <option value="anthropic">🧠 Anthropic (Claude 3.7 Sonnet, Claude 3.5)</option>
                <option value="gemini">🌐 Google Gemini (Gemini 2.5 Pro 2M ctx, Flash)</option>
                <option value="xai">🚀 xAI (Grok 3, Grok 2, Grok Beta)</option>
                <option value="mistral">🇫🇷 Mistral AI (Mistral Large 2, Codestral)</option>
                <option value="deepseek">🔬 DeepSeek (DeepSeek V3, DeepSeek R1)</option>
                <option value="openrouter">🔀 OpenRouter (Passerelle Multi-modèles)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="cred-mode">Mode d'authentification par défaut</label>
              <select id="cred-mode">
                <option value="cli">💻 Session CLI (Éco / Forfait / Local)</option>
                <option value="api" selected>⚡ Clé API Directe (Jetons / Pay-as-you-go)</option>
                <option value="hybrid">🔄 Hybride (Bascule automatique)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="cred-api-key" style="display:flex;justify-content:space-between;align-items:center">
              <span>Clé API Secrète (Variable: <strong id="cred-env-name" style="color:var(--gold)">API_KEY</strong>)</span>
              <span id="cred-status-note" style="font-size:10px"></span>
            </label>
            <div style="display:flex;gap:6px">
              <input id="cred-api-key" type="password" placeholder="Collez votre clé API secrète (ex: gsk_..., sk-..., ...)" style="font-family:monospace;flex:1" />
              <button class="btn secondary small" id="btn-cred-toggle-eye" type="button" title="Afficher/Masquer la clé" style="padding:0 10px">👁️</button>
            </div>
            <div class="sub" style="margin-top:3px;font-size:10px">
              La clé sera automatiquement chiffrée avec AES-256-GCM avant écriture sur le disque de votre machine.
            </div>
          </div>

          <div class="form-group">
            <label for="cred-url">URL d'API / Endpoint Personnalisé (Optionnel)</label>
            <input id="cred-url" type="text" placeholder="https://api.groq.com/openai/v1" style="font-family:monospace;font-size:11px" />
          </div>

          <div id="cred-save-feedback" style="min-height:1.2em;font-size:11.5px;color:var(--green);font-weight:700;margin-top:6px"></div>

          <!-- Tableau récapitulatif des clés chiffrées existantes -->
          <div style="margin-top:14px">
            <div class="label" style="margin-bottom:6px">ÉTAT DU COFFRE-FORT LOCAL CHIFFRÉ :</div>
            <table>
              <thead><tr><th>Fournisseur</th><th>Mode</th><th>Aperçu Sécurisé</th><th>Statut Coffre</th><th>Action</th></tr></thead>
              <tbody id="vault-entries-body"></tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center">
          <button class="btn danger small" id="btn-cred-delete" type="button" style="display:none">🗑️ SUPPRIMER CETTE CLÉ</button>
          <div style="display:flex;gap:8px">
            <button class="btn secondary" type="button" onclick="closeCredentialsModal()">FERMER</button>
            <button class="btn" type="submit" style="background:#14381e;border-color:var(--green);color:var(--green)">🔒 CHIFFRER & ENREGISTRER LOCALEMENT</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal Configuration Détaillée Agent / Rôle Chef / Prompt Système -->
  <div class="modal-backdrop" id="config-modal" onclick="if(event.target===this)closeConfigModal()">
    <div class="modal-window">
      <div class="modal-head">
        <strong style="color:var(--green);font-size:13px">⚙️ CONFIGURATION DE L'IA & RÔLE CHEF D'ÉQUIPE</strong>
        <button class="btn secondary small" type="button" onclick="closeConfigModal()">✕</button>
      </div>
      <form id="form-config-agent">
        <div class="modal-body">
          <input type="hidden" id="cfg-agent-id" />
          <div class="form-group">
            <label for="cfg-label">Nom de l'Agent</label>
            <input id="cfg-label" type="text" readonly style="opacity:0.8" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="cfg-role">Rôle assigné</label>
              <select id="cfg-role" onchange="el('cfg-prompt').value = generateSystemPrompt(this.value, el('cfg-is-leader').checked, '')">
                <option value="Chef d'équipe">👑 Chef d'équipe (Segmente les tâches & pilote le groupe)</option>
                <option value="Dessinateur / Designer UI">🎨 Dessinateur / Designer (Maquettes, SVG, UI/UX)</option>
                <option value="Musicien / Sound Designer">🎵 Musicien / Sound Designer (Harmonie, WebAudio, Synthèse)</option>
                <option value="Spécialiste MIDI">🎹 Spécialiste MIDI (Messages Note/CC/SysEx, Web MIDI)</option>
                <option value="Spécialiste Microcontrôleurs">⚡ Spécialiste Microcontrôleurs (ESP32, Pico, I2C, SPI)</option>
                <option value="Codeur Principal">💻 Codeur Principal (Implémentation TypeScript/Node)</option>
                <option value="Architecte Logiciel">🏗️ Architecte Logiciel (Design & Spécifications)</option>
                <option value="Reviewer & Sécurité">🛡️ Reviewer & Sécurité (Audit & Détection de failles)</option>
                <option value="Testeur QA">🧪 Testeur QA (Tests unitaires & Validation)</option>
              </select>
            </div>
            <div class="form-group" style="display:flex;flex-direction:column;justify-content:center">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:14px;color:var(--gold)">
                <input type="checkbox" id="cfg-is-leader" style="width:auto" onchange="if(this.checked){ el('cfg-role').value='Chef d\\'équipe'; } el('cfg-prompt').value = generateSystemPrompt(el('cfg-role').value, this.checked, '')" />
                <strong>👑 DÉFINIR COMME CHEF D'ÉQUIPE</strong>
              </label>
            </div>
          </div>

          <!-- Mode d'authentification 2 Chemins & Clé API Personnalisée -->
          <div class="form-row">
            <div class="form-group">
              <label for="cfg-auth-path">Mode d'authentification</label>
              <select id="cfg-auth-path">
                <option value="cli">💻 Session CLI (Éco / Forfait local)</option>
                <option value="api">⚡ Clé API Directe (Jetons / Pay-as-you-go)</option>
                <option value="hybrid">🔄 Hybride (Session CLI + Clé API)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="cfg-base-url">Base URL API (Optionnel)</label>
              <input id="cfg-base-url" type="text" placeholder="https://api.openai.com/v1" style="font-family:monospace;font-size:11px" />
            </div>
          </div>

          <div class="form-group">
            <label for="cfg-api-key" style="display:flex;justify-content:space-between;align-items:center">
              <span>Clé API spécifique pour cet agent</span>
              <span id="cfg-key-preview" style="font-size:10px"></span>
            </label>
            <input id="cfg-api-key" type="password" placeholder="Laissez vide pour conserver la clé chiffrée actuelle" style="font-family:monospace" />
            <div class="sub" style="font-size:9.5px;margin-top:2px">Saisir une nouvelle clé la chiffrera immédiatement en AES-256-GCM.</div>
          </div>

          <div class="form-group">
            <label for="cfg-prompt">Prompt Système d'Orchestration (Auto-adapté au rôle)</label>
            <textarea id="cfg-prompt" rows="6" style="font-family:monospace;font-size:11px"></textarea>
            <div class="sub" style="margin-top:4px">
              Ce prompt dicte à l'IA comment segmenter les sous-tâches, déléguer et orchestrer les agents du groupe.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" type="button" onclick="closeConfigModal()">ANNULER</button>
          <button class="btn" type="submit">APPLIQUER LA CONFIGURATION</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal Création Rapide Carte IA / Console -->
  <div class="modal-backdrop" id="create-modal" onclick="if(event.target===this)closeNewCardModal()">
    <div class="modal-window">
      <div class="modal-head">
        <strong style="color:var(--green);font-size:13px">+ CONFIGURATION D'UNE NOUVELLE CARTE</strong>
        <button class="btn secondary small" type="button" onclick="closeNewCardModal()">✕</button>
      </div>
      <form id="form-create-card">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label for="preset-model">Fournisseur & Modèle</label>
              <select id="preset-model">
                <optgroup label="Fournisseurs IA">
                  <option value="groq-llama">Groq (Llama 3.3 70B / Ultra-Rapide)</option>
                  <option value="gpt-4o">OpenAI (GPT-4o)</option>
                  <option value="claude-3-7">Anthropic (Claude 3.7 Sonnet)</option>
                  <option value="gemini-2-5-pro">Google (Gemini 2.5 Pro)</option>
                  <option value="grok-3">xAI (Grok 3)</option>
                  <option value="mistral-large">Mistral AI (Large 2)</option>
                </optgroup>
                <optgroup label="Consoles Machines">
                  <option value="pi-ssh">Raspberry Pi 5 (SSH / ARM64)</option>
                  <option value="win-ssh">Windows 11 Station (SSH / PowerShell)</option>
                </optgroup>
              </select>
            </div>
            <div class="form-group">
              <label for="preset-role">Rôle & Spécialité</label>
              <select id="preset-role">
                <option value="Chef d'équipe">👑 Chef d'équipe (Pilote & Segmente)</option>
                <option value="Dessinateur / Designer UI">🎨 Dessinateur / Designer (Maquettes, SVG, UI)</option>
                <option value="Musicien / Sound Designer">🎵 Musicien / Sound Designer (Audio, WebAudio)</option>
                <option value="Spécialiste MIDI">🎹 Spécialiste MIDI (Note/CC/SysEx)</option>
                <option value="Spécialiste Microcontrôleurs">⚡ Spécialiste Microcontrôleurs (ESP32, Pico, I2C/SPI)</option>
                <option value="Codeur Principal">💻 Codeur Principal (Implémentation)</option>
                <option value="Architecte Logiciel">🏗️ Architecte Logiciel (Design)</option>
                <option value="Reviewer & Sécurité">🛡️ Reviewer & Sécurité (Audit)</option>
                <option value="Testeur QA">🧪 Testeur QA (Tests & Cas limites)</option>
                <option value="Console Runner">🖥️ Console Runner (Exécution)</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="field-label">Nom affiché</label>
            <input id="field-label" type="text" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="field-id">Identifiant unique (slug)</label>
              <input id="field-id" type="text" required />
            </div>
            <div class="form-group">
              <label for="field-card-type">Type de carte</label>
              <select id="field-card-type">
                <option value="agent">Agent IA</option>
                <option value="machine">Console Machine (SSH)</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="field-notes">Notes / Instructions</label>
            <textarea id="field-notes" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" type="button" onclick="closeNewCardModal()">ANNULER</button>
          <button class="btn" type="submit">ENREGISTRER LA CARTE</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Drawer Terminal SSH / Flux -->
  <section class="console-drawer" id="console-drawer" onclick="if(event.target===this)closeConsole()">
    <div class="console-window">
      <div class="console-head">
        <div><strong id="console-title">Console</strong><div class="sub" id="console-meta"></div></div>
        <button class="btn secondary" type="button" onclick="closeConsole()">FERMER</button>
      </div>
      <pre id="console-output"></pre>
      <form class="console-input" onsubmit="event.preventDefault();sendConsoleInput()">
        <input id="console-input" autocomplete="off" placeholder="Entrez une commande SSH ou instruction…" />
        <button class="btn" type="submit">ENVOYER</button>
      </form>
    </div>
  </section>

  <!-- Supervision du Projet, Runs et Notifications -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
    <section class="panel" style="margin-bottom:0">
      <div class="section-title">
        <h2>Projet sélectionné</h2>
        <span class="sub" id="project-meta"></span>
      </div>
      <table>
        <thead><tr><th>ID</th><th>Mission</th><th>Statut</th><th>Agent</th><th>Branche</th><th>Mise à jour</th></tr></thead>
        <tbody id="tasks"></tbody>
      </table>
    </section>

    <section class="panel" style="margin-bottom:0">
      <div class="section-title"><h2>Runs récents</h2></div>
      <table>
        <thead><tr><th>Run</th><th>Mission</th><th>Agent</th><th>Statut</th><th>Début</th><th>Fin</th></tr></thead>
        <tbody id="runs"></tbody>
      </table>
    </section>
  </div>

  <!-- Bilan & Comptabilité du travail des IA -->
  <section class="panel" style="margin-top:14px" id="accounting-panel">
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
      <h2>📊 Comptabilité & Bilan d'Activité des IA</h2>
      <span class="sub" style="color:var(--green)">✓ Traçabilité certifiée · Reçus d'exécution et calcul de charge Super IA</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Agent IA</th>
          <th>Rôle Assigné</th>
          <th>Mode / Modèle</th>
          <th>Missions Complétées</th>
          <th>Runs Exécutés</th>
          <th>Volume Traité (Jetons)</th>
          <th>Coût Estimé (€)</th>
          <th>Certificat</th>
          <th>Dernière Activité</th>
        </tr>
      </thead>
      <tbody id="agent-ledger-body"></tbody>
    </table>
  </section>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
    <section class="panel" style="margin-bottom:0">
      <div class="section-title"><h2>Notifications locales</h2></div>
      <table>
        <thead><tr><th>Date</th><th>Niveau</th><th>Titre</th><th>Message</th><th>Type</th></tr></thead>
        <tbody id="notifications"></tbody>
      </table>
    </section>

    <section class="panel" style="margin-bottom:0">
      <div class="section-title"><h2>Readiness hors ligne</h2></div>
      <div class="grid" id="readiness"></div>
    </section>
  </div>

  <section class="panel" style="margin-top:14px">
    <div class="section-title"><h2>Événements récents</h2></div>
    <table>
      <thead><tr><th>ID</th><th>Type</th><th>Agrégat</th><th>Cible</th><th>Date</th></tr></thead>
      <tbody id="events"></tbody>
    </table>
  </section>

  <div class="footer">
    État en lecture · consoles SSH contrôlables avec clé ou agent SSH · arrêt d'urgence via CLI · boucle locale · aucune CORS · rafraîchissement 30 s
  </div>
</main>`, dashboardScript);
}

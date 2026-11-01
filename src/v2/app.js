/* Nautilus V2 shell (Phase 01): routing, inbox-to-ticket navigation, the four-stage tracker, the global map region and
   dialogs. Three layers: domain state (st, same shape as V1; only domain actions may change it), derived state (Flow),
   view state (route + per-ticket stage; never read by evaluation). Stage workspaces and the map drawing arrive in 02-05. */
(()=>{
const E=Engine,S=SCENARIOS,F=Flow,$=id=>document.getElementById(id);
const ORDER=['elena','marcus','jordan','daniel'];
/* presentation only: V2 portraits for each ticket (V1 keeps its own avatars) */
const AVATAR={elena:'__ART:v2/avatars/elena.webp__',marcus:'__ART:v2/avatars/cameron.webp__',jordan:'__ART:v2/avatars/jordyn.webp__',daniel:'__ART:v2/avatars/daniel.webp__'};
const ICON={review:'M5 3h9l4 4v6 M5 3v18h7 M8 9h6 M8 13h3 M16.5 16.5m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M18.7 18.7L21 21',
  configure:'M3 6h18v12H3z M7 10h4 M7 14h2 M14 10h3 M14 14h3',verify:'M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z M7 15h3v3H7z M16 8c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z M15 20h3v1h-3z',
  close:'M5 3h9l4 4v14H5z M8.5 13.5l2.5 2.5 4.5-5',investigate:'M10.5 10.5m-6.5 0a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0 M15.5 15.5L21 21',
  decide:'M12 3v18 M5 7h14 M5 7l-3 6h6z M19 7l-3 6h6z M8 21h8',respond:'M4 12h12 M12 6l6 6-6 6 M20 5v14'};
const icon=(k,cls='nx-icon')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]||ICON.close}"/></svg>`;
const fresh=id=>{const sc=S[id];return{person:E.clone(sc.person),world:{day:sc.day,date:sc.date,doorStatus:E.clone(sc.doorStatus||{}),groupOverrides:{}},route:sc.routes?sc.routes[0].id:null,
  prev:null,delta:null,tdelta:null,tscope:'',disp:null,showDelta:true,walk:null,sel:null,flagged:false,result:null,record:null,open:{}};};
const st={},view={};ORDER.forEach(id=>{st[id]=fresh(id);view[id]={stage:null};});
const isWide=()=>matchMedia('(min-width:1180px)').matches;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let route={screen:'inbox',id:null,stage:null,map:false},invoker=null;

/* ---------- derived ---------- */
const stagesOf=id=>F.steps(S[id],st[id]).map(([key,label,done])=>({key,label:label.replace(' (n/a)',''),na:/\(n\/a\)/.test(label),done}));
const stageOf=id=>{const ss=stagesOf(id),k=view[id].stage;return ss.find(s=>s.key===k)||ss[0];};
const refOf=sc=>(sc.person.authorizations.find(a=>/^[A-Z]{2,4}-\d+$/.test(a.id))||sc.person.authorizations[0]).id;
const statusOf=id=>F.finalized(st[id])?'Closed':st[id].result?'Needs correction':'Open';

/* ---------- routing: #/inbox, #/t/<id>/<stage>, either with /map ---------- */
function parse(h){const p=h.replace(/^#\/?/,'').split('/').filter(Boolean),map=p[p.length-1]==='map';if(map)p.pop();
  if(p[0]==='t'&&S[p[1]]){const ss=stagesOf(p[1]),stage=ss.some(s=>s.key===p[2])?p[2]:(view[p[1]].stage||ss[0].key);return{screen:'ticket',id:p[1],stage,map};}
  return{screen:'inbox',id:null,stage:null,map};}
const hashOf=r=>(r.screen==='ticket'?`#/t/${r.id}/${r.stage}`:'#/inbox')+(r.map?'/map':'');
function go(r,{replace=false}={}){const s={nx:true,from:route.screen,map:!!r.map&&!route.map};
  replace?history.replaceState({...(history.state||{}),nx:true},'',hashOf(r)):history.pushState(s,'',hashOf(r));onRoute();}
function onRoute(){const prev=route;route=parse(location.hash);
  if(route.screen==='ticket')view[route.id].stage=route.stage;
  if(hashOf(route)!==location.hash)history.replaceState(history.state,'',hashOf(route));
  render();placeMap();
  if(route.screen!==prev.screen||route.id!==prev.id){
    if(route.screen==='ticket'){const h=document.querySelector('.nx-person h1');h&&h.focus({preventScroll:true});scrollTo(0,0);}
    else if(prev.id){const a=document.querySelector(`[data-nx-key="inbox-${prev.id}"]`);a&&a.focus({preventScroll:true});}}
  else if(route.stage!==prev.stage&&route.screen==='ticket'){const ss=stagesOf(route.id),i=Math.max(0,ss.findIndex(x=>x.key===route.stage)),s=ss[i];announce(`Step ${i+1} of 4: ${s.label}${s.na?', not applicable':''}`);}}
/* walk guard (Phase 05: navigation away from a running walk asks Cancel walk / Continue test; nothing can run a walk yet) */
const leaveOK=()=>true;
function backToInbox(){if(!leaveOK())return;history.state&&history.state.nx&&history.state.from==='inbox'&&!route.map?history.back():go({screen:'inbox',map:false});}
function openMap(){invoker=document.activeElement;if(isWide()){const h=inMap('#nxMapH');h.scrollIntoView({block:'nearest'});h.focus({preventScroll:true});return;}go({...route,map:true});}
function closeMap(){history.state&&history.state.map?history.back():go({...route,map:false},{replace:true});}

/* ---------- render (focus is restored by data-nx-key after every update) ---------- */
function render(){const k=document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.nxKey:null;
  $('nxApp').dataset.screen=route.screen;renderInbox();renderWork();
  if(k){const el=document.querySelector(`[data-nx-key="${k}"]`);if(el&&el!==document.activeElement)el.focus({preventScroll:true});}}
function renderInbox(){const open=ORDER.filter(id=>!F.finalized(st[id])).length;
  $('nxInbox').innerHTML=`<div class="nx-inbox-inner"><h2 class="nx-inbox-h" id="nxInboxH">Shift Inbox <span class="nx-count" aria-label="${open} open">${open}</span></h2>
    <button class="nx-briefcard" type="button" data-nx-key="briefcard" data-nx-act="brief">${icon('review')}<span><b>Shift brief</b> <span>From the ops desk supervisor · how today's tickets work</span></span></button>
    <ul class="nx-list">${ORDER.map(id=>{const sc=S[id],p=sc.person,cur=route.screen==='ticket'&&route.id===id;
      return `<li><a class="nx-item" href="${hashOf({screen:'ticket',id,stage:stageOf(id).key})}" data-nx-key="inbox-${id}" data-nx-open="${id}"${cur?' aria-current="page"':''}>
        <img class="nx-av" src="${AVATAR[id]}" alt="" width="48" height="48"><span class="nx-item-txt"><b>${esc(p.name)}</b> <span>${esc(p.title||p.role)}</span> <span>${esc(refOf(sc))} · ${esc(sc.day)} ${E.fmt(sc.time)} · ${statusOf(id)}</span></span></a></li>`;}).join('')}</ul></div>`;}
function renderWork(){const w=$('nxWork');
  if(route.screen!=='ticket'){w.innerHTML=`<div class="nx-empty"><p>Select a request from the Shift Inbox.</p></div>`;return;}
  const id=route.id,sc=S[id],p=sc.person,ss=stagesOf(id),i=Math.max(0,ss.findIndex(s=>s.key===view[id].stage)),cur=ss[i],next=ss[i+1],sug=ss.find(s=>!s.done);
  const PH={0:'Phase 02',1:'Phase 04',2:'Phase 05',3:'Phase 06'};
  w.innerHTML=`<div class="nx-ticket">
    <a class="nx-back" href="#/inbox" data-nx-key="back" data-nx-act="inbox"><span aria-hidden="true">‹</span> Shift Inbox</a>
    <div class="nx-person"><img class="nx-av" src="${AVATAR[id]}" alt="" width="64" height="64"><div><h1 tabindex="-1">${esc(p.name)}</h1><p>${esc(p.title||p.role)} · ${esc(refOf(sc))}</p></div></div>
    <section class="nx-tracker" aria-labelledby="nxTrackerH">
      <div class="nx-tracker-h"><span id="nxTrackerH">Request progress</span><b aria-hidden="true">${String(i+1).padStart(2,'0')} of 04</b></div>
      <ol class="nx-steps">${ss.map((s,j)=>`<li><button class="nx-step" type="button" data-nx-key="step-${j}" data-nx-step="${s.key}"${s===cur?' aria-current="step"':''}
          aria-label="Step ${j+1} of 4: ${esc(s.label)}${s.na?', not applicable':''}${s.done?', done':''}${s===sug&&s!==cur?', suggested next':''}">
          <span class="nx-chev">${icon(s.key)}<span class="nx-step-num" aria-hidden="true">${j+1}</span>${s.done?`<span class="nx-step-done" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2.5 6.5l2.2 2.2 4.8-5"/></svg></span>`:''}</span>
          <span class="nx-step-label" aria-hidden="true">${esc(s.label)}</span></button></li>`).join('')}</ol>
      <div class="nx-instr">${icon(cur.key)}<div><h2>${esc(cur.label)}${cur.na?' <span class="nx-instr-na">(not applicable on this route)</span>':''}</h2>${sc.coach&&sc.coach[cur.key]?`<p>${esc(sc.coach[cur.key])}</p>`:''}</div></div>
    </section>
    <section class="nx-card nx-placeholder" aria-label="${esc(cur.label)} workspace"><h2>${esc(cur.label)} workspace</h2><p>This stage's workspace arrives in ${PH[i]}. Navigation, the tracker and the map region are live.</p></section>
    ${next?`<button class="nx-btn" type="button" data-nx-key="next" data-nx-step="${next.key}">Next: ${esc(next.label)}</button>`:''}
  </div>`;}
function announce(t){const l=$('nxLive');l.textContent='';setTimeout(()=>l.textContent=t,30);}

/* ---------- map region: one element, column on wide screens, full-screen dialog otherwise ---------- */
const mapRegion=document.createElement('section');mapRegion.className='nx-map';const inMap=sel=>mapRegion.querySelector(sel);
mapRegion.innerHTML=`<div class="nx-map-bar"><h2 id="nxMapH" tabindex="-1">Facility map</h2><button class="nx-close" type="button" id="nxMapClose" data-nx-key="mapclose">Close map</button></div>
  <div class="nx-map-stage"><p>The engine's floor plan, levels, lens and walk move into this region in Phase 03 and 05.</p></div>`;
function placeMap(){const dlg=$('nxMapDlg');
  if(isWide()){if(dlg.open)dlg.close();$('nxMapCol').appendChild(mapRegion);inMap('#nxMapClose').hidden=true;return;}
  inMap('#nxMapClose').hidden=false;
  if(route.map){if(mapRegion.parentNode!==dlg)dlg.appendChild(mapRegion);if(!dlg.open){dlg.showModal();inMap('#nxMapH').focus();}}
  else if(dlg.open){dlg.close();const t=invoker&&document.contains(invoker)?invoker:$('nxMapBtn');t.focus({preventScroll:true});}}
$('nxMapDlg').addEventListener('cancel',e=>{e.preventDefault();closeMap();});
mapRegion.addEventListener('click',e=>{if(e.target.closest('#nxMapClose'))closeMap();});
matchMedia('(min-width:1180px)').addEventListener('change',placeMap);

/* ---------- shift brief ---------- */
function openBrief(){const d=$('nxBrief');invoker=document.activeElement;
  d.innerHTML=`<div class="nx-brief"><h2 id="nxBriefH" tabindex="-1">Shift brief</h2>
    <p>Morning. Four access tickets today. For each one: read the request and its records, inspect anything that doesn't add up, and decide what to change. When you change someone's access, walk them in to check it works from their side before you close the ticket.</p>
    <p class="nx-note">On the map, lit areas are where a badge is granted (dotted ones are public galleries, striped ones restricted) and the small circles are doors with readers. A door opens into an area, and open passages join areas, so one door can light several rooms. Topside (L2) sits above the galleries.</p>
    <button class="nx-btn" type="button" id="nxBriefClose">Close brief</button></div>`;
  d.showModal();$('nxBriefH').focus();}
function closeBrief(){const d=$('nxBrief');d.close();const t=invoker&&document.contains(invoker)?invoker:$('nxBriefBtn');t.focus({preventScroll:true});}
$('nxBrief').addEventListener('cancel',e=>{e.preventDefault();closeBrief();});
$('nxBrief').addEventListener('click',e=>{if(e.target.id==='nxBriefClose'||e.target===$('nxBrief'))closeBrief();});

/* ---------- events ---------- */
$('nxBriefBtn').onclick=openBrief;$('nxMapBtn').onclick=openMap;
document.querySelector('.nx-brand').addEventListener('click',e=>{e.preventDefault();if(route.screen!=='inbox')backToInbox();});
document.addEventListener('click',e=>{const a=e.target.closest('[data-nx-open],[data-nx-step],[data-nx-act]');if(!a)return;
  if(a.dataset.nxOpen){e.preventDefault();if(!leaveOK())return;const id=a.dataset.nxOpen;go({screen:'ticket',id,stage:stageOf(id).key,map:false});}
  else if(a.dataset.nxStep){go({...route,stage:a.dataset.nxStep},{replace:true});}
  else if(a.dataset.nxAct==='inbox'){e.preventDefault();backToInbox();}
  else if(a.dataset.nxAct==='brief')openBrief();});
/* arrow keys move between the four stages; Enter or Space selects */
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('.nx-step');if(!b)return;
  const all=[...document.querySelectorAll('.nx-step')],i=all.indexOf(b),j={ArrowLeft:i-1,ArrowRight:i+1,Home:0,End:all.length-1}[e.key];
  if(j==null||j<0||j>=all.length)return;e.preventDefault();all[j].focus();});
addEventListener('popstate',onRoute);addEventListener('hashchange',()=>{if(hashOf(parse(location.hash))!==hashOf(route))onRoute();});
/* read-only hook for the browser tests: evaluation results must not change with navigation */
window.__nx={grade:id=>F.grade(S[id],st[id]),steps:id=>F.steps(S[id],st[id]),view:()=>JSON.parse(JSON.stringify({route,view}))};
history.replaceState({nx:true,from:null},'',location.hash||'#/inbox');onRoute();
})();

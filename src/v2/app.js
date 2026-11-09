/* Nautilus V2 (Phases 01-03): routing, the Shift Inbox, the four-stage tracker, the stage container with the Review workspace,
   the global map (one instance; drawing in map.js) and dialogs. Three layers: domain state (st, same shape as V1; only domain actions may change it), derived state (Flow),
   view state (route, per-ticket stage and map level; never read by evaluation). Configure, Verify and Close arrive in 04-06. */
(()=>{
const E=Engine,S=SCENARIOS,F=Flow,$=id=>document.getElementById(id);
const ORDER=['elena','marcus','jordan','daniel'];
/* presentation only (scenario data and generated records are untouched): V2 portraits, the locked display roles, and who
   sent the opening message. Jordyn's ticket opens with the review assignment, not a message from Jordyn. */
const AVATAR={elena:'__ART:v2/avatars/elena.webp__',marcus:'__ART:v2/avatars/cameron.webp__',jordan:'__ART:v2/avatars/jordyn.webp__',daniel:'__ART:v2/avatars/daniel.webp__'};
const ROLE={elena:'Marine Educator',marcus:'Dive Crew Lead',jordan:'External Exhibit AV Vendor',daniel:'External Frozen-Feed Driver'};
const SENDER={jordan:{name:'Ops desk',note:'Quarterly contractor access review'}};
const STATUS={new:'New',progress:'In progress',correction:'Needs correction',closed:'Closed'};
const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
/* extra context the scenario keeps in its role line (Elena: "starts Tuesday") */
const contextOf=id=>{const c=S[id].person.role.split(' · ')[1];return c?cap(c):'';};
const ICON={review:'M5 3h9l4 4v6 M5 3v18h7 M8 9h6 M8 13h3 M16.5 16.5m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M18.7 18.7L21 21',
  configure:'M3 6h18v12H3z M7 10h4 M7 14h2 M14 10h3 M14 14h3',verify:'M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z M7 15h3v3H7z M16 8c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z M15 20h3v1h-3z',
  close:'M5 3h9l4 4v14H5z M8.5 13.5l2.5 2.5 4.5-5',investigate:'M10.5 10.5m-6.5 0a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0 M15.5 15.5L21 21',
  decide:'M12 3v18 M5 7h14 M5 7l-3 6h6z M19 7l-3 6h6z M8 21h8',respond:'M4 12h12 M12 6l6 6-6 6 M20 5v14'};
const icon=(k,cls='nx-icon')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]||ICON.close}"/></svg>`;
const fresh=id=>{const sc=S[id];return{person:E.clone(sc.person),world:{day:sc.day,date:sc.date,doorStatus:E.clone(sc.doorStatus||{}),groupOverrides:{}},route:sc.routes?sc.routes[0].id:null,
  prev:null,delta:null,tdelta:null,tscope:'',disp:null,showDelta:true,walk:null,sel:null,flagged:false,result:null,record:null,open:{},read:{}};};
const st={},view={};ORDER.forEach(id=>{st[id]=fresh(id);view[id]={stage:null,level:1};});
let inboxLevel=1;
const isWide=()=>matchMedia('(min-width:1180px)').matches;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let route={screen:'inbox',id:null,stage:null,map:false},invoker=null;

/* ---------- derived ---------- */
const stagesOf=id=>F.steps(S[id],st[id]).map(([key,label,done])=>({key,label:label.replace(' (n/a)',''),na:/\(n\/a\)/.test(label),done}));
const stageOf=id=>{const ss=stagesOf(id),k=view[id].stage;return ss.find(s=>s.key===k)||ss[0];};
const refOf=sc=>(sc.person.authorizations.find(a=>/^[A-Z]{2,4}-\d+$/.test(a.id))||sc.person.authorizations[0]).id;
const statusOf=id=>F.status(S[id],st[id]);

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
  $('nxApp').dataset.screen=route.screen;renderInbox();renderWork();renderMap();
  if(k){const el=document.querySelector(`[data-nx-key="${k}"]`);if(el&&el!==document.activeElement)el.focus({preventScroll:true});}}
function renderInbox(){const open=ORDER.filter(id=>statusOf(id)!=='closed').length;
  $('nxInbox').innerHTML=`<div class="nx-inbox-inner"><h2 class="nx-inbox-h" id="nxInboxH">Shift Inbox <span class="nx-count" aria-label="${open} open">${open}</span></h2>
    <button class="nx-briefcard" type="button" data-nx-key="briefcard" data-nx-act="brief">${icon('review')}<span><b>Shift brief</b> <span>From the ops desk supervisor · how today's tickets work</span></span></button>
    <ul class="nx-list">${ORDER.map(id=>{const sc=S[id],p=sc.person,cur=route.screen==='ticket'&&route.id===id,stt=statusOf(id);
      return `<li><a class="nx-item" href="${hashOf({screen:'ticket',id,stage:stageOf(id).key})}" data-nx-key="inbox-${id}" data-nx-open="${id}"${cur?' aria-current="page"':''}>
        <img class="nx-av" src="${AVATAR[id]}" alt="" width="48" height="48"><span class="nx-item-txt"><b>${esc(p.name)}</b> <span>${ROLE[id]}</span> <span class="nx-preview">${esc(sc.message)}</span>
        <span class="nx-meta">${esc(refOf(sc))} · ${esc(sc.day)} ${E.fmt(sc.time)} <span class="nx-status nx-status-${stt}">${STATUS[stt]}</span></span></span></a></li>`;}).join('')}</ul></div>`;}
function renderWork(){const w=$('nxWork');
  if(route.screen!=='ticket'){w.innerHTML=`<div class="nx-empty"><p>Select a request from the Shift Inbox.</p></div>`;return;}
  const id=route.id,sc=S[id],p=sc.person,ss=stagesOf(id),i=Math.max(0,ss.findIndex(s=>s.key===view[id].stage)),cur=ss[i],next=ss[i+1],sug=ss.find(s=>!s.done);
  const PH={1:'Phase 04',2:'Phase 05',3:'Phase 06'};
  w.innerHTML=`<div class="nx-ticket">
    <a class="nx-back" href="#/inbox" data-nx-key="back" data-nx-act="inbox"><span aria-hidden="true">‹</span> Shift Inbox</a>
    <div class="nx-person"><img class="nx-av" src="${AVATAR[id]}" alt="" width="64" height="64"><div><h1 tabindex="-1">${esc(p.name)}</h1><p>${ROLE[id]} · ${esc(refOf(sc))}${contextOf(id)?` · ${esc(contextOf(id))}`:''}</p></div></div>
    <section class="nx-tracker" aria-labelledby="nxTrackerH">
      <div class="nx-tracker-h"><span id="nxTrackerH">Request progress</span><b aria-hidden="true">${String(i+1).padStart(2,'0')} of 04</b></div>
      <ol class="nx-steps">${ss.map((s,j)=>`<li><button class="nx-step" type="button" data-nx-key="step-${j}" data-nx-step="${s.key}"${s===cur?' aria-current="step"':''}
          aria-label="Step ${j+1} of 4: ${esc(s.label)}${s.na?', not applicable':''}${s.done?', done':''}${s===sug&&s!==cur?', suggested next':''}">
          <span class="nx-chev">${icon(s.key)}<span class="nx-step-num" aria-hidden="true">${j+1}</span>${s.done?`<span class="nx-step-done" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2.5 6.5l2.2 2.2 4.8-5"/></svg></span>`:''}</span>
          <span class="nx-step-label" aria-hidden="true">${esc(s.label)}</span></button></li>`).join('')}</ol>
      <div class="nx-instr">${icon(cur.key)}<div><h2 tabindex="-1">${esc(cur.label)}${cur.na?' <span class="nx-instr-na">(not applicable on this route)</span>':''}</h2>${sc.coach&&sc.coach[cur.key]?`<p>${esc(sc.coach[cur.key])}</p>`:''}</div></div>
    </section>
    <div class="nx-stage" id="nxStage" data-stage="${cur.key}" data-slot="${i}">${(STAGE_VIEW[i]||placeholderHTML)(id,cur,PH[i])}</div>
    ${next?`<button class="nx-btn" type="button" data-nx-key="next" data-nx-next="${next.key}">Next: ${esc(next.label)}</button>`:''}
  </div>`;}
/* Review: the request in its sender's words, then the records and notes the ticket links (disclosures; reading one is work
   recorded on the ticket, as in V1). Only legitimate records appear here: denial causes stay with inspection. */
function reviewHTML(id){const sc=S[id],p=sc.person,t=st[id],snd=SENDER[id];
  const recs=[...p.authorizations.map(a=>({id:a.id,title:`${a.id} · ${a.purpose}`,rows:[['Covers',a.places],['When',a.window],['Approved by',a.approver]]})),
    ...(sc.notes||[]).map(n=>({id:n.id,title:n.id,text:n.text}))];
  const key=r=>r.id.replace(/[^A-Za-z0-9]+/g,'-');
  return `<section class="nx-card nx-request" aria-labelledby="nxReqH"><h2 id="nxReqH" class="nx-h">Request</h2>
      <figure class="nx-msg"><figcaption class="nx-msg-from">${snd?`<span class="nx-msg-desk" aria-hidden="true">${icon('review')}</span><span><b>${esc(snd.name)}</b> <span>${esc(snd.note)} · about ${esc(p.name)}</span></span>`
        :`<img class="nx-av" src="${AVATAR[id]}" alt="" width="40" height="40"><span><b>${esc(p.name)}</b> <span>${ROLE[id]}</span></span>`}</figcaption>
        <blockquote class="nx-bubble"><p>${esc(sc.message)}</p></blockquote></figure></section>
    <section class="nx-card nx-records" aria-labelledby="nxRecH"><h2 id="nxRecH" class="nx-h">Records</h2><p class="nx-note">Open a record to read it.</p>
      <ul class="nx-chips">${recs.map(r=>`<li><button class="nx-chip" type="button" data-nx-key="rec-${key(r)}" data-nx-rec="${esc(r.id)}" aria-expanded="${!!t.open[r.id]}" aria-controls="nxRec-${key(r)}">${esc(r.id)}</button></li>`).join('')}</ul>
      ${recs.map(r=>`<div class="nx-rec" id="nxRec-${key(r)}" role="region" aria-label="${esc(r.title)}"${t.open[r.id]?'':' hidden'}><h3>${esc(r.title)}</h3>${r.text?`<p>${esc(r.text)}</p>`
        :`<dl>${r.rows.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`}</div>`).join('')}</section>`;}
/* stage container: one renderer per tracker slot. Slots 2-4 (Configure/Investigate/Respond, Verify/Decide, Close/Submit/Record)
   stay labelled placeholders until Phases 04-06 give them workspaces. */
const placeholderHTML=(id,cur,ph)=>`<section class="nx-card nx-placeholder" aria-labelledby="nxPhH"><h2 id="nxPhH">${esc(cur.label)} workspace</h2><p>Not built yet: this stage's workspace arrives in ${ph}. The Review stage, the tracker and the map are live.</p></section>`;
const STAGE_VIEW={0:id=>reviewHTML(id)};
function announce(t){const l=$('nxLive');l.textContent='';setTimeout(()=>l.textContent=t,30);}

/* ---------- map region: one element, column on wide screens, full-screen dialog otherwise ---------- */
const mapRegion=document.createElement('section');mapRegion.className='nx-map';const inMap=sel=>mapRegion.querySelector(sel);
const sw=(fill,extra='')=>`<svg class="nx-sw" viewBox="0 0 16 16" aria-hidden="true">${fill}${extra}</svg>`;
mapRegion.innerHTML=`<div class="nx-map-bar"><h2 id="nxMapH" tabindex="-1">Facility map</h2><button class="nx-close" type="button" id="nxMapClose" data-nx-key="mapclose">Close map</button></div>
  <div class="nx-map-ctl"><div class="nx-seg" role="group" aria-label="Level"><button type="button" id="nxLv1" data-nx-key="lv1" data-nx-level="1">L1 <span>Gallery</span></button><button type="button" id="nxLv2" data-nx-key="lv2" data-nx-level="2">L2 <span>Topside</span></button></div>
    <span class="nx-clock" id="nxClock"></span></div>
  <figure class="nx-map-fig"><svg class="nx-map-svg" id="nxMapSvg" viewBox="0 0 400 300" role="img" aria-labelledby="nxMapCap"></svg>
    <figcaption class="nx-map-cap" id="nxMapCap"></figcaption></figure>
  <ul class="nx-legend" aria-label="Map key">
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/>')}Area the badge reaches</li>
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/><circle cx="5" cy="8" r="1.4" fill="#0b2a39"/><circle cx="11" cy="8" r="1.4" fill="#0b2a39"/>')}Public gallery</li>
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/><path d="M3 13l6-10M8 13l6-10" stroke="#0b2a39" stroke-width="1.5"/>')}Restricted area</li>
    <li>${sw('<circle cx="8" cy="8" r="5" fill="#a4ead0" stroke="#a9cfd6"/>')}Door the badge opens</li>
    <li>${sw('<circle cx="8" cy="8" r="5" fill="#0b2a39" stroke="#a9cfd6" stroke-width="1.3"/>')}Other door with a reader</li></ul>`;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const list=a=>a.length?a.join(', '):'none';
/* the map shows the open ticket's badge (granted only) at that ticket's level; in the inbox, the plain floor plan */
function renderMap(){const id=route.screen==='ticket'?route.id:null,t=id?st[id]:null,sc=id?S[id]:null,l=id?view[id].level:inboxLevel;
  inMap('#nxMapSvg').innerHTML=NxMap.svg(t,l,getComputedStyle(document.body).fontFamily);
  const l2=t&&NxMap.litOn(t,2);
  inMap('#nxLv1').setAttribute('aria-pressed',l===1);inMap('#nxLv2').setAttribute('aria-pressed',l===2);
  inMap('#nxLv1').setAttribute('aria-label','Level 1, Gallery');inMap('#nxLv2').setAttribute('aria-label',`Level 2, Topside${l2?', has areas the badge reaches':''}`);
  inMap('#nxLv2').classList.toggle('nx-lit',!!l2&&l!==2);
  inMap('#nxClock').textContent=sc?`${sc.day} ${MONTHS[+sc.date.slice(5,7)-1]} ${+sc.date.slice(8)} · ${E.fmt(sc.time)}`:'';
  const s=NxMap.summary(t);
  inMap('#nxMapCap').textContent=t?`Showing level ${l}. ${sc.person.name}'s badge opens ${s.doors.length} door${s.doors.length===1?'':'s'}: ${list(s.doors)}. Areas it reaches, level 1: ${list(s.l1)}; level 2: ${list(s.l2)}.`
    :`Showing level ${l}. Open a ticket to see what that badge opens.`;}
mapRegion.addEventListener('click',e=>{const b=e.target.closest('[data-nx-level]');if(!b)return;const l=+b.dataset.nxLevel;
  if(route.screen==='ticket')view[route.id].level=l;else inboxLevel=l;renderMap();announce(`Level ${l}`);});
function placeMap(){const dlg=$('nxMapDlg');
  if(isWide()){if(dlg.open)dlg.close();$('nxMapCol').appendChild(mapRegion);inMap('#nxMapClose').hidden=true;return;}
  inMap('#nxMapClose').hidden=false;
  if(mapRegion.parentNode!==dlg)dlg.appendChild(mapRegion);/* always in the document: inside the closed dialog when not shown */
  if(route.map){if(!dlg.open){dlg.showModal();inMap('#nxMapH').focus();}}
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
document.addEventListener('click',e=>{const a=e.target.closest('[data-nx-open],[data-nx-step],[data-nx-next],[data-nx-act],[data-nx-rec]');if(!a)return;
  if(a.dataset.nxOpen){e.preventDefault();if(!leaveOK())return;const id=a.dataset.nxOpen;go({screen:'ticket',id,stage:stageOf(id).key,map:false});}
  else if(a.dataset.nxStep){go({...route,stage:a.dataset.nxStep},{replace:true});}
  /* Next starts the learner at the top of the new stage: focus its heading, bring the tracker into view (chevrons keep focus) */
  else if(a.dataset.nxNext){go({...route,stage:a.dataset.nxNext},{replace:true});const h=document.querySelector('.nx-instr h2');
    document.querySelector('.nx-tracker').scrollIntoView({block:'start'});h.focus({preventScroll:true});}
  /* reading a record is a domain action (as in V1): it is recorded on the ticket and counts toward Review/Investigate */
  else if(a.dataset.nxRec){const t=st[route.id],k=a.dataset.nxRec;t.open[k]=!t.open[k];if(t.open[k])t.read[k]=true;render();}
  else if(a.dataset.nxAct==='inbox'){e.preventDefault();backToInbox();}
  else if(a.dataset.nxAct==='brief')openBrief();});
/* arrow keys move between the four stages; Enter or Space selects */
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('.nx-step');if(!b)return;
  const all=[...document.querySelectorAll('.nx-step')],i=all.indexOf(b),j={ArrowLeft:i-1,ArrowRight:i+1,Home:0,End:all.length-1}[e.key];
  if(j==null||j<0||j>=all.length)return;e.preventDefault();all[j].focus();});
addEventListener('popstate',onRoute);addEventListener('hashchange',()=>{if(hashOf(parse(location.hash))!==hashOf(route))onRoute();});
/* read-only hook for the browser tests: evaluation results must not change with navigation */
window.__nx={grade:id=>F.grade(S[id],st[id]),steps:id=>F.steps(S[id],st[id]),status:id=>F.status(S[id],st[id]),view:()=>JSON.parse(JSON.stringify({route,view})),
  footprint:id=>{const f=E.footprint(st[id].world,st[id].person);return{doors:[...f.doors].sort(),spaces:[...f.spaces].sort()};}};
history.replaceState({nx:true,from:null},'',location.hash||'#/inbox');onRoute();
})();

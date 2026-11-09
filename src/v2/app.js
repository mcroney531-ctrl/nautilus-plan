/* Nautilus V2 (Phases 01-04): routing, the Shift Inbox, the four-stage tracker, the stage workspaces (Review, Investigate and the
   decision stages: Configure, Decide, Respond), the global map (one instance; drawing in map.js) and dialogs. Three layers: domain state (st, same shape as V1; only domain actions may change it), derived state (Flow),
   view state (route, per-ticket stage and map level; never read by evaluation). Verify and Close arrive in 05-06. */
(()=>{
const E=Engine,S=SCENARIOS,F=Flow,$=id=>document.getElementById(id);
const ORDER=['elena','marcus','jordan','daniel'];
/* presentation only (scenario data and generated records are untouched): V2 portraits, the locked display roles, and who
   sent the opening message. Jordyn's ticket opens with the review assignment, not a message from Jordyn. */
const AVATAR={elena:'__ART:v2/avatars/elena.webp__',marcus:'__ART:v2/avatars/cameron.webp__',jordan:'__ART:v2/avatars/jordyn.webp__',daniel:'__ART:v2/avatars/daniel.webp__'};
const ROLE={elena:'Marine Educator',marcus:'Dive Crew Lead',jordan:'External Exhibit AV Vendor',daniel:'External Frozen-Feed Driver'};
const SENDER={jordan:{name:'Ops desk',note:'Quarterly contractor access review'}};
/* the vendor escort appears only inside the route that uses her (Daniel's ticket), never as a ticket or sender */
const ESCORT={avatar:'__ART:v2/avatars/jenni.webp__',role:'Receiving Supervisor · Designated Vendor Escort'};
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
let route={screen:'inbox',id:null,stage:null,map:false},invoker=null,invokerKey=null;

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
function openMap(){invoker=document.activeElement;invokerKey=invoker&&invoker.dataset?invoker.dataset.nxKey:null;if(isWide()){const h=inMap('#nxMapH');h.scrollIntoView({block:'nearest'});h.focus({preventScroll:true});return;}go({...route,map:true});}
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
  const PH={verify:'Phase 05',close:'Phase 06'};
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
    <div class="nx-stage" id="nxStage" data-stage="${cur.key}" data-slot="${i}">${(STAGE_VIEW[cur.key]||placeholderHTML)(id,cur,PH[cur.key])}</div>
    ${next?`<button class="nx-btn" type="button" data-nx-key="next" data-nx-next="${next.key}">Next: ${esc(next.label)}</button>`:''}
  </div>`;}
/* Review: the request in its sender's words, then the records and notes the ticket links (disclosures; reading one is work
   recorded on the ticket, as in V1). Only legitimate records appear here: denial causes stay with inspection. */
function reviewHTML(id){const sc=S[id],p=sc.person,snd=SENDER[id];
  return `<section class="nx-card nx-request" aria-labelledby="nxReqH"><h2 id="nxReqH" class="nx-h">Request</h2>
      <figure class="nx-msg"><figcaption class="nx-msg-from">${snd?`<span class="nx-msg-desk" aria-hidden="true">${icon('review')}</span><span><b>${esc(snd.name)}</b> <span>${esc(snd.note)} · about ${esc(p.name)}</span></span>`
        :`<img class="nx-av" src="${AVATAR[id]}" alt="" width="40" height="40"><span><b>${esc(p.name)}</b> <span>${ROLE[id]}</span></span>`}</figcaption>
        <blockquote class="nx-bubble"><p>${esc(sc.message)}</p></blockquote></figure></section>${recordsHTML(id)}`;}
function recordsHTML(id){const sc=S[id],p=sc.person,t=st[id];
  const recs=[...p.authorizations.map(a=>({id:a.id,title:`${a.id} · ${a.purpose}`,rows:[['Covers',a.places],['When',a.window],['Approved by',a.approver]]})),
    ...(sc.notes||[]).map(n=>({id:n.id,title:n.id,text:n.text}))];
  const key=r=>r.id.replace(/[^A-Za-z0-9]+/g,'-');
  return `<section class="nx-card nx-records" aria-labelledby="nxRecH"><h2 id="nxRecH" class="nx-h">Records</h2><p class="nx-note">Open a record to read it.</p>
      <ul class="nx-chips">${recs.map(r=>`<li><button class="nx-chip" type="button" data-nx-key="rec-${key(r)}" data-nx-rec="${esc(r.id)}" aria-expanded="${!!t.open[r.id]}" aria-controls="nxRec-${key(r)}">${esc(r.id)}</button></li>`).join('')}</ul>
      ${recs.map(r=>`<div class="nx-rec" id="nxRec-${key(r)}" role="region" aria-label="${esc(r.title)}"${t.open[r.id]?'':' hidden'}><h3>${esc(r.title)}</h3>${r.text?`<p>${esc(r.text)}</p>`
        :`<dl>${r.rows.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`}</div>`).join('')}</section>`;}
/* stage container: one workspace per stage FUNCTION, never per tracker position (Jordyn's Decide is her third segment,
   Daniel's Respond his second). Verify and Close/Submit/Record stay labelled placeholders until Phases 05 and 06. */
const placeholderHTML=(id,cur,ph)=>`<section class="nx-card nx-placeholder" aria-labelledby="nxPhH"><h2 id="nxPhH">${esc(cur.label)} workspace</h2><p>Not built yet: this stage's workspace arrives in ${ph}. Review, the decision stages and the map are live.</p></section>`;
const STAGE_VIEW={review:id=>reviewHTML(id),investigate:id=>evidenceHTML(id),configure:id=>decisionHTML(id,'configure'),decide:id=>decisionHTML(id,'decide'),respond:id=>decisionHTML(id,'respond')};

/* ---------- decision workspaces: sections come from the scenario's data (editable groups, time exceptions, a group-hours edit,
   routes, an audit decision), so one interface serves every ticket without scenario branches ---------- */
const hrs=w=>`${E.fmt(w[0])}–${E.fmt(w[1])}`;
const opt=(type,name,key,on,title,detail,extra='')=>`<label class="nx-opt"><input type="${type}" name="${name}" ${extra} data-nx-key="${key}"${on?' checked':''}><span class="nx-opt-txt"><b>${title}</b>${detail?`<span>${detail}</span>`:''}</span></label>`;
function decisionHTML(id,key){const sc=S[id],t=st[id],c=t.person.credential;let h='';
  const routes=()=>sc.routes?`<fieldset class="nx-card nx-fs"><legend class="nx-h">Response</legend>${sc.routes.map(r=>{const esco=r.as==='escort'&&sc.escort;
      return opt('radio','nxRoute',`rt-${r.id}`,t.route===r.id,esc(r.label),esco?'':esc(r.note),`value="${r.id}" data-nx-do="route"`)+(esco?`<div class="nx-escort"><img class="nx-av" src="${ESCORT.avatar}" alt="" width="40" height="40"><span><b>${esc(sc.escort.name)}</b> <span>${ESCORT.role} · ${esc(sc.escort.authorizations.map(a=>a.id).join(', '))}</span></span></div>`:'');}).join('')}</fieldset>`:'';
  const groups=()=>`<fieldset class="nx-card nx-fs"><legend class="nx-h">Access groups</legend><p class="nx-note">Groups assigned to ${esc(sc.person.name)}'s badge in the access system.</p>${sc.editable.map(g=>{const G=E.GROUPS[g];
      return opt('checkbox','',`g-${g}`,c.groups.includes(g),G.n,`${G.note?esc(G.note)+' · ':''}${G.doors.length} door${G.doors.length===1?'':'s'} · ${hrs(E.groupHours(t.world,g))} · ${G.members} badges`,`data-nx-do="group" value="${g}"`);}).join('')}</fieldset>`;
  const schedules=()=>{const xs=t.person.authorizations.filter(a=>a.exception),e=sc.groupScheduleEdit;if(!xs.length&&!e)return'';
    return `<fieldset class="nx-card nx-fs"><legend class="nx-h">Schedules</legend>${xs.map(a=>opt('checkbox','',`x-${a.id}`,c.exceptions.some(x=>x.source===a.id),`Time exception from ${esc(a.id)}`,
      `This badge only · ${a.exception.day} ${hrs(a.exception.window)} · ${a.exception.doors.length} doors`,`data-nx-do="exception" value="${esc(a.id)}"`)).join('')}${e?opt('checkbox','','gs',!!t.world.groupOverrides[e.group],
      `Change ${E.GROUPS[e.group].n} group hours to ${hrs(e.to)}`,`Group setting · every day · all ${E.GROUPS[e.group].members} badges`,'data-nx-do="hours"'):''}</fieldset>`;};
  const audit=()=>{if(!sc.revoke&&!sc.disposition)return'';const o=sc.disposition&&sc.disposition.options.find(o=>o.id===t.disp);
    const act=c.active?(c.groups.length?'Access retained':'Groups removed, credential still active'):'Credential deactivated';
    return `<fieldset class="nx-card nx-fs"><legend class="nx-h">Credential</legend>${opt('checkbox','','rv',!c.active,'Deactivate badge',`${c.active?'Badge is active':'Badge is inactive'} · reversible`,'data-nx-do="revoke"')}</fieldset>
      ${sc.disposition?`<fieldset class="nx-card nx-fs"><legend class="nx-h">Reason for the decision</legend>${sc.disposition.options.map(o=>opt('radio','nxDisp',`dp-${o.id}`,t.disp===o.id,esc(o.text),'',`value="${o.id}" data-nx-do="reason"`)).join('')}
        <p class="nx-recorded" aria-live="polite">Recorded: <b>${act}</b> · ${o?esc(o.text):'no reason chosen yet'}</p></fieldset>`:''}`;};
  if(key==='respond')h+=routes();
  if(key==='decide')h+=audit();
  h+=groups()+schedules();
  if(key!=='respond')h+=routes();
  if(key!=='decide')h+=audit();
  return h+badgeHTML(id)+impactHTML(id)+miniHTML(id);}
/* the granted footprint as text: doors included in badge permissions, and the areas they give access to */
function badgeHTML(id){const t=st[id],fp=E.footprint(t.world,t.person),ds=[...fp.doors].map(d=>E.DOORS[d].n);
  const by=k=>[...fp.spaces].filter(x=>k.includes(E.SPACES[x].kind)).map(x=>E.SPACES[x].n),grp=[['public',by(['public','program'])],['staff',by(['staff','core'])],['restricted',by(['restricted'])]].filter(x=>x[1].length);
  return `<section class="nx-card nx-badge" aria-labelledby="nxBadgeH"><h2 id="nxBadgeH" class="nx-h">Badge permissions</h2><p>${!t.person.credential.active?'The credential is deactivated: the badge has no permissions.':ds.length?`Grants access to ${ds.length} door${ds.length>1?'s':''}: ${ds.map(esc).join(', ')}. Areas in the granted footprint (through those doors and open passages): ${grp.map(x=>`${x[0]}: ${x[1].map(esc).join(', ')}`).join('; ')}.`:'No doors are in this badge\'s permissions yet.'}</p></section>`;}
/* change review: the effective-permission difference of the last change (V1 semantics), never "which box changed" */
function impactHTML(id){const sc=S[id],t=st[id],d=t.delta,td=t.tdelta,hasT=td&&(td.opened.length||td.closed.length);
  let h=`<section class="nx-card nx-impact" aria-labelledby="nxImpH"><h2 id="nxImpH" class="nx-h">Change review</h2>`;
  if(!d)return h+`<p class="nx-note">Each change to the badge shows here: what it added to or removed from the granted footprint, computed from effective permissions.</p></section>`;
  const none=!d.addedSpaces.length&&!d.removedSpaces.length&&!d.addedDoors.length&&!d.removedDoors.length&&!hasT,dn=a=>a.map(x=>esc(E.DOORS[x].n)).join(', ');
  h+=`<p class="nx-last">${esc(t.lastLabel||'Last change')}</p>`;
  if(none){const s=t.still;h+=`<p class="nx-note">${s&&s.doors.length&&s.via.length?`Access at ${sc.day} ${E.fmt(sc.time)} doesn't change: ${s.via.map(esc).join(' and ')} still ${s.via.length>1?'grant':'grants'} ${dn(s.doors)}.`:'Effective permissions don\'t change.'}</p>`;}
  if(d.addedSpaces.length)h+=`<h3>Added to the granted footprint</h3><ul class="nx-tags">${d.addedSpaces.map(k=>`<li class="nx-tag nx-tag-add">+ ${esc(E.SPACES[k].n)}${E.SPACES[k].kind==='restricted'?' <em>restricted</em>':''}${E.SPACES[k].l===2&&!/L2/.test(E.SPACES[k].n)?' <em>L2</em>':''}</li>`).join('')}</ul>`;
  if(d.removedSpaces.length)h+=`<h3>Removed from the granted footprint</h3><ul class="nx-tags">${d.removedSpaces.map(k=>`<li class="nx-tag nx-tag-rem">− ${esc(E.SPACES[k].n)}${E.SPACES[k].l===2&&!/L2/.test(E.SPACES[k].n)?' <em>L2</em>':''}</li>`).join('')}</ul>`;
  const extra=d.addedDoors.filter(x=>!d.addedSpaces.includes(E.DOORS[x].into)),lost=d.removedDoors.filter(x=>!d.removedSpaces.includes(E.DOORS[x].into));
  if(extra.length)h+=`<h3>Doors added to badge permissions</h3><p>${dn(extra)}</p>`;
  if(lost.length)h+=`<h3>Doors removed from badge permissions</h3><p>${dn(lost)}</p>`;
  if(hasT)h+=`<h3>Same places, different hours</h3><p>At ${sc.day} ${E.fmt(sc.time)}: ${td.opened.length?`newly opens ${dn(td.opened)}`:''}${td.opened.length&&td.closed.length?'; ':''}${td.closed.length?`no longer opens ${dn(td.closed)}`:''}. Applies to ${esc(t.tscope)}.</p>`;
  if(d.addedSpaces.length||d.removedSpaces.length)h+=`<button class="nx-btn nx-btn-quiet" type="button" data-nx-key="delta" data-nx-act="delta" aria-pressed="${t.showDelta}">${t.showDelta?'Showing':'Show'} changes on the map</button>`;
  return h+'</section>';}
/* phones and mid widths (no map column): a live two-level footprint that opens the full map */
function miniHTML(id){const t=st[id],fp=E.footprint(t.world,t.person),lv=[1,2].filter(l=>[...fp.spaces].some(k=>E.SPACES[k].l===l)),rs=[...fp.spaces].filter(k=>E.SPACES[k].kind==='restricted').map(k=>E.SPACES[k].n);
  return `<button class="nx-mini" type="button" data-nx-key="mini" data-nx-act="map" aria-label="Open the facility map. ${fp.doors.size} door${fp.doors.size===1?'':'s'} in badge permissions; granted footprint on ${lv.length?lv.map(l=>'level '+l).join(' and '):'neither level'}.">
    <span class="nx-mini-lv"><svg viewBox="0 0 400 300" aria-hidden="true">${NxMap.mini(t,1)}</svg><b aria-hidden="true">L1</b></span><span class="nx-mini-lv"><svg viewBox="0 0 400 300" aria-hidden="true">${NxMap.mini(t,2)}</svg><b aria-hidden="true">L2</b></span>
    <span class="nx-mini-sum" aria-hidden="true"><b>${fp.doors.size} door${fp.doors.size===1?'':'s'} in badge permissions</b> · footprint on ${lv.length?lv.map(l=>'L'+l).join(' + '):'neither level'}${rs.length?` · restricted: ${rs.map(esc).join(', ')}`:''} · Open map</span></button>`;}
/* Investigate (audit): the evidence, read-only. The badge as it stands and the records; the inspection lens arrives in Phase 05. */
function evidenceHTML(id){const t=st[id],c=t.person.credential;
  return `<section class="nx-card" aria-labelledby="nxEvH"><h2 id="nxEvH" class="nx-h">Current badge</h2><p>Credential: <b>${c.active?'active':'deactivated'}</b>. Assigned groups: ${c.groups.length?c.groups.map(g=>esc(E.GROUPS[g].n)).join(', '):'none'}.</p>
    <p class="nx-note">Compare what the badge grants with the records below. The inspection lens arrives in Phase 05.</p></section>${badgeHTML(id)}${recordsHTML(id)}`;}

/* ---------- domain actions (V1 semantics): every badge change recomputes the effective-permission difference, clears the walk
   and any result; a route or reason choice clears the walk/result only. Evaluation itself is untouched (src/flow.js). ---------- */
function change(id,fn,label){const sc=S[id],t=st[id],wb=E.clone(t.world),pb=E.clone(t.person),before=E.footprint(t.world,t.person);
  fn();t.delta=E.delta(before,E.footprint(t.world,t.person));t.lastLabel=label();
  const tt=sc.time,gb=E.grants(wb,pb),ga=E.grants(t.world,t.person);
  const touched=[...new Set([...Object.keys(gb),...Object.keys(ga)])].filter(d=>JSON.stringify(gb[d]||[])!==JSON.stringify(ga[d]||[]));
  const live=touched.filter(d=>E.canEnter(t.world,t.person,d,tt).ok);
  const src=x=>x.kind==='exception'?`the ${x.via.replace('Exception · ','')} exception (this badge only)`:`${x.via}${t.world.groupOverrides[x.group]?' with its changed group hours':''} (${E.fmt(x.window[0])}–${E.fmt(x.window[1])}, all ${E.GROUPS[x.group].members} badges)`;
  t.still={doors:live,via:[...new Set(live.flatMap(d=>E.canEnter(t.world,t.person,d,tt).via.map(src)))]};
  t.tdelta=E.timeDelta(wb,pb,t.world,t.person,sc.time);
  const og=Object.keys({...wb.groupOverrides,...t.world.groupOverrides}).find(k=>JSON.stringify(wb.groupOverrides[k])!==JSON.stringify(t.world.groupOverrides[k]));
  t.tscope=og?`all ${E.GROUPS[og].members} ${E.GROUPS[og].n} badges`:'this badge only';t.showDelta=true;t.walk=null;t.result=null;render();announce(t.lastLabel);}
function act(input){const id=route.id,sc=S[id],t=st[id],c=t.person.credential,v=input.value;
  ({group:()=>change(id,()=>{const i=c.groups.indexOf(v);i<0?c.groups.push(v):c.groups.splice(i,1);},()=>`${c.groups.includes(v)?'Added':'Removed'} ${E.GROUPS[v].n}`),
    exception:()=>change(id,()=>{const a=t.person.authorizations.find(a=>a.id===v),i=c.exceptions.findIndex(x=>x.source===v);i<0?c.exceptions.push(E.clone(a.exception)):c.exceptions.splice(i,1);},()=>`${c.exceptions.some(x=>x.source===v)?'Added':'Removed'} the time exception from ${v}`),
    hours:()=>change(id,()=>{const e=sc.groupScheduleEdit;t.world.groupOverrides[e.group]?delete t.world.groupOverrides[e.group]:t.world.groupOverrides[e.group]=e.to;},()=>{const e=sc.groupScheduleEdit,G=E.GROUPS[e.group];return `${t.world.groupOverrides[e.group]?'Changed':'Restored'} ${G.n} group hours to ${hrs(E.groupHours(t.world,e.group))} (all ${G.members} badges)`;}),
    revoke:()=>change(id,()=>{c.active=!c.active;},()=>c.active?'Reactivated the badge':'Deactivated the badge'),
    route:()=>{t.route=v;t.walk=null;t.result=null;render();announce(`Response: ${sc.routes.find(r=>r.id===v).label}`);},
    reason:()=>{t.disp=v;t.result=null;render();announce(`Reason: ${sc.disposition.options.find(o=>o.id===v).text}`);}})[input.dataset.nxDo]();}
document.addEventListener('change',e=>{const i=e.target.closest&&e.target.closest('[data-nx-do]');if(i&&route.screen==='ticket')act(i);});
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
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/>')}Area in the granted footprint</li>
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/><circle cx="5" cy="8" r="1.4" fill="#0b2a39"/><circle cx="11" cy="8" r="1.4" fill="#0b2a39"/>')}Public gallery</li>
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/><path d="M3 13l6-10M8 13l6-10" stroke="#0b2a39" stroke-width="1.5"/>')}Restricted area</li>
    <li>${sw('<circle cx="8" cy="8" r="5" fill="#a4ead0" stroke="#a9cfd6"/>')}Door included in badge permissions</li>
    <li>${sw('<circle cx="8" cy="8" r="5" fill="#0b2a39" stroke="#a9cfd6" stroke-width="1.3"/>')}Door with a reader, not in badge permissions</li></ul>`;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const list=a=>a.length?a.join(', '):'none';
/* the map shows the open ticket's badge (granted only) at that ticket's level; in the inbox, the plain floor plan */
function renderMap(){const id=route.screen==='ticket'?route.id:null,t=id?st[id]:null,sc=id?S[id]:null,l=id?view[id].level:inboxLevel;
  inMap('#nxMapSvg').innerHTML=NxMap.svg(t,l,getComputedStyle(document.body).fontFamily);
  const l2=t&&NxMap.litOn(t,2);
  inMap('#nxLv1').setAttribute('aria-pressed',l===1);inMap('#nxLv2').setAttribute('aria-pressed',l===2);
  inMap('#nxLv1').setAttribute('aria-label','Level 1, Gallery');inMap('#nxLv2').setAttribute('aria-label',`Level 2, Topside${l2?', has areas in the granted footprint':''}`);
  inMap('#nxLv2').classList.toggle('nx-lit',!!l2&&l!==2);
  inMap('#nxClock').textContent=sc?`${sc.day} ${MONTHS[+sc.date.slice(5,7)-1]} ${+sc.date.slice(8)} · ${E.fmt(sc.time)}`:'';
  const s=NxMap.summary(t);
  inMap('#nxMapCap').textContent=t?`Showing level ${l}. ${sc.person.name}'s badge grants access to ${s.doors.length} door${s.doors.length===1?'':'s'}: ${list(s.doors)}. Areas in the granted footprint, level 1: ${list(s.l1)}; level 2: ${list(s.l2)}.`
    :`Showing level ${l}. Open a ticket to see that badge's permissions.`;}
mapRegion.addEventListener('click',e=>{const b=e.target.closest('[data-nx-level]');if(!b)return;const l=+b.dataset.nxLevel;
  if(route.screen==='ticket')view[route.id].level=l;else inboxLevel=l;renderMap();announce(`Level ${l}`);});
function placeMap(){const dlg=$('nxMapDlg');
  if(isWide()){if(dlg.open)dlg.close();$('nxMapCol').appendChild(mapRegion);inMap('#nxMapClose').hidden=true;return;}
  inMap('#nxMapClose').hidden=false;
  if(mapRegion.parentNode!==dlg)dlg.appendChild(mapRegion);/* always in the document: inside the closed dialog when not shown */
  if(route.map){if(!dlg.open){dlg.showModal();inMap('#nxMapH').focus();}}
  /* re-renders can replace the element that opened the map: return focus by its data-nx-key first */
  else if(dlg.open){dlg.close();const k=invokerKey&&document.querySelector(`[data-nx-key="${invokerKey}"]`),t=k||(invoker&&document.contains(invoker)?invoker:$('nxMapBtn'));t.focus({preventScroll:true});}}
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
  else if(a.dataset.nxAct==='brief')openBrief();
  else if(a.dataset.nxAct==='map')openMap();
  else if(a.dataset.nxAct==='delta'){const t=st[route.id];t.showDelta=!t.showDelta;render();}});
/* arrow keys move between the four stages; Enter or Space selects */
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('.nx-step');if(!b)return;
  const all=[...document.querySelectorAll('.nx-step')],i=all.indexOf(b),j={ArrowLeft:i-1,ArrowRight:i+1,Home:0,End:all.length-1}[e.key];
  if(j==null||j<0||j>=all.length)return;e.preventDefault();all[j].focus();});
addEventListener('popstate',onRoute);addEventListener('hashchange',()=>{if(hashOf(parse(location.hash))!==hashOf(route))onRoute();});
/* read-only hook for the browser tests: evaluation results must not change with navigation */
window.__nx={state:id=>JSON.parse(JSON.stringify({credential:st[id].person.credential,overrides:st[id].world.groupOverrides,route:st[id].route,disp:st[id].disp,delta:st[id].delta})),grade:id=>F.grade(S[id],st[id]),steps:id=>F.steps(S[id],st[id]),status:id=>F.status(S[id],st[id]),view:()=>JSON.parse(JSON.stringify({route,view})),
  footprint:id=>{const f=E.footprint(st[id].world,st[id].person);return{doors:[...f.doors].sort(),spaces:[...f.spaces].sort()};}};
history.replaceState({nx:true,from:null},'',location.hash||'#/inbox');onRoute();
})();

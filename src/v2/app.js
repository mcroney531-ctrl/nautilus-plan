/* Nautilus V2 (Phases 01-06): routing, the Shift Inbox, the four-stage tracker, the stage workspaces (Review, Investigate and the
   decision stages: Configure, Decide, Respond), the global map (one instance; drawing in map.js) and dialogs. Three layers: domain state (st, same shape as V1; only domain actions may change it), derived state (Flow),
   view state (route, per-ticket stage, map level, inspect mode and lens position; never read by evaluation). */
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
const st={},view={};ORDER.forEach(id=>{st[id]=fresh(id);view[id]={stage:null,level:1,perms:null,inspect:false,lensP:[143,88]};});
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let inboxLevel=1;
const isWide=()=>matchMedia('(min-width:1180px)').matches,narrow=()=>!matchMedia('(min-width:760px)').matches;
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
function onRoute(){const next=parse(location.hash);
  /* browser Back/Forward during a walk: put the address back, then ask */
  if(walking()&&hashOf(next)!==hashOf(route)){history.pushState({...(history.state||{}),nx:true},'',hashOf(route));guard(()=>go(next,{replace:true}));return;}
  const prev=route;route=next;
  if(route.screen==='ticket')view[route.id].stage=route.stage;
  if(hashOf(route)!==location.hash)history.replaceState(history.state,'',hashOf(route));
  render();placeMap();
  if(route.screen!==prev.screen||route.id!==prev.id){
    if(route.screen==='ticket'){const h=document.querySelector('.nx-person h1');h&&h.focus({preventScroll:true});scrollTo(0,0);}
    else if(prev.id){const a=document.querySelector(`[data-nx-key="inbox-${prev.id}"]`);a&&a.focus({preventScroll:true});}}
  else if(route.stage!==prev.stage&&route.screen==='ticket'){const ss=stagesOf(route.id),i=Math.max(0,ss.findIndex(x=>x.key===route.stage)),s=ss[i];announce(`Step ${i+1} of 4: ${s.label}${s.na?', not applicable':''}`);}}
/* ---------- walk and its guard: anything that would leave or change a running walk asks Cancel walk / Continue test.
   Stage and ticket changes, closing the map, the logo, browser Back, badge or route changes. The walk pauses while asking. */
let timer=null,walkId=null,pending=null;
const walking=()=>!!(walkId&&st[walkId].walk&&st[walkId].walk.running);
function guard(fn){if(!walking())return fn();pending=fn;clearTimeout(timer);timer=null;const sc=S[walkId],d=$('nxGuard');
  d.innerHTML=`<div class="nx-brief"><h2 id="nxGuardH" tabindex="-1">A walk test is running</h2><p>${esc(sc.person.name)}'s walk is not finished. Leaving now cancels it, and the walk will not count as verified.</p>
    <div class="nx-row"><button class="nx-btn" type="button" id="nxGuardGo" data-nx-key="guardgo">Continue test</button><button class="nx-btn nx-btn-quiet" type="button" id="nxGuardStop" data-nx-key="guardstop">Cancel walk</button></div></div>`;
  d.showModal();$('nxGuardGo').focus();}
function guardContinue(){const d=$('nxGuard');pending=null;d.close();render();tick();}
function guardCancel(){const d=$('nxGuard'),fn=pending;pending=null;d.close();clearTimeout(timer);timer=null;if(walkId)st[walkId].walk=null;walkId=null;render();announce('Walk cancelled');fn&&fn();}
function startWalk(){const id=route.id,sc=S[id],t=st[id],r=F.routeOf(sc,t);if(walking()||(r&&r.wait))return;
  invoker=document.activeElement;invokerKey='walk';view[id].inspect=false;
  if(!isWide()&&!route.map)go({...route,map:true}); /* open the map before the walk starts, so the guard does not intercept it */
  t.walk=F.buildWalk(sc,t);view[id].level=1;walkId=id;render();announce(`Walking ${sc.person.name.split(' ')[0]} in`);tick();}
function tick(){const t=st[walkId],w=t&&t.walk;if(!w||!w.running)return;
  timer=setTimeout(()=>{if(t.walk!==w)return;
    if(w.i>=w.pts.length-1){w.running=false;timer=null;walkId=null;render();const st0=w.res.stop;
      announce(st0?`Walk stopped at ${E.DOORS[st0.door]?E.DOORS[st0.door].n:'a door'}.`:'Walk complete: reached every stop.');return;}
    w.i++;view[walkId].level=w.pts[w.i].l;renderMap();tick();},RM?40:170);}
function backToInbox(){guard(()=>history.state&&history.state.nx&&history.state.from==='inbox'&&!route.map?history.back():go({screen:'inbox',map:false}));}
function openMap(){invoker=document.activeElement;invokerKey=invoker&&invoker.dataset?invoker.dataset.nxKey:null;if(isWide()){const h=inMap('#nxMapH');h.scrollIntoView({block:'nearest'});h.focus({preventScroll:true});return;}go({...route,map:true});}
function closeMap(){guard(()=>{history.state&&history.state.map?history.back():go({...route,map:false},{replace:true});});}

/* ---------- render (focus is restored by data-nx-key after every update) ---------- */
function render(){const k=document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.nxKey:null;
  $('nxApp').dataset.screen=route.screen;renderInbox();renderWork();renderMap();placeMap();
  if(k){const el=document.querySelector(`[data-nx-key="${k}"]`);if(el&&el!==document.activeElement)el.focus({preventScroll:true});}}
function renderInbox(){const open=ORDER.filter(id=>statusOf(id)!=='closed').length;
  $('nxInbox').innerHTML=`<div class="nx-inbox-inner"><h2 class="nx-inbox-h" id="nxInboxH">Shift Inbox <span class="nx-count" aria-label="${open} open">${open}</span></h2>
    <button class="nx-briefcard" type="button" data-nx-key="briefcard" data-nx-act="brief">${icon('review')}<span><b>Shift brief</b> <span>From the ops desk supervisor · how today's tickets work</span></span></button>
    ${ORDER.every(id=>F.finalized(st[id]))?`<section class="nx-shift" aria-labelledby="nxShiftH"><h3 id="nxShiftH">Shift summary</h3><p class="nx-note" style="color:var(--nx-on-navy-muted)">Generated by the access desk when all four tickets are closed.</p>
      <ol>${ORDER.map(id=>`<li><b>${esc(S[id].person.name)}</b> · ${esc(st[id].result.title)}. <span>${esc(S[id].principle||'')}</span></li>`).join('')}</ol></section>`:''}
    <ul class="nx-list">${ORDER.map(id=>{const sc=S[id],p=sc.person,cur=route.screen==='ticket'&&route.id===id,stt=statusOf(id);
      return `<li><a class="nx-item" href="${hashOf({screen:'ticket',id,stage:stageOf(id).key})}" data-nx-key="inbox-${id}" data-nx-open="${id}"${cur?' aria-current="page"':''}>
        <img class="nx-av" src="${AVATAR[id]}" alt="" width="48" height="48"><span class="nx-item-txt"><b>${esc(p.name)}</b> <span>${ROLE[id]}</span> <span class="nx-preview">${esc(sc.message)}</span>
        <span class="nx-meta">${esc(refOf(sc))} · ${esc(sc.day)} ${E.fmt(sc.time)} <span class="nx-status nx-status-${stt}">${STATUS[stt]}</span></span></span></a></li>`;}).join('')}</ul></div>`;}
function renderWork(){const w=$('nxWork');
  if(route.screen!=='ticket'){w.innerHTML=`<div class="nx-empty"><p>Select a request from the Shift Inbox.</p></div>`;return;}
  const id=route.id,sc=S[id],p=sc.person,ss=stagesOf(id),i=Math.max(0,ss.findIndex(s=>s.key===view[id].stage)),cur=ss[i],next=ss[i+1],sug=ss.find(s=>!s.done);
  const PH={close:'Phase 06'};
  w.innerHTML=`<div class="nx-ticket">
    <a class="nx-back" href="#/inbox" data-nx-key="back" data-nx-act="inbox"><span aria-hidden="true">‹</span> Shift Inbox</a>
    <div class="nx-person"><img class="nx-av" src="${AVATAR[id]}" alt="" width="64" height="64"><div><h1 tabindex="-1">${esc(p.name)}</h1><p>${ROLE[id]} · ${esc(refOf(sc))}${contextOf(id)?` · ${esc(contextOf(id))}`:''}</p></div></div>
    <section class="nx-tracker" aria-labelledby="nxTrackerH">
      <div class="nx-tracker-h"><span id="nxTrackerH">Request progress</span><b aria-hidden="true">${String(i+1).padStart(2,'0')} of 04</b></div>
      <ol class="nx-steps">${ss.map((s,j)=>`<li><button class="nx-step" type="button" data-nx-key="step-${j}" data-nx-step="${s.key}"${s===cur?' aria-current="step"':''}
          aria-label="Step ${j+1} of 4: ${esc(s.label)}${s.na?', not applicable':s.done?', done':''}${s===sug&&s!==cur?', suggested next':''}">
          <span class="nx-chev">${icon(s.key)}<span class="nx-step-num" aria-hidden="true">${j+1}</span>${s.na?'<span class="nx-step-na" aria-hidden="true">N/A</span>':s.done?`<span class="nx-step-done" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2.5 6.5l2.2 2.2 4.8-5"/></svg></span>`:''}</span>
          <span class="nx-step-label" aria-hidden="true">${esc(s.label)}</span></button></li>`).join('')}</ol>
      <div class="nx-instr">${icon(cur.key)}<div><h2 tabindex="-1">${esc(cur.label)}${cur.na?' <span class="nx-instr-na">(not applicable on this route)</span>':''}</h2>${(()=>{const w=st[id].walk,c=sc.coach||{},tip=(w&&!w.running&&w.res.stop&&c.afterFail)||c[cur.key];return tip?`<p>${esc(tip)}</p>`:'';})()}</div></div>
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
   Daniel's Respond his second). Close/Submit/Record stays a labelled placeholder until Phase 06. */
const placeholderHTML=(id,cur,ph)=>`<section class="nx-card nx-placeholder" aria-labelledby="nxPhH"><h2 id="nxPhH">${esc(cur.label)} workspace</h2><p>Not built yet: this stage's workspace arrives in ${ph}. Review, the decision stages and the map are live.</p></section>`;
const STAGE_VIEW={close:id=>closeHTML(id),review:id=>reviewHTML(id),investigate:id=>evidenceHTML(id)+walkHTML(id,true),verify:id=>isWide()?`<div class="nx-vwide"><div class="nx-bigmap" id="nxBigMap"></div><div class="nx-vside">${walkHTML(id,false)}</div></div>`:walkHTML(id,false),configure:id=>decisionHTML(id,'configure'),decide:id=>decisionHTML(id,'decide'),respond:id=>decisionHTML(id,'respond')};

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
  const rs=by(['restricted']),open=view[id].perms??!narrow();
  const sum=!t.person.credential.active?'Credential deactivated: no permissions':`${ds.length} door${ds.length===1?'':'s'} · ${fp.spaces.size} area${fp.spaces.size===1?'':'s'} in the granted footprint${rs.length?` · includes restricted: ${rs.map(esc).join(', ')}`:''}`;
  return `<section class="nx-card nx-badge" aria-labelledby="nxBadgeH"><h2 id="nxBadgeH" class="nx-h">Badge permissions</h2><p class="nx-badge-sum">${sum}</p>
    <button class="nx-btn nx-btn-quiet" type="button" data-nx-key="perms" data-nx-act="perms" aria-expanded="${open}" aria-controls="nxPerms">${open?'Hide':'Show'} doors and areas</button>
    <div id="nxPerms"${open?'':' hidden'}><p>${!t.person.credential.active?'The credential is deactivated: the badge has no permissions.':ds.length?`Grants access to ${ds.length} door${ds.length>1?'s':''}: ${ds.map(esc).join(', ')}. Areas in the granted footprint (through those doors and open passages): ${grp.map(x=>`${x[0]}: ${x[1].map(esc).join(', ')}`).join('; ')}.`:'No doors are in this badge\'s permissions yet.'}</p></div></section>`;}
/* change review: the effective-permission difference of the last change (V1 semantics), never "which box changed" */
function impactHTML(id){const sc=S[id],t=st[id],d=t.delta,td=t.tdelta,hasT=td&&(td.opened.length||td.closed.length);
  let h=`<section class="nx-card nx-impact" aria-labelledby="nxImpH"><h2 id="nxImpH" class="nx-h">Change review</h2>`;
  if(!d)return h+`<p class="nx-note">Each change to the badge shows here: what it added to or removed from the granted footprint, computed from effective permissions.</p></section>`;
  const none=!d.addedSpaces.length&&!d.removedSpaces.length&&!d.addedDoors.length&&!d.removedDoors.length&&!hasT,dn=a=>a.map(x=>esc(E.DOORS[x].n)).join(', ');
  h+=`<p class="nx-last">${esc(t.lastLabel||'Last change')}</p>`;
  if(none){const s=t.still;h+=`<p class="nx-note">${s&&s.doors.length&&s.via.length?`Access at ${sc.day} ${E.fmt(sc.time)} doesn't change: ${s.via.map(esc).join(' and ')} still ${s.via.length>1?'grant':'grants'} ${dn(s.doors)}.`:'Effective permissions don\'t change.'}</p>`;}
  if(d.addedSpaces.length)h+=`<h3>Added to the granted footprint</h3><ul class="nx-tags">${d.addedSpaces.map(k=>`<li class="nx-tag nx-tag-add" data-space="${k}">+ ${esc(E.SPACES[k].n)}${E.SPACES[k].kind==='restricted'?' <em>restricted</em>':''}${E.SPACES[k].l===2&&!/L2/.test(E.SPACES[k].n)?' <em>L2</em>':''}</li>`).join('')}</ul>`;
  if(d.removedSpaces.length)h+=`<h3>Removed from the granted footprint</h3><ul class="nx-tags">${d.removedSpaces.map(k=>`<li class="nx-tag nx-tag-rem" data-space="${k}">− ${esc(E.SPACES[k].n)}${E.SPACES[k].l===2&&!/L2/.test(E.SPACES[k].n)?' <em>L2</em>':''}</li>`).join('')}</ul>`;
  if(d.addedDoors.length)h+=`<h3>Doors added to badge permissions</h3><ul class="nx-tags">${d.addedDoors.map(x=>`<li class="nx-tag nx-tag-add" data-door="${x}">+ ${esc(E.DOORS[x].n)}</li>`).join('')}</ul>`;
  if(d.removedDoors.length)h+=`<h3>Doors removed from badge permissions</h3><ul class="nx-tags">${d.removedDoors.map(x=>`<li class="nx-tag nx-tag-rem" data-door="${x}">− ${esc(E.DOORS[x].n)}</li>`).join('')}</ul>`;
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
    <p class="nx-note">Compare what the badge grants with the records below. Use Inspect on the facility map to check individual doors.</p></section>${badgeHTML(id)}${recordsHTML(id)}`;}

/* ---------- domain actions (V1 semantics): every badge change recomputes the effective-permission difference, clears the walk
   and any result; a route or reason choice clears the walk/result only. Evaluation itself is untouched (src/flow.js). ---------- */
function change(id,fn,label){const sc=S[id],t=st[id],wb=E.clone(t.world),pb=E.clone(t.person),before=E.footprint(t.world,t.person);
  fn();t.delta=E.delta(before,E.footprint(t.world,t.person));t.lastLabel=label();t.record=null;
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
    route:()=>{t.route=v;t.walk=null;t.result=null;t.record=null;render();announce(`Response: ${sc.routes.find(r=>r.id===v).label}`);},
    reason:()=>{t.disp=v;t.result=null;t.record=null;render();announce(`Reason: ${sc.disposition.options.find(o=>o.id===v).text}`);}})[input.dataset.nxDo]();}
/* a badge or route change during a walk would invalidate it: ask first (Continue restores the control) */
document.addEventListener('change',e=>{const i=e.target.closest&&e.target.closest('[data-nx-do]');if(i&&route.screen==='ticket')guard(()=>act(i));});
/* walk test: route, time and stops; the log after it runs says which doors opened or didn't, never why */
function walkHTML(id,optional){const sc=S[id],t=st[id],r=F.routeOf(sc,t),w=t.walk,first=sc.person.name.split(' ')[0];
  if(r&&r.wait)return `<section class="nx-card" aria-labelledby="nxWalkH"><h2 id="nxWalkH" class="nx-h">Walk test</h2><p>Not applicable on this response: ${esc(first)} waits at the dock, so there is no walk to test. Choose another response under Respond to walk ${esc(first)} in.</p></section>`;
  const from=(r&&r.start)||sc.start,run=!!(w&&w.running);
  let h=`<section class="nx-card nx-walk" aria-labelledby="nxWalkH"><h2 id="nxWalkH" class="nx-h">${optional?'Optional: walk test':'Walk test'}</h2>
    ${optional?`<p class="nx-note">See what ${esc(first)}'s badge does today. An audit does not need a walk.</p>`:''}
    <dl class="nx-dl"><dt>Starts</dt><dd>${esc(E.OUTSIDE[from].n.replace('Outside · ',''))}${r?` · ${esc(r.label)}`:''}</dd><dt>Time</dt><dd>${sc.day} ${E.fmt(sc.time)}</dd>
      <dt>Stops</dt><dd>${sc.targets.map(k=>esc(E.SPACES[k].n)).join(', ')}</dd></dl>
    <button class="nx-btn" type="button" data-nx-act="walk" data-nx-key="walk"${run||walking()?' disabled':''}>${run?'Walking…':w?`Walk ${esc(first)} in again`:`Walk ${esc(first)} in`}</button>`;
  if(w&&!run){const pts=w.pts.filter(p=>p.door||p.transfer||p.arrive),stop=w.res.stop;
    h+=`<h3 class="nx-h3">Walk log · ${E.fmt(sc.time)}</h3><ol class="nx-log">${pts.map(p=>p.transfer?`<li>${esc(p.label)}</li>`:p.arrive?`<li class="nx-log-arr">Arrived: ${esc(E.SPACES[p.arrive].n)}</li>`
      :`<li class="${p.ok?'nx-log-ok':'nx-log-no'}">${esc(E.DOORS[p.door].n)}${p.who?` · ${esc(p.who)}'s badge`:''}: ${p.ok?'opened':'didn\'t open'}</li>`).join('')}</ol>
      <p class="nx-note">${stop?(E.grants(t.world,F.actorOf(sc,t))[stop.door]?'This door is included in the badge\'s permissions. Inspect it to find out why the walk stopped.':'The walk stopped here.'):'Reached every stop on the request.'}</p>`;}
  return h+'</section>';}
/* ---------- Close / Submit / Record: facts only before submitting (no readiness verdict); Flow.grade decides on submit;
   a record only for a finalized result (Flow.finalized), built by Flow.buildRecord; any later change clears both ---------- */
/* display labels for the locked record fields (Flow.buildRecord keeps its own keys) */
const FIELD={Opens:'Doors in permissions',Groups:'Assigned groups'};
const KIND={good:['Closed','nx-res-good'],cost:['Closed with a cost','nx-res-cost'],fix:['Needs correction','nx-res-fix'],notyet:['Not ready','nx-res-notyet']};
const kindOf=r=>r.cls==='good'?'good':r.final?'cost':r.cls==='warnr'?'fix':'notyet';
function closeHTML(id){const sc=S[id],t=st[id],c=t.person.credential,r=F.routeOf(sc,t),w=t.walk,first=sc.person.name.split(' ')[0];
  const reads=Object.keys(t.read||{}).length,facts=[['Request',esc(refOf(sc))]];
  if(sc.disposition){const o=sc.disposition.options.find(o=>o.id===t.disp);facts.push(['Credential',c.active?'Active':'Deactivated'],['Reason recorded',o?esc(o.text):'None chosen']);}
  if(sc.routes)facts.push(['Response',esc(r.label)]);
  if(!sc.disposition||c.groups.length)facts.push(['Assigned groups',c.groups.length?c.groups.map(g=>esc(E.GROUPS[g].n)).join(', '):'None']);
  if(c.exceptions.length)facts.push(['Exceptions',c.exceptions.map(x=>`${esc(x.source)} · ${x.day} ${hrs(x.window)}`).join('; ')]);
  for(const [g,h] of Object.entries(t.world.groupOverrides))facts.push(['Group hours',`${esc(E.GROUPS[g].n)} ${hrs(h)} · all ${E.GROUPS[g].members} badges`]);
  if(sc.verify||sc.goal!=='audit')facts.push(['Walk test',r&&r.wait?'Not applicable on this response':!w?'Not run':w.running?'Running':w.routeId!==(r?r.id:null)?'Run on a different response':w.res.stop?`Stopped at ${esc(E.DOORS[w.res.stop.door]?E.DOORS[w.res.stop.door].n:'a door')}`:`Reached every stop, ${sc.day} ${E.fmt(sc.time)}`]);
  facts.push(['Records read',reads?`${reads} this session`:'None yet']);
  let h=`<section class="nx-card" aria-labelledby="nxCaseH"><h2 id="nxCaseH" class="nx-h">Case summary</h2><dl class="nx-facts">${facts.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>
    <div class="nx-row"><button class="nx-btn" type="button" data-nx-act="submit" data-nx-key="submit">${esc(sc.closeAction||'Close ticket')}</button>
      <button class="nx-btn nx-btn-quiet" type="button" data-nx-act="reset" data-nx-key="reset">Reset ticket</button></div>`;
  if(t.result){const k=kindOf(t.result),[lbl,cls]=KIND[k];
    h+=`<section class="nx-card nx-res ${cls}" id="nxResult" tabindex="-1" aria-labelledby="nxResH"><span class="nx-res-kind">${lbl}</span><h3 id="nxResH">${esc(t.result.title)}</h3><p>${esc(t.result.text)}</p>
      ${t.record&&sc.principle?`<p class="nx-principle">${esc(sc.principle)}</p>`:''}</section>`;
    if(t.record)h+=recordCardHTML(id);}
  return h;}
function recordCardHTML(id){const sc=S[id],t=st[id],r=t.record,art=hasArt(sc,t);
  const head=art?`<div class="nx-rtop"><button class="nx-artthumb" type="button" data-nx-act="art" data-nx-key="art" aria-label="View the ${esc(r.title.toLowerCase())} record artwork">${artHTML(sc,r)}</button>
      <div class="nx-rsum"><span class="nx-rlbl">${esc(r.title)}</span><b class="nx-pill">${esc(r.status)}</b><b>${esc(r.person.name)}</b><span class="nx-note">${esc(r.person.title)} · ${esc(r.person.department)}</span></div></div>`
    :`<span class="nx-rlbl">${esc(r.title)}</span> <b class="nx-pill">${esc(r.status)}</b><div class="nx-who"><img class="nx-av" src="${AVATAR[id]}" alt="" width="44" height="44"><span><b>${esc(r.person.name)}</b> <span>${ROLE[id]}</span></span></div>`;
  const cmp=sc.compare&&t.result.cls==='good'?`<button class="nx-btn nx-btn-quiet" type="button" data-nx-act="compare" data-nx-key="compare">Compare with ${esc(sc.compare.label.replace(/ \(.*\)/,''))}</button>
    ${view[id].compared?`<p class="nx-note" aria-live="polite">${esc(t.lastLabel)} ${t.delta.addedSpaces.map(k=>esc(E.SPACES[k].n)+(E.SPACES[k].l===2&&!/L2/.test(E.SPACES[k].n)?' (L2)':'')).join(', ')}.</p>`:''}`:'';
  return `<section class="nx-card nx-rec-card" data-kind="${r.kind}" aria-labelledby="nxRecordH"><h3 id="nxRecordH" class="nx-h" tabindex="-1">Record details</h3>${head}
    <dl class="nx-facts">${r.fields.map(f=>`<dt>${esc(FIELD[f[0]]||f[0])}</dt><dd>${esc(f[1])}</dd>`).join('')}</dl>${cmp}</section>`;}
/* Elena's approved artwork: fixed art, live record text in measured slots; the scanner moment plays once on issuing */
const ART={issue_v1:{src:'__ART:record_issue_v1.webp__',w:1025,h:1536,sh:35,badge:'__ART:badge_front_v1.webp__',portrait:[688,372,302,364],
  alt:'Credential issuance simulation record, fictional training design. The record details follow as text.',
  slots:[[486,r=>r.person.name],[565,r=>r.person.title],[644,r=>r.person.department],[726,r=>val(r,'Authorization')],[808,r=>val(r,'Groups')],
    [892,r=>val(r,'Opens')],[986,r=>val(r,'Verified')],[1067,r=>'Hours: '+val(r,'Hours')]]}};
const val=(r,k)=>(r.fields.find(f=>f[0]===k)||[])[1]||'';
const hasArt=(sc,t)=>!!(t.record&&sc.recordArt&&ART[sc.recordArt]&&t.result&&t.result.cls==='good');
function artHTML(sc,r){const a=ART[sc.recordArt];
  return `<div class="nx-art"><img src="${a.src}" width="${a.w}" height="${a.h}" alt="${a.alt}"><div aria-hidden="true">${a.slots.map(([y,f])=>{const v=f(r)||'';
    return `<div class="nx-slot${v.length>55?' nx-long':''}" style="top:${(y/a.h*100).toFixed(2)}%;height:${(a.sh/a.h*100).toFixed(2)}%"><span>${esc(v)}</span></div>`;}).join('')}</div></div>`;}
function credHTML(sc,r){const a=ART[sc.recordArt],[px,py,pw,ph]=a.portrait,p=r.person;
  const bg=`background-image:url(${a.src});background-size:${(a.w/pw*100).toFixed(2)}% auto;background-position:${(px/(a.w-pw)*100).toFixed(2)}% ${(py/(a.h-ph)*100).toFixed(2)}%`;
  return `<div class="nx-cbadge"><img src="${a.badge}" alt=""><div class="nx-ph" style="${bg}"></div><div class="nx-f nx-fn">${esc(p.name)}</div><div class="nx-f nx-fr">${esc(p.title)}</div><div class="nx-f nx-fd">${esc(p.department)}</div>${p.credentialType?`<div class="nx-f nx-ft">${esc(p.credentialType.toUpperCase())}</div>`:''}<div class="nx-sline"></div></div>`;}
function focusRecord(){const h=$('nxRecordH');if(h&&document.activeElement!==h){h.scrollIntoView({block:'start'});h.focus({preventScroll:true});}}
function showMoment(sc,r,scan){const d=$('nxMoment');scan=scan&&!RM;
  d.setAttribute('aria-label',`${r.title}: ${r.person.name}`);
  d.innerHTML=`<div class="nx-moment${scan?' nx-scan':''}">${scan?`<div class="nx-scanner" aria-hidden="true"><div class="nx-scap"><span class="nx-s1">Issuing credential · ${esc(r.person.name)}</span><span class="nx-s2">Credential issued</span></div>
      <div class="nx-spad"><div class="nx-well"></div><div class="nx-led"></div>${credHTML(sc,r)}</div>
      <div class="nx-schip">Assigned groups · ${esc(val(r,'Groups').split(', ').join(' + '))}</div></div><button class="nx-btn nx-sskip" type="button" id="nxSkip">Skip ›</button>`:''}
    <div class="nx-recview"${scan?' inert':''}>${artHTML(sc,r)}<button class="nx-btn" type="button" id="nxMomentOk">See record details</button></div></div>`;
  const m=d.firstElementChild,timers=[];
  const finish=()=>{if(!m.classList.contains('nx-scan'))return;timers.forEach(clearTimeout);m.classList.remove('nx-scan');m.querySelector('.nx-recview').inert=false;$('nxMomentOk').focus();};
  const out=()=>{d.close();focusRecord();};
  d.onclick=e=>{if(m.classList.contains('nx-scan'))finish();else if(e.target===d)out();};
  d.oncancel=e=>{e.preventDefault();m.classList.contains('nx-scan')?finish():out();};
  d.onclose=focusRecord;$('nxMomentOk').onclick=e=>{e.stopPropagation();out();};
  d.showModal();
  if(scan){timers.push(setTimeout(()=>m.classList.add('nx-mlit'),1000),setTimeout(finish,1400));$('nxSkip').focus();}else $('nxMomentOk').focus();}
function submit(){const id=route.id,sc=S[id],t=st[id];t.result=F.grade(sc,t);t.record=F.finalized(t)?F.buildRecord(sc,t):null;view[id].compared=false;render();
  const k=kindOf(t.result);announce(`${KIND[k][0]}: ${t.result.title}. ${t.result.text}`);
  if(hasArt(sc,t))showMoment(sc,t.record,true);else{const r=$('nxResult');r&&r.focus({preventScroll:false});}
  if(ORDER.every(x=>F.finalized(st[x])))setTimeout(()=>announce('All four tickets are closed. The shift summary is in the inbox.'),1200);}
function compareTemplate(){const id=route.id,sc=S[id],t=st[id],tp=E.clone(t.person);tp.credential.groups=[...sc.compare.groups];tp.credential.exceptions=[];
  t.delta=E.delta(E.footprint(t.world,t.person),E.footprint(t.world,tp));t.tdelta=null;t.still=null;t.showDelta=true;view[id].compared=true;
  t.lastLabel=`Comparison only, the badge is unchanged: ${sc.compare.label} would also grant`;render();}
function announce(t){const l=$('nxLive');l.textContent='';setTimeout(()=>l.textContent=t,30);}

/* ---------- map region: one element, column on wide screens, full-screen dialog otherwise ---------- */
const mapRegion=document.createElement('section');mapRegion.className='nx-map';const inMap=sel=>mapRegion.querySelector(sel);
const sw=(fill,extra='')=>`<svg class="nx-sw" viewBox="0 0 16 16" aria-hidden="true">${fill}${extra}</svg>`;
mapRegion.innerHTML=`<div class="nx-map-bar"><h2 id="nxMapH" tabindex="-1">Facility map</h2><button class="nx-close" type="button" id="nxMapClose" data-nx-key="mapclose">Close map</button></div>
  <div class="nx-map-ctl"><div class="nx-seg" role="group" aria-label="Level"><button type="button" id="nxLv1" data-nx-key="lv1" data-nx-level="1">L1 <span>Gallery</span></button><button type="button" id="nxLv2" data-nx-key="lv2" data-nx-level="2">L2 <span>Topside</span></button></div>
    <button class="nx-tool" type="button" id="nxInspect" data-nx-key="inspect" aria-pressed="false"><svg class="nx-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 10.5m-6.5 0a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0 M15.5 15.5L21 21"/></svg>Inspect</button>
    <span class="nx-clock" id="nxClock"></span></div>
  <div class="nx-pick" id="nxPickWrap" hidden><label for="nxDoorPick">Inspect a door</label><select id="nxDoorPick" data-nx-key="doorpick"></select></div>
  <div class="nx-zoom" id="nxZoomWrap" hidden><button type="button" class="nx-tool" id="nxZoom" data-nx-key="zoom">Zoom in</button></div>
  <div class="nx-pick" id="nxFindWrap" hidden><label for="nxFind">Find on the map</label><select id="nxFind" data-nx-key="find"></select></div>
  <figure class="nx-map-fig"><svg class="nx-map-svg" id="nxMapSvg" viewBox="0 0 400 300" role="img" aria-labelledby="nxMapCap"></svg>
    <p class="nx-ident" id="nxIdent" hidden></p>
    <p class="nx-walknote" id="nxWalkNote"></p><figcaption class="nx-map-cap" id="nxMapCap"></figcaption></figure>
  <section class="nx-insp" id="nxInsp" aria-labelledby="nxInspH" hidden></section>
  <ul class="nx-legend" aria-label="Map key">
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/>')}Area in the granted footprint</li>
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/><circle cx="5" cy="8" r="1.4" fill="#0b2a39"/><circle cx="11" cy="8" r="1.4" fill="#0b2a39"/>')}Public gallery</li>
    <li>${sw('<rect x="1" y="3" width="14" height="10" rx="2" fill="#a4ead0"/><path d="M3 13l6-10M8 13l6-10" stroke="#0b2a39" stroke-width="1.5"/>')}Restricted area</li>
    <li>${sw('<circle cx="8" cy="8" r="5" fill="#a4ead0" stroke="#a9cfd6"/>')}Door included in badge permissions</li>
    <li>${sw('<circle cx="8" cy="8" r="5" fill="#0b2a39" stroke="#a9cfd6" stroke-width="1.3"/>')}Door with a reader, not in badge permissions</li></ul>`;
/* Cutaway map (flag off by default, see NxMap.cutawayOn). Three stacked drawings share one canvas: the painted level; the
   other level's picture, shown only through the lens circle; and the overlay, which is the only one redrawn as the lens or
   the walk moves, so the pictures are never re-parsed. State (lens point, selection, walk points) stays in plan units. */
const cutScale=svg=>{const w=svg.getBoundingClientRect().width;return w>0?w/camView().w:0.62;};
/* Step 4 zoom: only in Inspect, Whole building or 2x. The camera is a part of the canvas (view state, never on the ticket) and
   follows the lens, so moving the lens (drag, tap, arrow keys, the door list) is how a zoomed view pans: no pan or pinch
   gesture. Inspect off, the walk and "Whole building" show the full canvas with its margins. */
const camV=()=>route.screen==='ticket'?view[route.id]:null;
const camZoom=()=>{const v=camV();return v&&v.inspect&&!walking()?(v.zoom||1):1;};
function camView(){const c=NxMap.cutaway.canvas(),z=camZoom(),v=camV();if(z===1)return {x:c.x,y:c.y,w:c.w,h:c.h,z:1};
  const w=c.w/z,h=c.h/z,cam=v.cam||[c.x+c.w/2,c.y+c.h/2],cl=(a,lo,hi)=>Math.max(lo,Math.min(hi,a));
  return {x:cl(cam[0]-w/2,c.x,c.x+c.w-w),y:cl(cam[1]-h/2,c.y,c.y+c.h-h),w,h,z};}
/* zoomed, the lens is at most 112 px across on screen; at 1x it is the Step 3 lens */
const lensR=sc=>camZoom()>1?Math.min(NxMap.cutaway.LENS_R,56/sc):NxMap.cutaway.LENS_R;
function camFollow(center){const v=camV();if(!v||!v.lensP||camZoom()===1)return;const [X,Y]=NxMap.cutaway.cpos(...v.lensP);
  if(center){v.cam=[X,Y];return;}
  const vb=camView(),sc=cutScale(svgEl),R=lensR(sc),pl=R+4/sc,pb=R+20/sc;let cx=vb.x+vb.w/2,cy=vb.y+vb.h/2;
  if(X-pl<vb.x)cx-=vb.x-(X-pl);if(X+pl>vb.x+vb.w)cx+=X+pl-(vb.x+vb.w);if(Y-pl<vb.y)cy-=vb.y-(Y-pl);if(Y+pb>vb.y+vb.h)cy+=Y+pb-(vb.y+vb.h);v.cam=[cx,cy];}
/* Step 4 identify: what a tap or the Find list names, kept in view state (per ticket, or the inbox map's own) */
let inboxIdent=null;
const identGet=()=>route.screen==='ticket'?view[route.id].ident||null:inboxIdent;
const identSet=it=>{if(route.screen==='ticket')view[route.id].ident=it;else inboxIdent=it;};
const identHTML=(d,btn)=>`<b>${esc(d.name)}</b>${esc(d.after)}${d.rest.map(r=>' · '+esc(r)).join('')}${btn?' <button type="button" class="nx-linkbtn" data-nx-act="identinspect" data-nx-key="identinspect">Inspect this door</button>':''}`;
function findOptions(){const C=NxMap.cutaway,G=[['room','Rooms'],['door','Doors'],['passage','Open passages'],['core','Stairs'],['void','Open to the level below']];
  return '<option value="">Choose a place…</option>'+[1,2].map(L=>G.map(([ty,lab])=>{const its=C.targets(L).filter(i=>i.type===ty);if(!its.length)return '';
    return `<optgroup label="Level ${L} · ${lab}">${its.map(i=>{const d=C.describe(i),txt=ty==='passage'?'Between'+d.after.replace(/^ between/,''):ty==='void'?`Above the ${C.below(E.VOIDS[i.id])}`:d.name;
      return `<option value="${i.type}|${i.id}|${L}">${esc(txt)}</option>`;}).join('')}</optgroup>`;}).join('')).join('');}
function cutawayDraw(svg,t,l,o){const C=NxMap.cutaway,f=C.frame(l),c=C.canvas(),fig=svg.parentNode,mk=cls=>{const e=document.createElementNS('http://www.w3.org/2000/svg','svg');e.setAttribute('class',cls);e.setAttribute('aria-hidden','true');e.setAttribute('viewBox',f.viewBox);e.style.aspectRatio=f.ratio;fig.insertBefore(e,svg);return e;};
  let base=fig.querySelector('.nx-map-base'),li=fig.querySelector('.nx-map-lensimg');
  if(!base){base=mk('nx-map-base');li=mk('nx-map-lensimg');fig.classList.add('nx-map-cut');svg.setAttribute('viewBox',f.viewBox);svg.style.aspectRatio=f.ratio;svg.dataset.nxFrame='cutaway';}
  if(base.dataset.nxLevel!==String(l)){base.innerHTML=f.base;base.dataset.nxLevel=String(l);li.innerHTML=C.frame(l===1?2:1).image;li.dataset.nxLevel=String(l===1?2:1);}
  const vb=camView(),vbs=`${vb.x} ${vb.y} ${vb.w} ${vb.h}`;for(const e of [base,li,svg])if(e.getAttribute('viewBox')!==vbs)e.setAttribute('viewBox',vbs);
  const sc=cutScale(svg),R=lensR(sc);fig.dataset.nxZoom=String(vb.z);
  if(o.lens){const [x,y]=C.cpos(...o.lens);li.style.display='';li.style.clipPath=`circle(${R*sc}px at ${(x-vb.x)*sc}px ${(y-vb.y)*sc}px)`;}else li.style.display='none';
  svg.innerHTML=C.overlay(t,l,getComputedStyle(document.body).fontFamily,{...o,view:vb,lensR:R},sc);}
addEventListener('resize',()=>{if(NxMap.cutawayOn())renderMap();});
/* the cutaway sizes markers, hit areas, labels and patterns in screen pixels, so redraw whenever the drawing's width changes
   (the phone map dialog opening, a scrollbar appearing), not only on window resize */
let cutW=0;const cutRO=typeof ResizeObserver==='function'?new ResizeObserver(es=>{const w=Math.round(es[0].contentRect.width);if(w>0&&w!==cutW&&NxMap.cutawayOn()){cutW=w;renderMap();}}):null;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const list=a=>a.length?a.join(', '):'none';
/* the map shows the open ticket's badge (granted only) at that ticket's level; in the inbox, the plain floor plan */
function renderMap(){const id=route.screen==='ticket'?route.id:null,t=id?st[id]:null,sc=id?S[id]:null,l=id?view[id].level:inboxLevel,v=id?view[id]:null,ins=!!(v&&v.inspect),run=walking();
  const w=t&&t.walk,svg=inMap('#nxMapSvg');
  const cut=NxMap.cutawayOn(),g0=cut&&!ins&&!run?identGet():null,mo={lens:ins?v.lensP:null,sel:ins&&t?t.sel:null,walk:w,initials:sc?sc.person.initials:'',ident:g0&&g0.l===l?g0:null};
  if(NxMap.cutawayOn())cutawayDraw(svg,t,l,mo);else svg.innerHTML=NxMap.svg(t,l,getComputedStyle(document.body).fontFamily,mo);
  mapRegion.classList.toggle('nx-inspecting',ins);
  /* inspecting: the drawing becomes a keyboard-operable lens; otherwise it is an image named by its caption */
  if(ins){svg.setAttribute('role','application');svg.setAttribute('tabindex','0');svg.removeAttribute('aria-labelledby');svg.setAttribute('aria-label','Inspection lens on the facility map. Arrow keys move the lens; drag or tap to select a door or room. Evidence appears below the map.');svg.style.touchAction='none';}
  else{svg.setAttribute('role','img');svg.removeAttribute('tabindex');svg.removeAttribute('aria-label');svg.setAttribute('aria-labelledby','nxMapCap');svg.style.touchAction='';}
  const ib=inMap('#nxInspect');ib.setAttribute('aria-pressed',ins);ib.disabled=!id||run;
  inMap('#nxLv1').disabled=inMap('#nxLv2').disabled=run;
  const pw=inMap('#nxPickWrap'),pk=inMap('#nxDoorPick');pw.hidden=!ins;
  {const zw=inMap('#nxZoomWrap'),on=cut&&ins&&!run;zw.hidden=!on;if(on)inMap('#nxZoom').textContent=(v.zoom||1)===2?'Whole building':'Zoom in';}
  {const fw=inMap('#nxFindWrap'),fs=inMap('#nxFind');fw.hidden=!cut||ins;fs.disabled=run;if(cut&&!fs.options.length)fs.innerHTML=findOptions();
    if(cut){const g=identGet();fs.value=g&&!ins&&!run?`${g.type}|${g.id}|${g.l}`:'';}}
  {const il=inMap('#nxIdent');let it=null,btn=false;
    if(cut&&!run){if(ins&&t&&t.sel)it=t.sel.door?{type:'door',id:t.sel.door}:{type:E.SPACES[t.sel.space].kind==='core'?'core':'room',id:t.sel.space};else if(mo.ident){it=mo.ident;btn=it.type==='door'&&!!id;}}
    il.hidden=!it;il.innerHTML=it?identHTML(NxMap.cutaway.describe(it),btn):'';}
  if(ins){const cur=t.sel&&t.sel.door?t.sel.door:'';pk.innerHTML=`<option value="">Choose a door…</option>`+[1,2].map(L=>`<optgroup label="Level ${L}">${Object.entries(E.DOORS).filter(([d])=>E.doorLevel(d)===L).map(([d,o])=>`<option value="${d}"${d===cur?' selected':''}>${esc(o.n)}</option>`).join('')}</optgroup>`).join('');}
  const wn=inMap('#nxWalkNote');wn.className='nx-walknote'+(w&&!w.running?(w.res.stop?' nx-walknote-stop':' nx-walknote-ok'):'');
  wn.textContent=!w?'':w.running?`Walking ${sc.person.name.split(' ')[0]} in…`:w.res.stop?`Walk stopped at ${E.DOORS[w.res.stop.door]?E.DOORS[w.res.stop.door].n:'a door'}.`:'Walk complete: reached every stop.';
  const ip=inMap('#nxInsp');ip.hidden=!ins;if(ins)ip.innerHTML=inspectHTML(id);
  const l2=t&&NxMap.litOn(t,2);
  inMap('#nxLv1').setAttribute('aria-pressed',l===1);inMap('#nxLv2').setAttribute('aria-pressed',l===2);
  inMap('#nxLv1').setAttribute('aria-label','Level 1, Gallery');inMap('#nxLv2').setAttribute('aria-label',`Level 2, Topside${l2?', has areas in the granted footprint':''}`);
  inMap('#nxLv2').classList.toggle('nx-lit',!!l2&&l!==2);
  inMap('#nxClock').textContent=sc?`${sc.day} ${MONTHS[+sc.date.slice(5,7)-1]} ${+sc.date.slice(8)} · ${E.fmt(sc.time)}`:'';
  const s=NxMap.summary(t);
  inMap('#nxMapCap').textContent=t?`Showing level ${l}. ${sc.person.name}'s badge grants access to ${s.doors.length} door${s.doors.length===1?'':'s'}: ${list(s.doors)}. Areas in the granted footprint, level 1: ${list(s.l1)}; level 2: ${list(s.l2)}.`
    :`Showing level ${l}. Open a ticket to see that badge's permissions.`;}
mapRegion.addEventListener('click',e=>{const b=e.target.closest('[data-nx-level]');if(!b||walking())return;const l=+b.dataset.nxLevel;
  if(route.screen==='ticket')view[route.id].level=l;else inboxLevel=l;const g=identGet();if(g&&g.l!==l)identSet(null);renderMap();announce(`Level ${l}`);});
mapRegion.addEventListener('click',e=>{if(!e.target.closest('#nxInspect')||route.screen!=='ticket'||walking())return;const v=view[route.id];v.inspect=!v.inspect;v.ident=null;if(!v.inspect)v.zoom=1;
  renderMap();announce(v.inspect?'Inspect on. Drag or tap the map, or choose a door from the list.':'Inspect off');});
mapRegion.addEventListener('click',e=>{if(e.target.closest('[data-nx-act="flag"]')){const t=st[route.id];t.flagged=!t.flagged;render();}});
/* Step 4: the zoom toggle (Inspect only) */
mapRegion.addEventListener('click',e=>{if(!e.target.closest('#nxZoom')||route.screen!=='ticket'||walking())return;const v=view[route.id],nz=(v.zoom||1)===2?1:2,cv=camView();
  v.zoom=nz;v.cam=v.lensP?NxMap.cutaway.cpos(...v.lensP):[cv.x+cv.w/2,cv.y+cv.h/2];renderMap();announce(nz===1?'Showing the whole building':'Zoomed in, 2 times');});
/* Step 4: Find on the map, the equivalent of every tap target (switches level if needed, then names the thing; focus stays) */
mapRegion.addEventListener('change',e=>{if(e.target.id!=='nxFind'||!e.target.value||walking())return;const [type,iid,L]=e.target.value.split('|'),l=+L,cur=route.screen==='ticket'?view[route.id].level:inboxLevel,sw=l!==cur;
  if(sw){if(route.screen==='ticket')view[route.id].level=l;else inboxLevel=l;}
  const it={type,id:iid,l},d=NxMap.cutaway.describe(it);identSet(it);renderMap();
  /* switching level: say the level once, first, and drop it from the end of the line */
  announce(sw?`Level ${l}. `+NxMap.cutaway.plain({...d,rest:d.rest.filter(r=>r!==`Level ${l}`)}):NxMap.cutaway.plain(d));});
/* Step 4: "Inspect this door" on an identified door: Inspect on, lens on that door, as choosing it from the door list */
mapRegion.addEventListener('click',e=>{if(!e.target.closest('[data-nx-act="identinspect"]')||route.screen!=='ticket'||walking())return;const id=route.id,v=view[id],g=v.ident;if(!g||g.type!=='door')return;
  v.inspect=true;v.ident=null;st[id].sel={door:g.id};v.level=E.doorLevel(g.id);v.lensP=[...E.DOORS[g.id].p];camFollow(true);render();inMap('#nxDoorPick').focus();announce(`Inspect on. Inspecting ${E.DOORS[g.id].n}`);});
/* the door list is the accessible alternative to the lens: every door reachable by touch or keyboard without reading the map */
mapRegion.addEventListener('change',e=>{if(e.target.id!=='nxDoorPick'||!e.target.value)return;const id=route.id,d=e.target.value,v=view[id];
  st[id].sel={door:d};v.level=E.doorLevel(d);v.lensP=[...E.DOORS[d].p];if(NxMap.cutawayOn())camFollow(true);render();announce(`Inspecting ${E.DOORS[d].n}`);
  /* chosen by name: bring the evidence into view (the map stays one scroll up) */
  inMap('#nxInsp').scrollIntoView({block:'nearest'});});
const svgEl=inMap('#nxMapSvg');let dragging=false;if(cutRO)cutRO.observe(svgEl);
const svgPt=e=>{const p=svgEl.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=svgEl.getScreenCTM(),q=m?p.matrixTransform(m.inverse()):{x:0,y:0};
  if(!NxMap.cutawayOn())return q;const [x,y]=NxMap.cutaway.cplan(q.x,q.y);return {x,y};};   /* always plan units */
/* the lens may centre on any point of the plan, edge doors included (the circle is clipped by the map frame) */
const clampL=(x,y)=>[Math.max(0,Math.min(400,x)),Math.max(0,Math.min(300,y))];
/* the lens is the selector: a door under it (this level first, then the level seen through it), else a room on a tap */
function lensAt(x,y,tap){const id=route.id,v=view[id],t=st[id];v.lensP=clampL(x,y);const l=v.level,cut=NxMap.cutawayOn(),sc=cut?cutScale(svgEl):0,[X,Y]=cut?NxMap.cutaway.cpos(x,y):[0,0],
    s=cut?NxMap.cutaway.pick(X,Y,l,sc):NxMap.pick(x,y,l),s2=cut?NxMap.cutaway.pick(X,Y,l===1?2:1,sc):NxMap.pick(x,y,l===1?2:1);
  const n=cut?NxMap.cutaway.inspectPick(X,Y,l,sc,tap):(s&&s.door)?s:(s2&&s2.door)?s2:tap?(s||s2):null;if(n)t.sel=n;if(cut)camFollow(false);}
svgEl.addEventListener('pointerdown',e=>{const v=route.screen==='ticket'&&view[route.id];if(!v||!v.inspect||walking())return;dragging=true;try{svgEl.setPointerCapture(e.pointerId);}catch(_){}
  const p=svgPt(e);lensAt(p.x,p.y,true);renderMap();});
svgEl.addEventListener('pointermove',e=>{if(!dragging)return;const p=svgPt(e);lensAt(p.x,p.y,false);renderMap();});
const endDrag=()=>{if(!dragging)return;dragging=false;render();const t=st[route.id];if(t.sel)announce(`Inspecting ${t.sel.door?E.DOORS[t.sel.door].n:E.SPACES[t.sel.space].n}`);};
/* Step 4 identify: with Inspect off, a tap names what is under it. Nothing is stored on the ticket; no lens, no evidence. */
svgEl.addEventListener('click',e=>{if(!NxMap.cutawayOn()||walking())return;const v=route.screen==='ticket'?view[route.id]:null;if(v&&v.inspect)return;
  const p=svgPt(e),C=NxMap.cutaway,[X,Y]=C.cpos(p.x,p.y),it=C.identify(X,Y,v?v.level:inboxLevel,cutScale(svgEl));
  if(it&&(it.type==='room'||it.type==='core'))it.at=[X,Y];identSet(it);renderMap();if(it)announce(C.plain(C.describe(it)));});
svgEl.addEventListener('pointerup',endDrag);svgEl.addEventListener('pointercancel',endDrag);
svgEl.addEventListener('keydown',e=>{const v=route.screen==='ticket'&&view[route.id];if(!v||!v.inspect)return;const k={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(!k)return;
  e.preventDefault();const t=st[route.id],before=JSON.stringify(t.sel);lensAt(v.lensP[0]+k[0],v.lensP[1]+k[1],true);render();if(JSON.stringify(t.sel)!==before&&t.sel)announce(`Inspecting ${t.sel.door?E.DOORS[t.sel.door].n:E.SPACES[t.sel.space].n}`);});
/* inspection evidence (V1): the only place a denial cause appears */
function inspectHTML(id){const sc=S[id],t=st[id],sel=t.sel;
  let h=`<h3 id="nxInspH" class="nx-h">Inspection</h3>`;
  if(!sel)return h+`<p class="nx-note">Drag the lens, tap a door or room, or choose a door from the list. Evidence for that spot appears here.</p>`;
  if(sel.door){const rt=F.routeOf(sc,t),escort=rt&&rt.as==='escort'?sc.escort:null,d=E.DOORS[sel.door],r=E.canEnter(t.world,t.person,sel.door,sc.time),g=r.grants||E.grants(t.world,t.person)[sel.door]||[],re=escort?E.canEnter(t.world,escort,sel.door,sc.time):null;
    const from=E.SPACES[d.from]?E.SPACES[d.from].n:E.OUTSIDE[d.from].n.replace('Outside · ','Outside, ');
    const covering=t.person.authorizations.filter(a=>a.doors.includes(sel.door)),covered=covering.filter(a=>E.authActive(t.world,a)),ended=covering.filter(a=>a.status==='approved'&&!E.authActive(t.world,a));
    const req=Object.entries(E.GROUPS).filter(([k,G])=>G.doors.includes(sel.door)).map(([k,G])=>`${esc(G.n)} ${hrs(E.groupHours(t.world,k))}`);
    const WHY={OK:'<span class="nx-ok">Opens</span>',NO_GRANT:'<span class="nx-bad">Denied · badge has no group for this door</span>',OUTSIDE_SCHEDULE:'<span class="nx-bad">Denied · outside every schedule on this badge</span>',HARDWARE_FAULT:'<span class="nx-bad">Denied · reader fault</span>',CREDENTIAL_INACTIVE:'<span class="nx-bad">Denied · credential inactive</span>'};
    const fault=t.world.doorStatus[sel.door]==='fault';
    h+=`<h4 class="nx-ev-h">${esc(d.n)}</h4><dl class="nx-ev">
      <dt>Reader</dt><dd>${fault?'<span class="nx-bad">Fault</span>':'Online'} · ${sel.door}${fault&&sc.faultNotes&&sc.faultNotes[sel.door]?`<br>${esc(sc.faultNotes[sel.door])}`:''}</dd>
      <dt>Entry</dt><dd>${esc(from)} → ${esc(E.SPACES[d.into].n)}</dd>
      <dt>Groups</dt><dd>${req.join('<br>')||'None'}</dd>
      <dt>This badge</dt><dd>${g.length?g.map(x=>`${esc(x.via)} · ${x.day?x.day+' ':''}${hrs(x.window)}${x.inherited?`<br><span class="nx-warn">Inherited: ${esc(x.inherited)}</span>`:''}`).join('<br>'):'<span class="nx-muted">Not granted</span>'}</dd>
      <dt>${sc.day} ${E.fmt(sc.time)}</dt><dd>${WHY[r.code]}</dd>
      ${escort?`<dt>${esc(escort.name.split(' ')[0])} (escort)</dt><dd>${WHY[re.code]}</dd>`:''}
      <dt>Records</dt><dd>${sc.hideVerdict?(covering.length?covering.map(a=>`${esc(a.id)} · ${E.authActive(t.world,a)?'active':'ended '+a.ends}`).join('<br>'):'<span class="nx-muted">None</span>')
        :(covered.length?covered.map(a=>esc(a.id)).join(', '):g.length?'<span class="nx-warn">No active record covers this door</span>':'<span class="nx-muted">None</span>')+ended.map(a=>`<br><span class="nx-muted">${esc(a.id)} ended ${a.ends}</span>`).join('')}</dd></dl>`;
    if(g.some(x=>x.inherited))h+=`<button class="nx-btn nx-btn-quiet" type="button" data-nx-act="flag" data-nx-key="flag" aria-pressed="${t.flagged}">${t.flagged?'Template flagged for review':'Flag template for review'}</button>`;}
  else{const s=E.SPACES[sel.space],fp=E.footprint(t.world,t.person),[x,y]=sel.pt;
    const reach=from=>{const seen=new Set([from]),q=[from];while(q.length){const a=q.shift();for(const [p,r] of E.LINKS){const n=p===a?r:r===a?p:null;if(n&&!seen.has(n)){seen.add(n);q.push(n);}}}return seen;};
    const doorsIn=Object.values(E.DOORS).filter(o=>o.into===sel.space).map(o=>o.n),links=E.LINKS.filter(k=>k[0]===sel.space||k[1]===sel.space).map(k=>E.SPACES[k[0]===sel.space?k[1]:k[0]].n);
    const via=[...fp.doors].filter(d=>reach(E.DOORS[d].into).has(sel.space)).map(d=>E.DOORS[d].n);
    const other=Object.entries(E.SPACES).filter(([k,o])=>o.l!==s.l&&o.r.some(r=>x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3])).map(([k,o])=>o.n);
    const vd=s.l===1?E.VOIDS.find(v=>x>=v.r[0]&&x<=v.r[0]+v.r[2]&&y>=v.r[1]&&y<=v.r[1]+v.r[3]):null;
    h+=`<h4 class="nx-ev-h">${esc(s.n)}</h4><dl class="nx-ev"><dt>Level</dt><dd>L${s.l} · ${s.kind}</dd>
      <dt>${s.l===1?'Above':'Below'}</dt><dd>${esc(other.join(', ')||(vd?vd.n.replace('Open to','Open volume over'):'Nothing'))}</dd>
      <dt>Entry</dt><dd>${doorsIn.length?`Reader: ${esc(doorsIn.join(', '))}`:'No reader of its own'}${links.length?`<br>Open passage to ${esc(links.join(', '))}`:''}</dd>
      <dt>Badge</dt><dd>${fp.spaces.has(sel.space)?`<span class="nx-ok">In the granted footprint</span>, through ${esc(via.join(', '))}${doorsIn.some(n=>via.includes(n))?'':' and open passages'}`:'<span class="nx-muted">Outside the granted footprint</span>: no granted door leads here'}</dd></dl>`;}
  return h;}
function placeMap(){const dlg=$('nxMapDlg');
  /* wide screens: Verify hosts the same map region large inside its workspace; every other stage keeps the map column */
  const big=$('nxBigMap');$('nxApp').dataset.bigmap=isWide()&&big?'1':'';
  if(isWide()){if(dlg.open)dlg.close();const host=big||$('nxMapCol');if(mapRegion.parentNode!==host)host.appendChild(mapRegion);inMap('#nxMapClose').hidden=true;return;}
  inMap('#nxMapClose').hidden=false;
  if(mapRegion.parentNode!==dlg)dlg.appendChild(mapRegion);/* always in the document: inside the closed dialog when not shown */
  if(route.map){if(!dlg.open){dlg.showModal();inMap('#nxMapH').focus();}}
  /* re-renders can replace the element that opened the map: return focus by its data-nx-key first */
  else if(dlg.open){dlg.close();const k=invokerKey&&document.querySelector(`[data-nx-key="${invokerKey}"]`),t=k||(invoker&&document.contains(invoker)?invoker:$('nxMapBtn'));t.focus({preventScroll:true});}}
$('nxMapDlg').addEventListener('cancel',e=>{e.preventDefault();closeMap();});
mapRegion.addEventListener('click',e=>{if(e.target.closest('#nxMapClose'))closeMap();});
matchMedia('(min-width:1180px)').addEventListener('change',()=>render());

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
$('nxGuard').addEventListener('click',e=>{if(e.target.id==='nxGuardGo')guardContinue();else if(e.target.id==='nxGuardStop')guardCancel();});
$('nxGuard').addEventListener('cancel',e=>{e.preventDefault();guardContinue();});
document.addEventListener('click',e=>{const a=e.target.closest('[data-nx-open],[data-nx-step],[data-nx-next],[data-nx-act],[data-nx-rec]');if(!a)return;
  if(a.dataset.nxOpen){e.preventDefault();const id=a.dataset.nxOpen;guard(()=>go({screen:'ticket',id,stage:stageOf(id).key,map:false}));}
  else if(a.dataset.nxStep){const k=a.dataset.nxStep;guard(()=>go({...route,stage:k},{replace:true}));}
  /* Next starts the learner at the top of the new stage: focus its heading, bring the tracker into view (chevrons keep focus) */
  else if(a.dataset.nxNext){const k=a.dataset.nxNext;guard(()=>{go({...route,stage:k},{replace:true});const h=document.querySelector('.nx-instr h2');
    document.querySelector('.nx-tracker').scrollIntoView({block:'start'});h.focus({preventScroll:true});});}
  /* reading a record is a domain action (as in V1): it is recorded on the ticket and counts toward Review/Investigate */
  else if(a.dataset.nxRec){const t=st[route.id],k=a.dataset.nxRec;t.open[k]=!t.open[k];if(t.open[k])t.read[k]=true;render();}
  else if(a.dataset.nxAct==='inbox'){e.preventDefault();backToInbox();}
  else if(a.dataset.nxAct==='brief')openBrief();
  else if(a.dataset.nxAct==='map')openMap();
  else if(a.dataset.nxAct==='walk')startWalk();
  else if(a.dataset.nxAct==='submit')guard(submit);
  else if(a.dataset.nxAct==='reset')guard(()=>{st[route.id]=fresh(route.id);view[route.id].compared=false;render();announce('Ticket reset');});
  else if(a.dataset.nxAct==='art'){const id=route.id;showMoment(S[id],st[id].record,false);}
  else if(a.dataset.nxAct==='compare')compareTemplate();
  else if(a.dataset.nxAct==='perms'){view[route.id].perms=a.getAttribute('aria-expanded')!=='true';render();}
  else if(a.dataset.nxAct==='delta'){const t=st[route.id];t.showDelta=!t.showDelta;render();}});
/* arrow keys move between the four stages; Enter or Space selects */
document.addEventListener('keydown',e=>{const b=e.target.closest&&e.target.closest('.nx-step');if(!b)return;
  const all=[...document.querySelectorAll('.nx-step')],i=all.indexOf(b),j={ArrowLeft:i-1,ArrowRight:i+1,Home:0,End:all.length-1}[e.key];
  if(j==null||j<0||j>=all.length)return;e.preventDefault();all[j].focus();});
addEventListener('popstate',onRoute);addEventListener('hashchange',()=>{if(hashOf(parse(location.hash))!==hashOf(route))onRoute();});
/* read-only hook for the browser tests: evaluation results must not change with navigation */
window.__nx={record:id=>st[id].record&&JSON.parse(JSON.stringify(st[id].record)),result:id=>st[id].result&&JSON.parse(JSON.stringify(st[id].result)),state:id=>JSON.parse(JSON.stringify({credential:st[id].person.credential,overrides:st[id].world.groupOverrides,route:st[id].route,disp:st[id].disp,delta:st[id].delta,sel:st[id].sel,
    walk:st[id].walk&&{running:st[id].walk.running,stop:st[id].walk.res.stop,i:st[id].walk.i,n:st[id].walk.pts.length}})),verified:id=>F.verified(S[id],st[id]),grade:id=>F.grade(S[id],st[id]),steps:id=>F.steps(S[id],st[id]),status:id=>F.status(S[id],st[id]),view:()=>JSON.parse(JSON.stringify({route,view})),
  footprint:id=>{const f=E.footprint(st[id].world,st[id].person);return{doors:[...f.doors].sort(),spaces:[...f.spaces].sort()};}};
history.replaceState({nx:true,from:null},'',location.hash||'#/inbox');onRoute();
})();

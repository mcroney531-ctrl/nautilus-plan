/* Nautilus workflow logic, shared by the V1 and V2 interfaces: pure functions of (scenario, ticket state).
   Grading, workflow landmarks, walk construction and outcome records. No DOM, no view state.
   Extracted unchanged from src/ui.html (Phase 01a); test/flow.test.js holds it to the recorded baseline. */
const Flow = (() => {
const E = typeof Engine !== 'undefined' ? Engine : require('./engine.js');
const routeOf=(sc,t)=>{const r=sc.routes;return r?(r.find(x=>x.id===t.route)||r[0]):null;};
const actorOf=(sc,t)=>{const r=routeOf(sc,t);return r&&r.as==='escort'?sc.escort:t.person;};
const center=id=>{const s=E.SPACES[id];if(s.ellipse)return[s.ellipse[0],s.ellipse[1]];const r=s.r[0];return[r[0]+r[2]/2,r[1]+r[3]/2];};
const outP=id=>E.OUTSIDE[id].p;
const finalized=t=>!!(t.result&&(t.result.cls==='good'||t.result.final));
const verified=(sc,t)=>{const r=routeOf(sc,t);return !!(t.walk&&!t.walk.running&&!t.walk.res.stop&&t.walk.routeId===(r?r.id:null));};
/* workflow landmarks (indicators, not gates) */
function steps(sc,t){const g=sc.goal||'reach',r=routeOf(sc,t),c=t.person.credential;
  const seen=!!(t.delta||t.disp||t.walk||t.sel||Object.values(t.open).some(Boolean)||(sc.routes&&t.route!==sc.routes[0].id)),closed=finalized(t);
  if(g==='audit')return[['review','Review',seen],['investigate','Investigate',!!t.sel||Object.values(t.open).some(Boolean)],['decide','Decide',!!t.disp&&!c.active],['close','Submit',closed]];
  if(g==='adapt')return[['review','Review',seen],['respond','Respond',!!(sc.routes&&t.route!==sc.routes[0].id)],['verify',r&&r.wait?'Verify (n/a)':'Verify',verified(sc,t)||!!(r&&r.wait)],['close','Record',closed]];
  return[['review','Review',seen],['configure','Configure',!!t.delta],['verify','Verify',verified(sc,t)],['close','Close',closed]];}
/* walk: the evaluator's result plus the points the map animates through */
function buildWalk(sc,t){const r=routeOf(sc,t),actor=actorOf(sc,t),from=(r&&r.start)||sc.start,who=r&&r.as==='escort'?sc.escort.name.split(' ')[0]:null,res=E.walk(t.world,actor,from,sc.targets,sc.time);
  const pts=[{x:outP(sc.start)[0],y:outP(sc.start)[1],l:1}];
  if(from!==sc.start){const a=outP(sc.start),b=outP(from);pts.push({x:a[0],y:298,l:1},{x:b[0],y:298,l:1,transfer:true,label:`${E.OUTSIDE[sc.start].n.replace('Outside · ','')} to ${E.OUTSIDE[from].n.replace('Outside · ','')}, outside the building`});}
  for(const s of res.steps){const l=s.door?E.doorLevel(s.door):s.p?E.levelOf(s.to):E.levelOf(s.to);
    if(s.door&&!s.exit){const [x,y]=E.DOORS[s.door].p;pts.push({x,y,l:E.doorLevel(s.door),door:s.door,ok:s.result.ok,who});if(!s.result.ok)break;}
    else if(s.p){pts.push({x:s.p[0],y:s.p[1],l:E.levelOf(s.from)});}
    const [cx,cy]=center(s.to),arr=sc.targets.includes(s.to)&&!pts.some(p=>p.arrive===s.to);pts.push({x:cx,y:cy,l:E.levelOf(s.to),...(arr?{arrive:s.to}:{})});}
  return{res,pts,i:0,running:true,routeId:r?r.id:null};}
/* grading: same evaluator for every ticket; no case branches in access logic */
function grade(sc,t){const res=E.walk(t.world,t.person,sc.start,sc.targets,sc.time),extra=E.outOfScope(t.world,t.person).map(d=>E.DOORS[d].n);
  const who=sc.person.name.split(' ')[0];
  {const r=routeOf(sc,t);
    if(sc.verify&&sc.goal!=='audit'&&!(r&&r.wait)&&!(t.walk&&!t.walk.running&&t.walk.routeId===(r?r.id:null)))
      return{cls:'badr',title:'Not ready to close',text:`Walk ${who} in${r?' by this route':''} to confirm it works from their side before closing the ticket.`};}
  if(sc.goal==='adapt'){const r=routeOf(sc,t),escort=r.as==='escort',own=r.as==='self'&&r.start!==sc.start,first=sc.escort?sc.escort.name.split(' ')[0]:'';
    // 1. route outcome (a wait route has no walk)
    if(!r.wait){const wr=t.walk.res;
      if(wr.stop)return{cls:'badr',title:'Not ready to close',text:`At ${sc.day} ${E.fmt(sc.time)}, ${escort?first+' and '+who:who} would be stopped at ${E.DOORS[wr.stop.door]?E.DOORS[wr.stop.door].n:'a door'}. Walk the route and inspect where it fails.`};}
    // 2. access compliance (applies to every route, including waiting)
    if(extra.length)return{cls:'warnr',title:'Works, but outside the approved scope',text:own?`${who} gets in on his own badge, but it now also opens ${extra.join(', ')}. The delivery record covers the dock only, and vendors are not given unescorted staff-side access.`:`${who}'s badge was also expanded to open ${extra.join(', ')}, which the delivery record does not cover. ${r.wait?'Waiting':'This route'} does not need it, so remove it before closing.`};
    if(escort){const des=(sc.escort.authorizations||[]).filter(a=>a.designation==='vendor-escort'&&E.authActive(t.world,a)),cov=new Set(des.flatMap(a=>a.doors)),miss=[...new Set(t.walk.res.steps.filter(x=>x.door&&!x.exit&&!cov.has(x.door)).map(x=>x.door))];
      if(miss.length)return{cls:'warnr',title:'Escort not designated',text:`${first}'s badge works, but no current vendor-escort designation covers ${miss.map(d=>E.DOORS[d].n).join(', ')}. A working badge is not authority to escort.`};}
    // 3. operational consequence
    return{cls:r.wait?'warnr':'good',final:true,title:r.wait?'Closed, delivery delayed':'Ticket closed',text:r.tradeoff||`${who} reaches every stop.`};}
  if(sc.goal==='audit'){
    if(extra.length)return{cls:'badr',title:'Review incomplete',text:`Confirm that ${who}'s assigned access is supported by current authorization before closing this ticket.`};
    if(!t.disp)return{cls:'badr',title:'Record a reason',text:'Choose the reason for this decision before closing.'};
    const o=sc.disposition.options.find(o=>o.id===t.disp);
    if(!o.correct)return{cls:'warnr',title:'Reason does not match the records',text:o.why};
    if(t.person.credential.active)return{cls:'warnr',title:'Offboarding incomplete',text:`No doors remain on ${who}'s badge, but the vendor credential is still active. Under the offboarding policy, deactivate it when the work authorization ends.`};
    return{cls:'good',title:'Ticket closed',text:`${who}'s credential is deactivated and the record shows why. Recorded: ${o.text}.`};}
  if(res.stop)return{cls:'badr',title:'Not ready to close',text:`At ${sc.day} ${E.fmt(sc.time)}, ${who} would be stopped at ${E.DOORS[res.stop.door]?E.DOORS[res.stop.door].n:'a door'}. Walk the route and inspect where it fails.`};
  const ov=Object.keys(t.world.groupOverrides);
  if(ov.length){const G=E.GROUPS[ov[0]];return{cls:'warnr',title:'Works, but too broad',text:`${who} gets in, but ${G.n} now opens at ${E.fmt(t.world.groupOverrides[ov[0]][0])} every day for all ${G.members} badges. The approved record covers one person on one morning.`};}
  if(extra.length)return{cls:'warnr',title:'Works, but outside the approved scope',text:`${who} reaches everything requested, but the badge also opens ${extra.join(', ')}. No active record covers ${extra.length>1?'those doors':'that door'}.`};
  return{cls:'good',title:'Ticket closed',text:`${who} reaches every stop at ${E.fmt(sc.time)}, and the badge matches the approved records exactly.${t.flagged?' You also flagged the legacy template for review.':''}`};}
/* completion record: the data contract for outcome artwork */
function buildRecord(sc,t){const c=t.person.credential,p=sc.person,fp=E.footprint(t.world,t.person),doors=[...fp.doors].map(d=>E.DOORS[d].n),r=routeOf(sc,t),res=t.result;
  const auths=p.authorizations.map(a=>a.id).join(', '),when=`${sc.day} ${E.fmt(sc.time)}`;
  const rec={kind:sc.record,ref:auths,person:{name:p.name,role:p.role,initials:p.initials,avatar:p.avatar,title:p.title,department:p.department,credentialType:p.credentialType},outcome:res.cls,fields:[]};
  if(sc.record==='issue'){rec.title='Credential issued';rec.status=res.cls==='good'?'Issued':'Issued · review';
    rec.fields=[['Groups',c.groups.map(g=>E.GROUPS[g].n).join(', ')||'None'],['Opens',doors.join(', ')||'None'],['Hours',c.groups.map(g=>{const h=E.groupHours(t.world,g);return `${E.GROUPS[g].n} ${E.fmt(h[0])}–${E.fmt(h[1])}`;}).join(' · ')],['Authorization',auths],['Verified',`Walk test passed, ${when}`]];}
  else if(sc.record==='update'){rec.title='Access updated';rec.status=res.cls==='good'?'Temporary access':'Group change';
    rec.fields=[...c.exceptions.map(x=>['Exception',`${x.source}: ${x.day}${x.date?' '+x.date:''} ${E.fmt(x.window[0])}–${E.fmt(x.window[1])} · this badge only`]),
      ...Object.entries(t.world.groupOverrides).map(([g,h])=>['Group hours',`${E.GROUPS[g].n} ${E.fmt(h[0])}–${E.fmt(h[1])} · every day · all ${E.GROUPS[g].members} badges`]),['Authorization',auths],['Verified',`Walked in, ${when}`]];}
  else if(sc.record==='offboard'){const o=sc.disposition.options.find(o=>o.id===t.disp);rec.title='Audit recorded';rec.status=c.active?(doors.length?'Active':'Active · no access'):'Deactivated';
    rec.fields=[['Action',c.active?(c.groups.length?'Access retained':'Groups removed'):'Credential deactivated'],['Reason',o?o.text:'None'],...p.authorizations.map(a=>[a.id,`${a.purpose} · ${a.window}`]),['Remaining access',doors.join(', ')||'None']];}
  else if(sc.record==='response'){const esc=r.as==='escort'?sc.escort:null;rec.title=r.wait?'Delivery delayed':'Entry recorded';rec.status=r.wait?'Delayed':esc?'Escorted':'Unescorted';
    rec.fields=[['Response',r.label],...(esc?[['Escort',`${esc.name}, ${esc.role} · ${esc.authorizations.map(a=>a.id).join(', ')}`]]:[]),['Authorization',auths],['Outcome',r.wait?'Waiting at the dock':`Reached Receiving, ${when}`]];}
  return rec;}
return { routeOf, actorOf, center, outP, finalized, verified, steps, buildWalk, grade, buildRecord };
})();
if (typeof module !== 'undefined') module.exports = Flow;

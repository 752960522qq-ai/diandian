import fs from'node:fs';import{appHarness}from'./app_state_harness.mjs';
const report={method:'Verbatim original app state/mixer/time-step functions in a CPU harness; no DOM/WebGL. Actual Three.js skeleton, weapon attachment, pump nodes and chest weights.',characters:{}};
const diff=(a,b)=>{if(a.length!==b.length)return Infinity;let m=0;for(let i=0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m;};
for(const cid of ['diandian','zhigeng']){
 const b=await appHarness(cid,'baseline'),d=await appHarness(cid,'production');const row={sourceEvidence:[b.sourceEvidence,d.sourceEvidence],checks:[]};
 function warm(h){for(const w of ['qsz92','type54',h===b?'type54':'type64',h===b?'winchester1897':'m870']){h.selectWeapon(w);for(const m of (w==='m870'||w==='winchester1897'?['RifleIdle','RifleWalk','ShotgunAimUp','ShotgunPump','Reloading']:['PistolIdle','PistolWalk','PistolAimingIdle','PistolShooting','RifleRun','Reloading'])){h.setMotion(m);for(const phase of [.73,.05,.5,.99,.25]){h.seek(h.state.duration*phase);h.setPlaying(false);h.frame(0);}h.setPlaying(true);for(let i=0;i<6;i++)h.frame(.016);}}}
 function compare(label,bs,ds){const bd=diff(bs.bones,ds.bones),wd=diff(bs.weights,ds.weights),jd=diff(bs.joints,ds.joints),md=diff(bs.matrix,ds.matrix);const hiddenPumpMax=Math.max(0,...ds.pumps.filter(p=>!ds.visible.includes('m870')&&p.category==='primary').flatMap(p=>p.offset.map(Math.abs)));row.checks.push({label,boneComponentMaxDelta:bd,skinWeightMaxDelta:wd,skinJointMaxDelta:jd,visibleWeaponMatrixMaxDelta:md,visibleMatch:JSON.stringify(bs.visible)===JSON.stringify(ds.visible),chestMatch:bs.chest===ds.chest,hiddenM870PumpOffsetMaxM:hiddenPumpMax,baselineState:bs.state,candidateState:ds.state});}
 for(const [weapon,motion] of [['qbu85','RifleIdle'],['qbu85','FiringRifle'],['qbz95','RifleWalk'],['type97hawk','ShotgunPump'],['pf89','RifleAimingIdle'],['c96','Reloading'],['qjz89','QJZ89Idle'],[null,'Idle'],[null,'Run']]){
  warm(b);warm(d);
  for(const h of[b,d]){if(weapon)h.selectWeapon(weapon);h.setMotion(motion);h.setPlaying(false);}
  for(const phase of [0,.6,.1,.99,.25,.25]){for(const h of[b,d]){h.seek(h.state.duration*phase);h.frame(0);}compare(`${weapon||'unarmed'}/${motion}/seek-${phase}`,b.capture(),d.capture());}
  for(const h of[b,d]){h.seek(Math.max(0,h.state.duration-.02));h.setPlaying(true);for(let i=0;i<8;i++)h.frame(.016);}
  compare(`${weapon||'unarmed'}/${motion}/play-through-end`,b.capture(),d.capture());
  for(const h of[b,d]){h.setPlaying(false);h.frame(.05);h.frame(.05);}compare(`${weapon||'unarmed'}/${motion}/pause-stable`,b.capture(),d.capture());
 }
 report.characters[cid]=row;console.log(cid,'app paths',row.checks.length);
}
fs.writeFileSync('web/motion-labs/verification_weapon_v6_two/candidate_d_app_state_paths.json',JSON.stringify(report,null,2));

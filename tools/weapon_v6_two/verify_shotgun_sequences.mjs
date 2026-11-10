import fs from'node:fs';import * as T from'three';import{appHarness}from'./app_state_harness.mjs';
const report={method:'Verbatim original app one-shot clock, playback plan and pose evaluation.',characters:{}};
for(const cid of['diandian','zhigeng']){
 const b=await appHarness(cid,'baseline'),d=await appHarness(cid,'production');const row={sequences:[],upPeak:null};
 for(const pitch of[-1,0,1]){
  const results=[];for(const h of[b,d]){h.selectWeapon(h===b?'winchester1897':'m870');h.setAimPitch(pitch);h.setMotion('FiringRifle');h.seek(h.state.duration-.01);h.setPlaying(true);h.frame(.05);const end={time:h.state.time,duration:h.state.duration,playing:h.state.playing},q=h.r.attachment.weapons.get(h.r.attachment.selectedWeapon).quaternion.clone();for(let i=0;i<10;i++)h.frame(.016);const held=h.state.time===end.time&&!h.state.playing,holdRotationDegrees=T.MathUtils.radToDeg(q.angleTo(h.r.attachment.weapons.get(h.r.attachment.selectedWeapon).quaternion));h.setMotion('ShotgunPump');h.frame(0);const pumpStart=h.r.attachment.weapons.get(h.r.attachment.selectedWeapon).quaternion.clone();h.seek(h.state.duration-.01);h.setPlaying(true);h.frame(.05);results.push({kind:h===b?'baseline':'production',fireEnd:end,fireHeldAtEnd:held,fireHoldRotationDegrees:holdRotationDegrees,fireEndToPumpStartDegrees:T.MathUtils.radToDeg(q.angleTo(pumpStart)),pumpEnd:{time:h.state.time,duration:h.state.duration,playing:h.state.playing}});}
  row.sequences.push({pitch,results});
 }
 let max=-1,peak=null,maxSourceRotationDelta=0;
 for(const h of[b,d]){h.selectWeapon(h===b?'winchester1897':'m870');h.setAimPitch(1);h.setMotion('FiringRifle');h.setPlaying(false);}
 for(let i=0;i<=120;i++){const phase=i/120,qs=[];for(const h of[b,d]){h.seek(h.state.duration*phase);h.frame(0);qs.push(h.r.attachment.weapons.get(h.r.attachment.selectedWeapon).quaternion.clone().normalize());}const degrees=T.MathUtils.radToDeg(qs[0].angleTo(qs[1]));maxSourceRotationDelta=Math.max(maxSourceRotationDelta,degrees);const pitch=d.r.attachment.getState().barrelPitchDegrees;if(pitch>max){max=pitch;peak={phase,time:d.state.time,barrelPitchDegrees:pitch,sourceBarrelPitchDegrees:b.r.attachment.getState().barrelPitchDegrees,sourceRotationDeltaDegrees:degrees};}}
 row.upPeak={...peak,maxSourceRotationDeltaDegrees:maxSourceRotationDelta};report.characters[cid]=row;console.log(cid,row.upPeak);
}
fs.writeFileSync('web/motion-labs/verification_weapon_v6_two/shotgun_app_sequence_audit.json',JSON.stringify(report,null,2));

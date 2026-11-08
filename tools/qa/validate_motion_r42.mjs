import * as T from 'three';import fs from 'node:fs';import assert from 'node:assert/strict';
import {setup,read} from './validate_pf89.mjs';
import {handLegSource,measureHandLeg} from './measure_hand_leg_clearance.mjs';
const report={};
for(const cid of ['diandian','zhigeng']) {
 const rt=await setup(cid),{model}=rt;
 const old=await read(`assets/animations/motion_lab_r41/${cid}/uploaded_motions.glb`),current=await read(`${rt.dir}/assets/uploaded_motions.glb`);
 for(const clip of current.animations)model.actions.set(clip.name,model.mixer.clipAction(clip));
 let retainedTracks=0;
 for(const clip of old.animations){const newer=current.animations.find(c=>c.name===clip.name);assert(newer);if(clip.name==='PistolShooting')continue;
  for(const track of clip.tracks){if(clip.name==='WalkingBackwards'&&/mixamorig(Left|Right)Arm.quaternion/.test(track.name))continue;
   const other=newer.tracks.find(t=>t.name===track.name);assert(other);for(const key of ['times','values'])assert.deepEqual(other[key],track[key],`${cid} ${clip.name} ${track.name}`);retainedTracks++;
  }
 }
 const source=handLegSource(model.root),duration=model.actions.get('WalkingBackwards').getClip().duration,walk=[];
 for(let i=0;i<=58;i++) {
  const time=duration*i/58;rt.pose('WalkingBackwards',time,'qsz92');const result=measureHandLeg(source,4,i%2===0);
  for(const side of ['Left','Right']){assert.equal(result[side].insideSamples,0,`${cid} ${side} ${time}`);assert(result[side].minimumSignedGapM>.005,`${cid} ${side} gap ${result[side].minimumSignedGapM}`);assert(!result[side].triangleIntersections,`${cid} ${side} triangle collision`);}
  walk.push({time,...result});
 }
 // q and -q encode the same rotation. Compare a consistent hemisphere.
 const bones=[...new Set(model.bones.values())],snapshot=()=>bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray().map(v=>v*(b.quaternion.w<0?-1:1)),...b.scale.toArray()]);
 rt.pose('WalkingBackwards',0,'qsz92');const first=snapshot();rt.pose('WalkingBackwards',duration,'qsz92');const last=snapshot();const seam=Math.max(...first.map((v,i)=>Math.abs(v-last[i])));assert(seam<1e-5);
 const shooting={};
 for(const gun of ['qsz92','type54']) {
  const baseState=rt.pose('PistolAimingIdle',0,gun),base=snapshot(),position=side=>model.bones.get('mixamorig:'+side+'Hand').getWorldPosition(new T.Vector3());
  const basePosition={Left:position('Left'),Right:position('Right')};
  const frames=[];let maxLeft=0,maxRight=0,maxStep=0,previous=null;
  for(let i=0;i<=140;i++) {
   const time=i/120,state=rt.pose('PistolShooting',time,gun);
   maxLeft=Math.max(maxLeft,state.leftContactErrorM);maxRight=Math.max(maxRight,state.rightContactErrorM);
   const q=new T.Quaternion().fromArray(state.weaponQuaternion);
   if(previous)maxStep=Math.max(maxStep,T.MathUtils.radToDeg(previous.angleTo(q)));previous=q;
   frames.push({time,barrelPitchDegrees:state.barrelPitchDegrees,handRiseM:Object.fromEntries(['Left','Right'].map(s=>[s,position(s).y-basePosition[s].y]))});
  }
  const endpointErrors=[];
  for(const time of [0,.75,1.1666666667]){rt.pose('PistolShooting',time,gun);const pose=snapshot();endpointErrors.push(Math.max(...base.map((v,i)=>Math.abs(v-pose[i]))));}
  // Float32 re-encoding is amplified slightly by the iterative trigger-finger IK.
  assert(Math.max(...endpointErrors)<1e-4,`${cid} aim endpoints ${endpointErrors}`);
  assert(maxLeft<.005&&maxRight<.001,`${cid} ${gun} grip ${maxLeft}/${maxRight}`);
  assert(maxStep<2.1,`${cid} recoil step ${maxStep}`);
  for(const side of ['Left','Right'])assert(Math.max(...frames.map(f=>f.handRiseM[side]))>.025,`${cid} ${side} must rise`);
  rt.pose('PistolShooting',.18,gun);const before=snapshot();
  rt.pose('RocketDiscard',.8);rt.pose('WalkingBackwards',.3,'qsz92');rt.pose('PistolShooting',.18,gun);
  const after=snapshot(),drift=Math.max(...before.map((v,i)=>Math.abs(v-after[i])));assert(drift<1e-5);
  shooting[gun]={baseMotion:'PistolAimingIdle',basePitchDegrees:baseState.barrelPitchDegrees,endpointErrors,maxLeftContactErrorM:maxLeft,maxRightContactErrorM:maxRight,maxWeaponStepDegrees120Hz:maxStep,switchDrift:drift,frames};
 }
 report[cid]={retainedTracks,walking:{samples:walk.length,loopSeam:seam,frames:walk},shooting};
 console.log('PASS',cid,'walk min gap',Math.min(...walk.flatMap(f=>['Left','Right'].map(s=>f[s].minimumSignedGapM))),'shoot',Object.fromEntries(Object.entries(shooting).map(([w,s])=>[w,{endpoint:Math.max(...s.endpointErrors),left:s.maxLeftContactErrorM,rise:Math.max(...s.frames.map(f=>f.handRiseM.Right))}])));
}
fs.mkdirSync('web/motion-labs/verification_r42',{recursive:true});fs.writeFileSync('web/motion-labs/verification_r42/runtime.json',JSON.stringify(report,null,2)+'\n');

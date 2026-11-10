/** V6 reference-preserving candidate. Old meshes/packs/configs are read-only. */
import fs from 'node:fs';
import * as T from 'three';
import {setup,read,decode,encode} from '../qa/validate_pf89.mjs';
import {BASELINE_ROOT as BASE} from './reference-path.mjs';
export const OUT='web/motion-labs/verification_weapon_v6_three';
export function gentleSupport(bones,target,maxShift=.09){const upper=bones.get('mixamorig:LeftArm'),fore=bones.get('mixamorig:LeftForeArm'),hand=bones.get('mixamorig:LeftHand');const shoulder=upper.getWorldPosition(new T.Vector3()),elbow=fore.getWorldPosition(new T.Vector3()),wrist=hand.getWorldPosition(new T.Vector3()),delta=target.clone().sub(wrist);if(delta.length()>maxShift)target=wrist.clone().add(delta.setLength(maxShift));const ul=shoulder.distanceTo(elbow),fl=elbow.distanceTo(wrist),dir=target.clone().sub(shoulder),dist=T.MathUtils.clamp(dir.length(),Math.abs(ul-fl)+.0001,ul+fl-.0001);dir.normalize();const bend=elbow.clone().sub(shoulder).addScaledVector(dir,-elbow.clone().sub(shoulder).dot(dir)).normalize(),along=(ul*ul-fl*fl+dist*dist)/(2*dist),height=Math.sqrt(Math.max(ul*ul-along*along,0)),wanted=shoulder.clone().addScaledVector(dir,along).addScaledVector(bend,height);const turn=(b,from,to)=>{const q=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(b.getWorldQuaternion(new T.Quaternion()));b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateMatrixWorld(true);};turn(upper,elbow.clone().sub(shoulder),wanted.sub(shoulder));const ne=fore.getWorldPosition(new T.Vector3());turn(fore,hand.getWorldPosition(new T.Vector3()).sub(ne),target.clone().sub(ne));return delta.length();}
export const Q=a=>new T.Quaternion().fromArray(a),V=a=>new T.Vector3().fromArray(a);
export function exportPose(file,root,transform,dest){const{g,bin}=decode(file);delete g.animations;for(const n of g.nodes){const o=root.getObjectByName(n.name)||root.getObjectByName(n.name.replaceAll(':',''));if(o){n.translation=o.position.toArray();n.rotation=o.quaternion.toArray();n.scale=o.scale.toArray();delete n.matrix;}}const i=g.nodes.length;g.nodes.push({name:'PreviewTransform',translation:transform.position.toArray(),rotation:transform.quaternion.toArray(),scale:transform.scale.toArray(),children:g.scenes[g.scene||0].nodes});g.scenes[g.scene||0].nodes=[i];fs.writeFileSync(dest,encode(g,bin));}
export async function candidate(cid='linxu'){
 const src=await setup('diandian',{sourceDirectory:BASE+'/web/motion-labs/diandian-classic-motion-lab'});
 // Approved shoulder fix, only the three target characters' M870 Run source.
 // Preserve the authored support-wrist direction rather than imposing the old
 // M97 grip frame and distributing its mismatch into upper/forearm axial roll.
 // The source checkout and all other source action mounts remain untouched.
 if(['linxu','military','vest'].includes(cid))Object.assign(src.cfg.characters.diandian.mounts.winchester1897.motions.RifleRun,{
  left_hand_quaternion_weapon:null,
  support_forearm_twist_weight:0,
  support_upper_arm_twist_weight:0,
 });
 for(const w of ['type54','qsz92'])src.cfg.weapons[w].compatible_motions=['RifleRun','Reloading'];
 for(const c of (await read(src.dir+'/assets/uploaded_motions.glb')).animations)src.model.actions.set(c.name,src.model.mixer.clipAction(c));
 const run=src.model.actions.get('RifleRun').getClip(),carry=src.model.actions.get('LeonPistolWalk').getClip(),arm=t=>/Shoulder|Arm|ForeArm|Hand/.test(t.name);if(Math.abs(run.duration-carry.duration)>1e-6)throw Error('Run/carry source timing differs; do not retime implicitly');const pistolRun=new T.AnimationClip('SourcePistolRun',run.duration,[...run.tracks.filter(t=>!arm(t)).map(t=>t.clone()),...carry.tracks.filter(arm).map(t=>t.clone())]);src.model.actions.set(pistolRun.name,src.model.mixer.clipAction(pistolRun));
 for(const w of ['qsz92','type54']){src.cfg.weapons[w].animation_overrides.RifleRun='SourcePistolRun';const m=src.cfg.characters.diandian.mounts[w];m.motions.SourcePistolRun=structuredClone(m.motions.LeonPistolWalk);m.motions.Reloading={...structuredClone(src.cfg.characters.diandian.mounts.qsz92.motions.Reloading),release_support_hand:true,trigger_finger_ik:false};}
 if((process.env.PISTOL_RUN_MODE||'D')==='D')for(const w of ['qsz92','type54']){src.cfg.weapons[w].animation_overrides.RifleRun='RifleRun';src.cfg.characters.diandian.mounts[w].motions.RifleRun=structuredClone(src.cfg.characters.diandian.mounts.qsz92.motions.RifleRun);}
 const site=`web/motion-labs/${cid==='linxu'?'linxu':'resistance'}-motion-lab`,file=`${site}/assets/characters/${cid}/character.glb`,gltf=await read(file),pack=await read(`${site}/assets/characters/${cid}/motions.glb`),bones=new Map();gltf.scene.traverse(o=>{if(o.isBone)bones.set(o.userData.name||o.name,o);});
 const scene=new T.Scene(),wrapper=new T.Group(),box=new T.Box3().setFromObject(gltf.scene),a=gltf.parser.json.asset.extras?.preview_normalization,scale=a?.scale??1.75/(box.max.y-box.min.y),center=a?.center?V(a.center):box.getCenter(new T.Vector3());wrapper.scale.setScalar(scale);wrapper.position.set(-center.x*scale,-(a?.floor??box.min.y)*scale,-center.z*scale);wrapper.add(gltf.scene);scene.add(wrapper);scene.updateMatrixWorld(true);
 const cal=JSON.parse(fs.readFileSync(cid==='linxu'?'assets/characters/linxu_motion/retarget_calibration.json':`assets/characters/resistance_r48/${cid}/retarget_calibration.json`)),mixer=new T.AnimationMixer(gltf.scene),native=new Map(pack.animations.map(c=>[c.name,mixer.clipAction(c)]));
 const names=[...bones.keys()].filter(n=>src.model.bones.has(n)&&cal.bones[n]).sort((a,b)=>{const dep=n=>{let i=0;for(let p=bones.get(n);p;p=p.parent)i++;return i;};return dep(a)-dep(b);});
 const snapshots=root=>{const a=[];root.traverse(o=>{if(o.isBone)a.push([o,o.position.clone(),o.quaternion.clone(),o.scale.clone()]);});return a;},sourceRest=snapshots(src.model.root),targetRest=snapshots(gltf.scene),restore=a=>{for(const[b,p,q,s]of a){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(s);}};
 const refined=JSON.parse(fs.readFileSync('assets/weapons/refined_v2_attachment.json')).weapons,gunScenes=new Map();for(const w of ['m870','type54','type64','qsz92']){const g=new T.Group();g.add((await read(`assets/weapons/${w}.glb`)).scene);scene.add(g);gunScenes.set(w,g);}
 if(process.env.REFERENCE_M97==='1'){const gun=gunScenes.get('m870');gun.clear();gun.add((await read(src.dir+'/assets/weapons/winchester1897.glb')).scene);refined.m870={...src.cfg.weapons.winchester1897,pump_travel_m:.085};}
 const restHip=V(cal.bones['mixamorig:Hips'].target_rest_world_position),srcHip=V(cal.bones['mixamorig:Hips'].source_rest_world_position);
 const len=(side,prefix)=>V(cal.bones[`mixamorig:${side}UpLeg`][`${prefix}_rest_world_position`]).distanceTo(V(cal.bones[`mixamorig:${side}Leg`][`${prefix}_rest_world_position`]))+V(cal.bones[`mixamorig:${side}Leg`][`${prefix}_rest_world_position`]).distanceTo(V(cal.bones[`mixamorig:${side}Foot`][`${prefix}_rest_world_position`]));
 const ratio=len('Left','target')/len('Left','source');
 const palmLen=prefix=>V(cal.bones['mixamorig:RightHandMiddle1'][`${prefix}_rest_world_position`]).distanceTo(V(cal.bones['mixamorig:RightHand'][`${prefix}_rest_world_position`]));
 const palmRatio=palmLen('target')*scale/(palmLen('source')*src.model.wrapper.scale.x);
 function duration(w,m){const sw=w==='m870'?'winchester1897':w==='type64'?'type54':w;return src.model.actions.get(src.cfg.weapons[sw].animation_overrides?.[m]||m).getClip().duration;}
 function pose(w,m,t){
  const sw=w==='m870'?'winchester1897':w==='type64'?'type54':w,clip=src.cfg.weapons[sw].animation_overrides?.[m]||m;
  src.attachment.beforeAnimation();src.model.mixer.stopAllAction();restore(sourceRest);src.model.root.updateMatrixWorld(true);src.pose(m,t,sw);
  const sh=src.model.bones.get('mixamorig:RightHand'),sg=src.attachment.weapons.get(sw),srcInvQ=src.model.wrapper.getWorldQuaternion(new T.Quaternion()).invert();
  // A native corresponding clip keeps the established target's own body and feet.
  // Missing classes are fully retargeted from that exact original action, never an aiming substitute.
  mixer.stopAllAction();restore(targetRest);gltf.scene.updateMatrixWorld(true);const na=native.get(clip==='SourcePistolRun'?'RifleRun':clip);if(na){na.reset().setLoop(T.LoopOnce,1);na.clampWhenFinished=true;na.play();na.time=t;mixer.update(0);}
  for(const n of names){if(na&&!/(Shoulder|Arm|ForeArm|Hand)/.test(n))continue;const c=cal.bones[n],b=bones.get(n),q=srcInvQ.clone().multiply(src.model.bones.get(n).getWorldQuaternion(new T.Quaternion())).multiply(Q(c.source_rest_world_quaternion).invert()).multiply(Q(c.anatomical_frame_calibration_quaternion)).multiply(Q(c.target_rest_world_quaternion));b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize();b.updateMatrixWorld(true);}
  if(!na){const hp=src.model.wrapper.worldToLocal(src.model.bones.get('mixamorig:Hips').getWorldPosition(new T.Vector3())).sub(srcHip).multiplyScalar(ratio).add(restHip);bones.get('mixamorig:Hips').position.copy(bones.get('mixamorig:Hips').parent.worldToLocal(wrapper.localToWorld(hp)));}
  scene.updateMatrixWorld(true);
  const hand=bones.get('mixamorig:RightHand'),gun=gunScenes.get(w),oldContact=V(src.attachment.getState().rightPalmWorld||src.attachment.getState().rightSurfaceTargetWorld),palmDelta=oldContact.sub(sh.getWorldPosition(new T.Vector3())).multiplyScalar(palmRatio),targetContact=hand.getWorldPosition(new T.Vector3()).add(palmDelta);
  for(const [id,g]of gunScenes)g.visible=id===w;
  gun.quaternion.copy(sg.getWorldQuaternion(new T.Quaternion()));gun.scale.setScalar(1);
  const anchor=refined[w].right_palm_surface||refined[w].right_grip;
  gun.position.copy(targetContact).sub(V(anchor).applyQuaternion(gun.quaternion));gun.updateMatrixWorld(true);
  const pump=(src.attachment.getState().pumpTravelM||0)*(w==='m870'?refined.m870.pump_travel_m/.085:1);
  let supportShift=0;if(w==='m870'&&m!=='Reloading'&&process.env.REFERENCE_M97!=='1'){const lh=bones.get('mixamorig:LeftHand'),sl=src.model.bones.get('mixamorig:LeftHand'),oldPalm=V(src.attachment.getState().leftPalmWorld),carry=['RifleIdle','RifleWalk'].includes(m),support=carry?sg.worldToLocal(oldPalm.clone()):V(refined.m870.left_grip).add(new T.Vector3(0,0,pump)),delta=oldPalm.sub(sl.getWorldPosition(new T.Vector3())).multiplyScalar(palmRatio),target=gun.localToWorld(support).sub(delta);supportShift=gentleSupport(bones,target,carry?.025:.09);}
  gun.traverse(o=>{if(refined[w].pump_node_names?.includes(o.name)){o.userData.rest??=o.position.clone();const origin=o.parent.worldToLocal(gun.localToWorld(new T.Vector3())),shift=o.parent.worldToLocal(gun.localToWorld(new T.Vector3(0,0,pump)));o.position.copy(o.userData.rest).add(shift.sub(origin));}});scene.updateMatrixWorld(true);
  return {sourceClip:clip,nativeBody:!!na,supportShiftM:supportShift,pumpTravelM:pump,gunLocalPosition:hand.worldToLocal(gun.getWorldPosition(new T.Vector3())).toArray(),gunLocalQuaternion:hand.getWorldQuaternion(new T.Quaternion()).invert().multiply(gun.quaternion).toArray()};
 }
 return {src,cid,site,file,gltf,bones,scene,wrapper,names,gunScenes,pose,duration};
}
if(process.argv[1]?.endsWith('/candidate.mjs')){
 const cid=process.argv[2]||'linxu',rt=await candidate(cid),dir=OUT+'/poses';fs.mkdirSync(dir,{recursive:true});const rows=[];
 for(const[w,m]of [['type64','PistolIdle'],['type64','PistolAimingIdle'],['type54','PistolAimingIdle'],['m870','RifleIdle'],['m870','RifleAimingIdle'],['m870','ShotgunPump'],['m870','Reloading']])for(const phase of [0,.33,.67]){
  const state=rt.pose(w,m,rt.duration(w,m)*phase),name=`${cid}-${w}-${m}-p${phase}`;
  exportPose(rt.file,rt.gltf.scene,rt.wrapper,`${dir}/${name}.glb`);exportPose(`assets/weapons/${w}.glb`,rt.gunScenes.get(w),rt.gunScenes.get(w),`${dir}/${name}-gun.glb`);
  const center=rt.bones.get('mixamorig:RightHand').getWorldPosition(new T.Vector3()).lerp(rt.bones.get('mixamorig:LeftHand').getWorldPosition(new T.Vector3()),.5).toArray();rows.push({name,center,state});
  const sn=`reference-${w}-${m}-p${phase}`,sg=rt.src.attachment.weapons.get(w==='m870'?'winchester1897':w==='type64'?'type54':w);exportPose(rt.src.file,rt.src.model.root,rt.src.model.wrapper,`${dir}/${sn}.glb`);exportPose(rt.src.dir+`/assets/weapons/${w==='m870'?'winchester1897':w==='type64'?'type54':w}.glb`,sg,sg,`${dir}/${sn}-gun.glb`);rows.push({name:sn,center,state});
 }
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify(rows,null,2));console.log('EXPORTED',rows.length);
}

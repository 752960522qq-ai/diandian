import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import * as T from 'three';import {read,decode} from '../qa/validate_pf89.mjs';
// Environment variables name repository roots, not motion-lab subdirectories.
// Frozen v5 is OPTIONAL and needed only by explicit historical diagnostics.
export const ROOT=fileURLToPath(new URL('../..',import.meta.url)),BASE=path.resolve(process.env.WEAPON_V6_BASELINE||path.join(ROOT,'..','character_adapt_baseline')),V5_BASE=process.env.WEAPON_V6_V5_BASELINE?path.resolve(process.env.WEAPON_V6_V5_BASELINE):null,OUT='web/motion-labs/verification_weapon_v6_jitter';
export const baselineFile=relative=>path.join(BASE,relative);
export function baselineInput(relative){
 // A full baseline checkout is preferred. A website-only snapshot can use the
 // original tracked JSON in this project; walk_source verifies its pinned hash.
 for(const file of[baselineFile(relative),path.join(ROOT,relative)])if(fs.existsSync(file))return file;
 throw Error('Missing original input '+relative+'. Provide it in WEAPON_V6_BASELINE or retain the original tracked input in this project.');
}
export function siteDirectory(kind='current'){
 if(kind==='v5'&&!V5_BASE)throw Error('Historical v5 comparison is optional. Set WEAPON_V6_V5_BASELINE to a frozen v5 repository root to run it; current production verification does not require that snapshot.');
 return kind==='baseline'?baselineFile('web/motion-labs/linxu-motion-lab'):kind==='v5'?path.join(V5_BASE,'web/motion-labs/linxu-motion-lab'):kind==='current'?path.join(ROOT,'web/motion-labs/linxu-motion-lab'):path.resolve(ROOT,kind);
}
export async function runtime(kind='current'){
 const dir=siteDirectory(kind),file=dir+'/assets/characters/linxu/character.glb',cfg=JSON.parse(fs.readFileSync(dir+'/assets/weapon_attachment.json')),weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(dir+'/assets/weapons/'+id+'.glb')).scene]))),gltf=await read(file),pack=await read(dir+'/assets/characters/linxu/motions.glb'),xp=dir+'/assets/characters/linxu/'+(fs.readFileSync(dir+'/app.js','utf8').includes('weapon_update_v6.glb')?'weapon_update_v6.glb':'weapon_update_v5.glb'),extra=fs.existsSync(xp)?await read(xp):{animations:[]},scene=new T.Scene(),{prepareRig}=await import(pathToFileURL(dir+'/rig.js')),model=prepareRig(gltf,pack,'linxu',cfg,weapons,scene,extra);scene.updateMatrixWorld(true);
 const rest=new Map();model.root.traverse(o=>rest.set(o,{p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));
 const restore=()=>{model.attachment.beforeAnimation();model.mixer.stopAllAction();for(const[o,v]of rest){o.position.copy(v.p);o.quaternion.copy(v.q);o.scale.copy(v.s);}scene.updateMatrixWorld(true);};
 function rawPose(name,t){model.attachment.beforeAnimation();model.mixer.stopAllAction();const a=model.actions.get(name);if(!a)throw Error('Missing '+name);a.reset().setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=t;model.mixer.update(0);scene.updateMatrixWorld(true);}
 const clip=(m,w='none')=>cfg.weapons[w]?.animation_overrides?.[m]||m;
 return{dir,file,gltf,pack,extra,scene,model,cfg,restore,rawPose,clip,pose:(m,t,w='none')=>model.pose(m,t,w),duration:(m,w='none')=>model.duration(m,w)};
}
export const boneNames=['Hips','Spine','Spine2','Head','LeftShoulder','RightShoulder','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot','LeftToeBase','RightToeBase'];
export function snapshot(r,weapon='none'){
 const out={};for(const n of boneNames){const b=r.model.bones.get('mixamorig:'+n);if(b)out[n]={p:b.getWorldPosition(new T.Vector3()).toArray(),q:b.getWorldQuaternion(new T.Quaternion()).toArray()};}
 if(weapon!=='none'){const g=r.model.attachment.weapons.get(weapon);out.Gun={p:g.getWorldPosition(new T.Vector3()).toArray(),q:g.getWorldQuaternion(new T.Quaternion()).toArray()};}
 return out;
}
export const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export const angle=(a,b)=>T.MathUtils.radToDeg(new T.Quaternion().fromArray(a).normalize().angleTo(new T.Quaternion().fromArray(b).normalize()));
export function metrics(samples){const result={};for(const n of Object.keys(samples[0].nodes)){const ps=samples.map(s=>s.nodes[n].p),vs=[],sp=[],ang=[],acc=[],jm=[],spIndex=[],aq=[];for(let i=1;i<samples.length;i++){const dt=samples[i].t-samples[i-1].t,v=ps[i].map((x,k)=>(x-ps[i-1][k])/dt);vs.push(v);sp.push(Math.hypot(...v));ang.push(angle(samples[i].nodes[n].q,samples[i-1].nodes[n].q)/dt);jm.push(dist(ps[i],ps[i-1]));if(i>1)acc.push(dist(v,vs.at(-2))/((dt+samples[i-1].t-samples[i-2].t)/2));}const ix=sp.indexOf(Math.max(...sp));result[n]={rangeM:[0,1,2].map(k=>Math.max(...ps.map(x=>x[k]))-Math.min(...ps.map(x=>x[k]))),peakSpeedMps:Math.max(...sp),peakAccelerationMps2:Math.max(...acc),peakAngularSpeedDegps:Math.max(...ang),maxFrameJumpM:Math.max(...jm),peakAt:samples[ix+1].t,peakPhase:samples[ix+1].phase};}return result;}
export function cyclic(r,m,w,hz,loops=3,raw=false){const d=r.duration(m,w),samples=[];r.restore();const end=Math.max(d*loops,.15);for(let i=0;i<=Math.ceil(end*hz);i++){const t=i/hz,phase=t%d;if(raw)r.rawPose(r.clip(m,w),phase);else r.pose(m,phase,w);samples.push({t,phase,nodes:snapshot(r,w)});}return{d,hz,samples,metrics:metrics(samples)};}
export function clipSummary(c){return{name:c.name,duration:c.duration,tracks:c.tracks.length,keys:[...new Set(c.tracks.map(t=>t.times.length))],ranges:c.tracks.filter(t=>t.name.includes('Hips')||t.name.includes('Spine')).map(t=>({name:t.name,times:Array.from(t.times),values:Array.from(t.values)}))};}

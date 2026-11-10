/** Validate every configured legacy finger limit through the production runtime.
 * Executed at five phases per action for all three male character rigs.
 * max angle is segment-to-segment, not a complete anatomical or collision test.
 */
import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import * as T from'three';import{read}from'../qa/validate_pf89.mjs';
const cfgs=JSON.parse(fs.readFileSync('tools/weapon_v7_legacy/finger_limits.json'));const results=[];
for(const cid of Object.keys(cfgs)){
 const site=cid==='linxu'?'linxu':'resistance', dir=path.resolve(`web/motion-labs/${site}-motion-lab`),cfg=JSON.parse(fs.readFileSync(`${dir}/assets/weapon_attachment.json`));
 const g=await read(`${dir}/assets/characters/${cid}/character.glb`),pack=await read(`${dir}/assets/characters/${cid}/motions.glb`),extra=await read(`${dir}/assets/characters/${cid}/weapon_update_v6.glb`),weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(`${dir}/assets/weapons/${id}.glb`)).scene]))),scene=new T.Scene(),{prepareRig}=await import(pathToFileURL(dir+'/rig.js')),model=prepareRig(g,pack,cid,cfg,weapons,scene,extra);scene.updateMatrixWorld(true);
 for(const [w,motions] of Object.entries(cfgs[cid]))for(const [motion,joints] of Object.entries(motions))for(const phase of Array.from({length:Number(process.env.PHASES||5)},(_,i)=>i/(Number(process.env.PHASES||5)-1))){
  const st=model.pose(motion,model.duration(motion,w)*phase,w);
  for(const [name,limit] of Object.entries(joints)){
   const [,side,digit,n]=/^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([23])$/.exec(name),j=Number(n),ch=[j-1,j,j+1].map(i=>model.bones.get(`mixamorig:${side}Hand${digit}${i}`)),p=ch.map(b=>b.getWorldPosition(new T.Vector3())),angle=T.MathUtils.radToDeg(p[1].clone().sub(p[0]).angleTo(p[2].clone().sub(p[1])));
   results.push({cid,w,motion,phase,joint:name,limit,angle,error:angle-limit,actualClip:st.actualClip});
  }
 }
}
const bad=results.filter(r=>!Number.isFinite(r.angle)||r.error>0.025);console.log(JSON.stringify({samples:results.length,maxOvershootDegrees:Math.max(...results.map(r=>r.error)),failures:bad.length,examples:bad.slice(0,15)},null,2));
const dest=process.env.OUTPUT||'../terra_scratch/finger-validation.json';fs.writeFileSync(dest,JSON.stringify({results,failures:bad},null,2));if(bad.length)process.exitCode=1;

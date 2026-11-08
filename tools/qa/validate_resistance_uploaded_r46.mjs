// Verify uploaded FBX provenance, authored durations and loop seams.
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {decode,read} from './validate_pf89.mjs';
const provenance=JSON.parse(fs.readFileSync('assets/animations/resistance_r46/provenance.json')),report={};
for(const cid of ['military','vest']){
 const path=`assets/characters/resistance_r46/${cid}/motions.glb`,{g}=decode(path),clips=(await read(path)).animations;report[cid]={};
 for(const name of ['Idle','Walk']){
  const a=g.animations.find(a=>a.name===name),c=clips.find(c=>c.name===name),h=c.tracks.find(t=>t.name==='mixamorigHips.position');
  const maxAngle=Math.max(...c.tracks.filter(t=>t.name.endsWith('.quaternion')).map(t=>new T.Quaternion().fromArray(t.values).normalize().angleTo(new T.Quaternion().fromArray(t.values,t.values.length-4).normalize())));
  const rootDelta=new T.Vector3().fromArray(h.values,h.values.length-3).sub(new T.Vector3().fromArray(h.values)),sha=crypto.createHash('sha256').update(fs.readFileSync(provenance[name].source)).digest('hex');
  if(a.extras.source_sha256!==sha||Math.abs(c.duration-provenance[name].duration)>1e-5||maxAngle>.005||rootDelta.length()>1e-5)throw Error(`Uploaded clip provenance/loop mismatch: ${cid} ${name}`);
  report[cid][name]={source_sha256:sha,duration:c.duration,max_loop_bone_angle_rad:maxAngle,root_loop_delta:rootDelta.toArray(),upper_arm_clearance_degrees:a.extras.upper_arm_clearance_degrees||0};
 }
}
fs.writeFileSync('assets/characters/resistance_r46/uploaded-motion-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

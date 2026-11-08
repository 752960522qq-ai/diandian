// Open the resistance characters' unequipped shoulders/arms, preserving all
// other animation channels and all 31 unrelated clips byte-for-byte.
import fs from 'node:fs';
import * as T from 'three';
import {read,decode,encode} from '../qa/validate_pf89.mjs';
const root='assets/characters/resistance_r47',source='assets/characters/resistance_r46',settings={Idle:{shoulderYaw:3,armAbduction:6},Walk:{shoulderYaw:3,armAbduction:8}},report={settings,characters:{}};
for(const id of ['military','vest']){
 const dir=`${root}/${id}`;fs.mkdirSync(dir,{recursive:true});for(const name of ['character.glb','retarget_calibration.json'])fs.copyFileSync(`${source}/${id}/${name}`,`${dir}/${name}`);
 const model=await read(`${dir}/character.glb`),pack=await read(`${source}/${id}/motions.glb`),mixer=new T.AnimationMixer(model.scene),bones={};model.scene.traverse(o=>{if(o.isBone)bones[o.userData.name||o.name]=o;});
 const {g,bin:input}=decode(`${source}/${id}/motions.glb`),bin=Buffer.from(input),changed=[];
 for(const [name,angles]of Object.entries(settings)){
  mixer.stopAllAction();const clip=pack.animations.find(c=>c.name===name),action=mixer.clipAction(clip).reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();const animation=g.animations.find(a=>a.name===name);
  const track=clip.tracks.find(t=>t.name==='mixamorigLeftArm.quaternion'),names=['LeftShoulder','RightShoulder','LeftArm','RightArm'].map(n=>'mixamorig:'+n),values=Object.fromEntries(names.map(n=>[n,[]]));
  for(const time of track.times){action.time=time;mixer.update(0);for(const n of names){const original=clip.tracks.find(t=>t.name===n.replace(':','')+'.quaternion');bones[n].quaternion.fromArray(original.createInterpolant().evaluate(time));}model.scene.updateMatrixWorld(true);
   // Define the opening axes from the animated torso, not the world camera.
   const left=bones['mixamorig:LeftShoulder'].getWorldPosition(new T.Vector3()),right=bones['mixamorig:RightShoulder'].getWorldPosition(new T.Vector3()),x=left.sub(right).normalize(),y=bones['mixamorig:Neck'].getWorldPosition(new T.Vector3()).sub(bones['mixamorig:Hips'].getWorldPosition(new T.Vector3())).normalize(),z=new T.Vector3().crossVectors(x,y).normalize();y.crossVectors(z,x).normalize();
   for(const side of ['Left','Right']){
    const sign=side==='Left'?1:-1;
    for(const [part,axis,degrees]of [['Shoulder',y,angles.shoulderYaw],['Arm',z,angles.armAbduction]]){
     const bone=bones[`mixamorig:${side}${part}`],world=bone.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(axis,sign*degrees*Math.PI/180)),parent=bone.parent.getWorldQuaternion(new T.Quaternion());bone.quaternion.copy(parent.invert().multiply(world).normalize());model.scene.updateMatrixWorld(true);
    }
   }
   for(const n of names){const q=bones[n].quaternion.clone(),a=values[n];if(a.length&&q.dot(new T.Quaternion().fromArray(a,a.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.push(...q.toArray());}
  }
  for(const n of names){const channel=animation.channels.find(c=>g.nodes[c.target.node].name===n&&c.target.path==='rotation'),sampler=animation.samplers[channel.sampler],a=g.accessors[sampler.output],view=g.bufferViews[a.bufferView];if(a.type!=='VEC4'||a.componentType!==5126||a.count*4!==values[n].length)throw Error('Unexpected rotation accessor');const offset=(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||16;for(let i=0;i<a.count;i++)for(let k=0;k<4;k++)bin.writeFloatLE(values[n][i*4+k],offset+i*stride+k*4);changed.push({clip:name,bone:n,frames:a.count});}
 }
 fs.writeFileSync(`${dir}/motions.glb`,encode(g,bin));report.characters[id]={changed_channels:changed,original_character:`${source}/${id}/character.glb`,calibration_unchanged:true};
}
fs.writeFileSync(`${root}/report.json`,JSON.stringify(report,null,2)+'\n');

// Sample actual old/new Idle rigs at 60Hz; no weapon runtime involved.
import fs from 'node:fs';
import * as T from 'three';
import {read} from './validate_pf89.mjs';
const result={sampleRateHz:60,characters:{}};
for(const id of ['military','vest']){
 const variants=[];
 for(const version of ['r47','r48']){
  const g=await read(`assets/characters/resistance_${version}/${id}/character.glb`),pack=await read(`assets/characters/resistance_${version}/${id}/motions.glb`),clip=pack.animations.find(c=>c.name==='Idle'),mixer=new T.AnimationMixer(g.scene),a=mixer.clipAction(clip).setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();const bones={};g.scene.traverse(o=>{if(o.isBone)bones[o.name]=o;});variants.push({g,clip,mixer,a,bones});
 }
 const count=Math.ceil(variants[0].clip.duration*60),row={sampledFrames:count+1,nonFinite:0,maxArmDirectionChangeDegrees:0,maxFrameToFrameShoulderDegrees:0,minPalmToLegAxisNativeM:Infinity,maxOtherLocalTransformDifference:0,maxNonUnitQuaternionError:0};let last={};
 for(let i=0;i<=count;i++){
  for(const v of variants){v.a.time=v.clip.duration*i/count;v.mixer.update(0);v.g.scene.updateMatrixWorld(true);}
  const [old,next]=variants;
  for(const [name,b]of Object.entries(next.bones)){
   for(const n of [...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()])if(!Number.isFinite(n))row.nonFinite++;
   row.maxNonUnitQuaternionError=Math.max(row.maxNonUnitQuaternionError,Math.abs(1-b.quaternion.length()));
   if(!/mixamorig(?:Left|Right)(?:Shoulder|Arm)$/.test(name)){const o=old.bones[name];for(const prop of ['position','quaternion','scale'])b[prop].toArray().forEach((x,j)=>row.maxOtherLocalTransformDifference=Math.max(row.maxOtherLocalTransformDifference,Math.abs(x-o[prop].toArray()[j])));}
  }
  for(const side of ['Left','Right']){
   const pos=(v,n)=>v.bones['mixamorig'+side+n].getWorldPosition(new T.Vector3());
   const od=pos(old,'ForeArm').sub(pos(old,'Arm')).normalize(),nd=pos(next,'ForeArm').sub(pos(next,'Arm')).normalize();row.maxArmDirectionChangeDegrees=Math.max(row.maxArmDirectionChangeDegrees,od.angleTo(nd)*180/Math.PI);
   const q=next.bones['mixamorig'+side+'Shoulder'].quaternion.clone().normalize();if(last[side])row.maxFrameToFrameShoulderDegrees=Math.max(row.maxFrameToFrameShoulderDegrees,q.angleTo(last[side])*180/Math.PI);last[side]=q;
   const palm=pos(next,'HandMiddle1').lerp(pos(next,'Hand'),.35),near=new T.Line3(pos(next,'UpLeg'),pos(next,'Leg')).closestPointToPoint(palm,true,new T.Vector3());row.minPalmToLegAxisNativeM=Math.min(row.minPalmToLegAxisNativeM,palm.distanceTo(near));
  }
 }
 if(row.nonFinite||row.maxOtherLocalTransformDifference!==0||row.maxArmDirectionChangeDegrees>.05||row.maxFrameToFrameShoulderDegrees>2)throw Error(JSON.stringify(row));
 result.characters[id]=row;
}
fs.writeFileSync('assets/characters/resistance_r48/idle-validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

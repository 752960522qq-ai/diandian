import * as THREE from 'three';
// Linxu/QBU85 idle only. Authored in Blender from this character's evaluated
// palm and finger surfaces; preserve the weapon, left hand and all other clips.
const deltas={"mixamorig:RightArm":[0.01449506264179945,5.960463766996327e-08,0.044163018465042114,0.9989191889762878],"mixamorig:RightForeArm":[0.05831838399171829,1.0430814256778831e-07,-0.04308599606156349,0.9973678588867188],"mixamorig:RightHand":[-0.042944710701704025,0.02070406638085842,-0.010744634084403515,0.9988051652908325],"mixamorig:RightHandMiddle1":[0.020143197261245582,-0.05134406150722372,-0.05316846777893069,0.9970612583919194],"mixamorig:RightHandMiddle2":[0.01466606803722899,-0.053168165446309174,0.05134424445436424,0.9971568688991778],"mixamorig:RightHandPinky1":[0.06975651532411575,1.4901162970204496e-08,1.4901162614933128e-07,0.9975641369819641],"mixamorig:RightHandRing2":[0.06973253533865952,-0.026113034688697793,-0.0018261258430948971,0.9972222160576821],"mixamorig:RightHandThumb1":[-0.028656458707084706,-0.06185204735969193,-0.006335426219806874,0.997653744535847],"mixamorig:RightHandThumb2":[-0.004224668005946167,-0.08285386731915043,-0.04007973909582545,0.9957464553612585],"mixamorig:RightHandThumb3":[-0.04859711974859238,-0.003359690774232149,-0.05638948827981949,0.9972198009490967],"mixamorig:RightHandMiddle3":[-0.07845903707705833,4.470348229761303e-08,2.272427016795329e-07,0.9969173383490162],"mixamorig:RightHandRing1":[0.000685304450361757,-0.02616799952723793,-0.026167902669691746,0.9993147687432735],"mixamorig:RightHandRing3":[-0.052335793614253875,-1.490116434771024e-08,3.725290909291881e-08,0.9986295432775683]};
export function applyLinxuQbu85Palm(attachment,motion){
 if(attachment.characterId!=='linxu'||attachment.selectedWeapon!=='qbu85'||motion!=='RifleIdle'||!attachment.state.visible)return;
 const state=attachment.state,hand=attachment.model.bones.get('mixamorig:RightHand');
 const palm=state.rightPalmWorld?hand.worldToLocal(new THREE.Vector3().fromArray(state.rightPalmWorld)):null;
 const depth=bone=>{let n=0;for(let p=bone;p;p=p.parent)n++;return n;};
 const bones=Object.entries(deltas).map(([name,q])=>[attachment.model.bones.get(name),q]).sort((a,b)=>depth(a[0])-depth(b[0]));
 for(const[bone,q]of bones){attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().fromArray(q).normalize()).normalize();bone.updateMatrixWorld(true);}
 if(palm){state.rightPalmWorld=hand.localToWorld(palm).toArray();if(state.rightSurfaceTargetWorld&&state.rightContactErrorM!==null)
  state.rightContactErrorM=new THREE.Vector3().fromArray(state.rightPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.rightSurfaceTargetWorld));}
}

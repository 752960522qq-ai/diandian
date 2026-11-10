import * as THREE from 'three';
// Linxu, 97 shotgun idle: independently authored right arm and wrist only.
const layers=[{"mixamorig:RightHand":[-0.06810985505580902,0.0027030103374272585,-0.038853488862514496,0.9969173669815063]},{"mixamorig:RightArm":[0.0012241835938766599,0.0005001127137802541,-0.01889779418706894,0.9998205900192261],"mixamorig:RightForeArm":[-0.0344354547560215,-0.005135000217705965,0.007975966669619083,0.9993619918823242],"mixamorig:RightHand":[0.017252817749977112,-0.00622984766960144,0.003844231367111206,0.9998243451118469]}];
export function applyLinxu97IdleGrip(attachment,motion){
 if(attachment.characterId!=='linxu'||attachment.selectedWeapon!=='type97hawk'||motion!=='RifleIdle'||!attachment.state.visible)return;
 const state=attachment.state,hand=attachment.model.bones.get('mixamorig:RightHand');
 const palm=state.rightPalmWorld?hand.worldToLocal(new THREE.Vector3().fromArray(state.rightPalmWorld)):null;
 const depth=bone=>{let n=0;for(let p=bone;p;p=p.parent)n++;return n;};
 for(const layer of layers){const bones=Object.entries(layer).map(([name,q])=>[attachment.model.bones.get(name),q]);bones.sort((a,b)=>depth(a[0])-depth(b[0]));
  for(const[bone,q]of bones){attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(q).normalize(),1)).normalize();bone.updateMatrixWorld(true);}}
 if(palm){state.rightPalmWorld=hand.localToWorld(palm).toArray();if(state.rightSurfaceTargetWorld&&state.rightContactErrorM!==null)
  state.rightContactErrorM=new THREE.Vector3().fromArray(state.rightPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.rightSurfaceTargetWorld));}
}

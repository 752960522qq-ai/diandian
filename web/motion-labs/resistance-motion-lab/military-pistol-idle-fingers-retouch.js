import * as THREE from 'three';
// Military QSZ92 idle: only left ring and little fingers, authored on this rig.
const deltas={"mixamorig:LeftHandPinky1":[-0.044265616685152054,-0.03871987760066986,-0.03751436993479729,0.9975640177726746],"mixamorig:LeftHandPinky2":[0.0022196099162101746,-0.01727709174156189,-0.06754680722951889,0.9975640177726746],"mixamorig:LeftHandPinky3":[0.03173248842358589,-0.00034067031810991466,-0.062119849026203156,0.9975640177726746],"mixamorig:LeftHandRing1":[-0.06759694963693619,-0.016564128920435905,0.004718756768852472,0.9975640773773193],"mixamorig:LeftHandRing2":[-0.02285704016685486,-0.009059101343154907,-0.06528104096651077,0.9975640177726746],"mixamorig:LeftHandRing3":[0.036407411098480225,-0.0008741617202758789,-0.059495702385902405,0.9975640177726746]};
export function applyMilitaryPistolIdleFingers(attachment,motion){
 if(attachment.characterId!=='military'||attachment.selectedWeapon!=='qsz92'||motion!=='PistolIdle'||!attachment.state.visible)return;
 const depth=bone=>{let n=0;for(let p=bone;p;p=p.parent)n++;return n;};
 const bones=Object.entries(deltas).map(([name,q])=>[attachment.model.bones.get(name),q]);bones.sort((a,b)=>depth(a[0])-depth(b[0]));
 for(const[bone,q]of bones){attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().fromArray(q).normalize()).normalize();bone.updateMatrixWorld(true);}
}

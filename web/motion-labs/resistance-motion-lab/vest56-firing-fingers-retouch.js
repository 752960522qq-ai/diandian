import * as THREE from 'three';
// Vest 56-1 firing: only selected left-hand fingers, authored on this rig.
const deltas={"mixamorig:LeftHandMiddle1":[-0.03669920563697815,-0.0006313472986221313,-0.07905000448226929,0.9961947202682495],"mixamorig:LeftHandMiddle2":[-0.06974919885396957,-0.00039177568396553397,-0.05225980654358864,0.9961946606636047],"mixamorig:LeftHandMiddle3":[-0.07792052626609802,-3.1366944313049316e-06,-0.03904546797275543,0.9961946606636047],"mixamorig:LeftHandPinky1":[-0.019422028213739395,-0.004236061125993729,-0.08485816419124603,0.9961947202682495],"mixamorig:LeftHandPinky2":[-0.05016009137034416,-0.0028496747836470604,-0.07121754437685013,0.9961947202682495],"mixamorig:LeftHandPinky3":[-0.06210942566394806,-6.865710020065308e-05,-0.06114353984594345,0.9961947202682495],"mixamorig:LeftHandRing1":[-0.05968828499317169,5.741418863181025e-05,-0.0635097473859787,0.9961947202682495],"mixamorig:LeftHandRing2":[-0.07196196913719177,1.341104507446289e-05,-0.04916892945766449,0.9961947798728943],"mixamorig:LeftHandRing3":[-0.08213387429714203,-3.0085444450378418e-05,-0.029159143567085266,0.9961947202682495]};
export function applyVest56FiringFingers(attachment,motion){
 if(attachment.characterId!=='vest'||attachment.selectedWeapon!=='type56_1'||motion!=='FiringRifle'||!attachment.state.visible)return;
 const depth=bone=>{let n=0;for(let p=bone;p;p=p.parent)n++;return n;};
 const bones=Object.entries(deltas).map(([name,q])=>[attachment.model.bones.get(name),q]);bones.sort((a,b)=>depth(a[0])-depth(b[0]));
 for(const[bone,q]of bones){attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().fromArray(q).normalize()).normalize();bone.updateMatrixWorld(true);}
}

import * as THREE from 'three';
// Vest QBU85 walk: individually authored wrist and support thumb corrections.
const layers=[{"mixamorig:RightHand":[-0.053902894258499146,0.003774195909500122,0.02841082215309143,0.9981347918510437]},{"mixamorig:RightArm":[-0.0006397812976501882,0.0008779763011261821,-0.001009240630082786,0.999998927116394],"mixamorig:RightForeArm":[0.011509508825838566,0.001167863723821938,-0.015203149989247322,0.9998174905776978],"mixamorig:RightHand":[-0.010099857114255428,0.0058698346838355064,0.01659509353339672,0.9997941255569458]},{"mixamorig:LeftHandThumb1":[-0.08857230842113495,-0.013536043465137482,0.053832247853279114,0.994521975517273],"mixamorig:LeftHandThumb2":[-0.03898581489920616,-0.015394138172268867,0.09575693309307098,0.9945219159126282],"mixamorig:LeftHandThumb3":[-0.008455201052129269,0.0003971754922531545,0.10418552160263062,0.9945218563079834]},{"mixamorig:LeftHandThumb1":[0.10452854633331299,-1.601874686230076e-07,-2.9802318834981634e-08,0.9945219159126282]}];
export function applyVestQbu85Walk(attachment,motion){
 if(attachment.characterId!=='vest'||attachment.selectedWeapon!=='qbu85'||motion!=='RifleWalk'||!attachment.state.visible)return;
 const state=attachment.state,left=attachment.model.bones.get('mixamorig:LeftHand'),right=attachment.model.bones.get('mixamorig:RightHand');
 const local=(bone,point)=>point?bone.worldToLocal(new THREE.Vector3().fromArray(point)):null;
 const leftPalm=local(left,state.leftPalmWorld),rightPalm=local(right,state.rightPalmWorld);
 const depth=bone=>{let n=0;for(let p=bone;p;p=p.parent)n++;return n;};
 for(const layer of layers){const bones=Object.entries(layer).map(([name,q])=>[attachment.model.bones.get(name),q]);bones.sort((a,b)=>depth(a[0])-depth(b[0]));
  for(const[bone,q]of bones){attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(q).normalize(),1)).normalize();bone.updateMatrixWorld(true);}}
 if(leftPalm)state.leftPalmWorld=left.localToWorld(leftPalm).toArray();if(rightPalm)state.rightPalmWorld=right.localToWorld(rightPalm).toArray();
 if(state.leftPalmWorld&&state.supportTargetWorld&&state.leftContactErrorM!==null)state.leftContactErrorM=new THREE.Vector3().fromArray(state.leftPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.supportTargetWorld));
 if(state.rightPalmWorld&&state.rightSurfaceTargetWorld&&state.rightContactErrorM!==null)state.rightContactErrorM=new THREE.Vector3().fromArray(state.rightPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.rightSurfaceTargetWorld));
}

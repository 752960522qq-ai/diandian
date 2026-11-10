import * as THREE from 'three';
// Linxu QCQ171 idle right arm, wrist, thumb and middle finger only.
const layers=[{"mixamorig:RightHand":[-0.07815799862146378,0.003169760573655367,-0.038437072187662125,0.9961947202682495]},{"mixamorig:RightArm":[0.0011396481422707438,-0.0008895992068573833,-0.00023379919002763927,0.9999989867210388],"mixamorig:RightForeArm":[-0.00870493147522211,-0.003510416019707918,0.018501373007893562,0.9997848272323608],"mixamorig:RightHand":[0.004854516126215458,-0.013188066892325878,-0.015633974224328995,0.9997791051864624]},{"mixamorig:RightHandThumb1":[0.06483028084039688,0.034510526806116104,0.046927645802497864,0.9961947798728943],"mixamorig:RightHandMiddle1":[0.07691066712141037,-0.010257244110107422,0.039694905281066895,0.9961947202682495]}];
export function applyLinxuQcqRight(attachment,motion){
 if(attachment.characterId!=='linxu'||attachment.selectedWeapon!=='qcq171'||motion!=='RifleIdle'||!attachment.state.visible)return;
 const state=attachment.state,hand=attachment.model.bones.get('mixamorig:RightHand');
 const palm=state.rightPalmWorld?hand.worldToLocal(new THREE.Vector3().fromArray(state.rightPalmWorld)):null;
 const depth=bone=>{let n=0;for(let p=bone;p;p=p.parent)n++;return n;};
 for(const layer of layers){const bones=Object.entries(layer).map(([name,q])=>[attachment.model.bones.get(name),q]);bones.sort((a,b)=>depth(a[0])-depth(b[0]));
  for(const[bone,q]of bones){attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(q).normalize(),1)).normalize();bone.updateMatrixWorld(true);}}
 if(palm){state.rightPalmWorld=hand.localToWorld(palm).toArray();if(state.rightSurfaceTargetWorld&&state.rightContactErrorM!==null)
  state.rightContactErrorM=new THREE.Vector3().fromArray(state.rightPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.rightSurfaceTargetWorld));}
}

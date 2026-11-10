import * as THREE from 'three';
// Linxu, QBU85 rifle idle: independently authored right wrist, hand and fingers only.
const layers=[{"mixamorig:RightHand":[-0.07037089765071869,0.0026687681674957275,-0.05135110020637512,0.9961947798728943],"mixamorig:RightHandPinky1":[0.008947566151618958,0.013809502124786377,-0.015517055988311768,0.9997442364692688],"mixamorig:RightHandPinky2":[0.010401769541203976,0.017442313954234123,-0.03436518833041191,0.9992029666900635],"mixamorig:RightHandPinky3":[0.010089229792356491,2.7783224140875973e-05,-0.04241742938756943,0.9990490674972534]},{"mixamorig:RightArm":[-0.0028875446878373623,0.000579833984375,-0.016512300819158554,0.9998593926429749],"mixamorig:RightForeArm":[-0.025248106569051743,-0.004162594210356474,0.008948593400418758,0.9996324777603149],"mixamorig:RightHand":[0.011202174238860607,-0.004420504905283451,0.0012435618555173278,0.9999268054962158]},{"mixamorig:RightHandThumb1":[0.06571809202432632,0.05206909030675888,0.02379094436764717,0.9961947798728943]}];
export function applyLinxuQbu85Grip(attachment,motion){
 if(attachment.characterId!=='linxu'||attachment.selectedWeapon!=='qbu85'||motion!=='RifleIdle'||!attachment.state.visible)return;
 const state=attachment.state,hand=attachment.model.bones.get('mixamorig:RightHand');
 const palm=state.rightPalmWorld?hand.worldToLocal(new THREE.Vector3().fromArray(state.rightPalmWorld)):null;
 const depth=bone=>{let n=0;for(let p=bone;p;p=p.parent)n++;return n;};
 for(const layer of layers){const bones=Object.entries(layer).map(([name,q])=>[attachment.model.bones.get(name),q]);bones.sort((a,b)=>depth(a[0])-depth(b[0]));
  for(const[bone,q]of bones){attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(q).normalize(),1)).normalize();bone.updateMatrixWorld(true);}}
 if(palm){state.rightPalmWorld=hand.localToWorld(palm).toArray();if(state.rightSurfaceTargetWorld&&state.rightContactErrorM!==null)
  state.rightContactErrorM=new THREE.Vector3().fromArray(state.rightPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.rightSurfaceTargetWorld));}
}

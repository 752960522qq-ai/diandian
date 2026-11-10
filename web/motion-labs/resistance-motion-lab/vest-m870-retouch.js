import * as THREE from 'three';
// Blender-authored for vest resistance M870 firing, applied only near the end.
const layers = [{"boneDeltas":{"mixamorig:LeftArm":[-0.04174336791038513,-0.015520036220550537,-0.0704353004693985,0.9965217113494873],"mixamorig:LeftForeArm":[0.03636569902300835,0.0037783985026180744,-0.024519529193639755,0.9990305304527283],"mixamorig:LeftHand":[0.04989606887102127,0.0054731667041778564,0.08729091286659241,0.9949175119400024],"mixamorig:RightArm":[-0.006701618432998657,0.02801191806793213,-0.02751271426677704,0.9992064237594604],"mixamorig:RightForeArm":[0.05979747325181961,-0.002453714841976762,-0.05267363041639328,0.996816873550415],"mixamorig:RightHand":[-0.0789315477013588,0.02376386895775795,0.07642555981874466,0.9936620593070984]},"window":[0.15,0.23],"gunDelta":{"translationWorld":[0.0,0.05000000074505806,-0.0],"rotationLocal":[0.0,0.0,0.0,1.0],"pivot":"RightHand","window":[0.15,0.23]}},{"boneDeltas":{"mixamorig:LeftHandMiddle1":[-0.029622767120599747,0.005308967083692551,-0.05806133523583412,0.9978592991828918],"mixamorig:LeftHandMiddle2":[-0.059187501668930054,0.002411235123872757,-0.027723103761672974,0.997859001159668],"mixamorig:LeftHandMiddle3":[-0.06136707216501236,1.780875027179718e-05,-0.022615090012550354,0.997859001159668],"mixamorig:LeftHandPinky1":[-0.03925994411110878,0.023585636168718338,-0.06370442360639572,0.9969173073768616],"mixamorig:LeftHandPinky2":[-0.06971307843923569,0.009651394560933113,-0.03468099236488342,0.9969174265861511],"mixamorig:LeftHandPinky3":[-0.07485339790582657,5.081295967102051e-05,-0.023512765765190125,0.9969173669815063],"mixamorig:LeftHandRing1":[-0.05434641242027283,0.005044836550951004,-0.05636392533779144,0.9969173669815063],"mixamorig:LeftHandRing2":[-0.07256876677274704,0.0021975694689899683,-0.029745139181613922,0.9969173669815063],"mixamorig:LeftHandRing3":[-0.0755704864859581,5.100107955513522e-05,-0.021094737574458122,0.9969173073768616]},"window":[0.15,0.23],"gunDelta":null}];
export function applyVestM870Firing(attachment, motion, time) {
  if (attachment.characterId !== 'vest' || attachment.selectedWeapon !== 'm870' || motion !== 'FiringRifle' || !attachment.state.visible) return;
  if (time <= .15) return;
  const gun=attachment.weapons.get('m870'),state=attachment.state;
  const left=attachment.model.bones.get('mixamorig:LeftHand'),right=attachment.model.bones.get('mixamorig:RightHand');
  const localPoint=(object,point)=>point?object.worldToLocal(new THREE.Vector3().fromArray(point)):null;
  const leftPalm=localPoint(left,state.leftPalmWorld),rightPalm=localPoint(right,state.rightPalmWorld);
  const support=localPoint(gun,state.supportTargetWorld),rightTarget=localPoint(gun,state.rightSurfaceTargetWorld);
  const depth=bone=>{let n=0;for(let p=bone;p;p=p.parent)n++;return n;};
  for(const layer of layers){
    const [start,end]=layer.window,x=THREE.MathUtils.clamp((time-start)/(end-start),0,1),weight=x*x*(3-2*x);
    if(weight===0)continue;
    if(layer.gunDelta){const g=layer.gunDelta,pivot=attachment.model.bones.get('mixamorig:'+g.pivot).getWorldPosition(new THREE.Vector3());
      const local=new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(g.rotationLocal).normalize(),weight);
      const original=gun.quaternion.clone(),world=original.clone().multiply(local).multiply(original.clone().invert());
      gun.position.sub(pivot).applyQuaternion(world).add(pivot).addScaledVector(new THREE.Vector3().fromArray(g.translationWorld),weight);
      gun.quaternion.multiply(local).normalize();gun.updateMatrixWorld(true);
    }
    const bones=Object.entries(layer.boneDeltas).map(([name,q])=>[attachment.model.bones.get(name),q]);
    bones.sort((a,b)=>depth(a[0])-depth(b[0]));
    for(const[bone,q]of bones){attachment.saveBone(bone);bone.quaternion.multiply(new THREE.Quaternion().slerp(new THREE.Quaternion().fromArray(q).normalize(),weight)).normalize();bone.updateMatrixWorld(true);}
  }
  state.weaponPosition=gun.position.toArray();state.weaponQuaternion=gun.quaternion.toArray();
  if(leftPalm)state.leftPalmWorld=left.localToWorld(leftPalm).toArray();
  if(rightPalm)state.rightPalmWorld=right.localToWorld(rightPalm).toArray();
  if(support)state.supportTargetWorld=gun.localToWorld(support).toArray();
  if(rightTarget)state.rightSurfaceTargetWorld=gun.localToWorld(rightTarget).toArray();
  if(state.leftPalmWorld&&state.supportTargetWorld&&state.leftContactErrorM!==null)
    state.leftContactErrorM=new THREE.Vector3().fromArray(state.leftPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.supportTargetWorld));
  if(state.rightPalmWorld&&state.rightSurfaceTargetWorld&&state.rightContactErrorM!==null)
    state.rightContactErrorM=new THREE.Vector3().fromArray(state.rightPalmWorld).distanceTo(new THREE.Vector3().fromArray(state.rightSurfaceTargetWorld));
}

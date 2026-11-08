import * as THREE from 'three';

export const fixedGunMotions = [
  {name:'QJZ89Idle',label:'机枪站立待机',loop:true,emplacement_only:true},
  {name:'QJZ89Aim',label:'机枪站立瞄准',loop:true,emplacement_only:true}
];
export const fixedGunMotionNames=new Set(fixedGunMotions.map(m=>m.name));

export function installFixedGunMotions(model) {
  for(const [name,source] of [['QJZ89Idle','RocketIdle'],['QJZ89Aim','RocketAimLevel']]) {
    const clip=model.actions.get(source).getClip().clone();clip.name=name;
    clip.userData={source,role:'standing fixed machine gun operator'};
    model.actions.set(name,model.mixer.clipAction(clip));
  }
}

// Standing emplacement: the stock follows the shoulder pocket while both
// hands remain on the grip and stock. No carrying or locomotion is enabled.
export function applyFixedGunPose(attachment,motion,time) {
  const {model,character,config}=attachment;
  const mount=character.mounts.qjz89,data=config.weapons.qjz89;
  const gun=attachment.weapons.get('qjz89');
  const vector=v=>new THREE.Vector3(...v),quaternion=v=>new THREE.Quaternion(...v).normalize();
  gun.quaternion.fromArray(mount.fixed_quaternion_xyzw);gun.scale.setScalar(1);
  const pocket=attachment.bones.RightArm.getWorldPosition(new THREE.Vector3())
    .add(vector(mount.shoulder_offset_weapon_m).applyQuaternion(gun.quaternion));
  gun.position.copy(pocket).sub(vector(data.butt_contact).applyQuaternion(gun.quaternion));
  gun.updateMatrixWorld(true);
  const scale=model.wrapper.getWorldScale(new THREE.Vector3()).x*(character.hand_scale??1)*(character.baked_hand_scale??1);
  for(const side of ['Right','Left']) {
    const lower=side.toLowerCase(),rotation=gun.quaternion.clone().multiply(quaternion(mount[lower+'_hand_quaternion_weapon']));
    const offset=vector(mount[lower+'_contact_offset_native']).multiplyScalar(scale);
    const contact=gun.localToWorld(vector(data[lower+'_grip']));
    const wrist=contact.clone().sub(offset.clone().applyQuaternion(rotation));
    attachment.solveArm(side,wrist,rotation,1,null,.65,side==='Right'?90:0,.25,.4,.45);
    const hand=attachment.bones[side+'Hand'];
    const actual=offset.applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())).add(hand.getWorldPosition(new THREE.Vector3()));
    attachment.state[lower+'ContactErrorM']=actual.distanceTo(contact);
    attachment.state[lower+'PalmWorld']=actual.toArray();
    attachment.state[lower+'TargetWorld']=contact.toArray();
  }
  attachment.state.supportTargetWorld=attachment.state.leftTargetWorld;
  attachment.state.shoulderTargetWorld=pocket.toArray();
  attachment.state.shoulderContactWorld=gun.localToWorld(vector(data.butt_contact)).toArray();
  attachment.state.shoulderContactErrorM=vector(attachment.state.shoulderContactWorld).distanceTo(pocket);
  attachment.state.weaponPosition=gun.position.toArray();
  attachment.state.weaponQuaternion=gun.quaternion.toArray();
  attachment.state.barrelPitchDegrees=0;
  attachment.state.fixedEmplacement=true;
  attachment.state.modelScale=1;
}

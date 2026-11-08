import fs from 'node:fs';
import * as T from 'three';
import {read} from '../qa/validate_pf89.mjs';
import {measureHands,calibrateGrips} from './resistance_hand_geometry_r47.mjs';
const base='web/motion-labs/diandian-classic-motion-lab';
const out='web/motion-labs/linxu-motion-lab';
const source=JSON.parse(fs.readFileSync(base+'/assets/weapon_attachment.json'));
const ids=['qbz95','type56_1','qbu85','type97hawk','qcq171'];
const motions=['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading','ShotgunPump','Type97Fire','Type97Pump'];
const cfg={revision:'Linxu v1 anatomical hand contacts',coordinate_system:source.coordinate_system,weapons:Object.fromEntries(ids.map(id=>[id,source.weapons[id]])),characters:{}};
const q=a=>new T.Quaternion().fromArray(a).normalize();
for(const cid of ['linxu']){
 const path='assets/characters/linxu_motion';
 const cal=JSON.parse(fs.readFileSync(path+'/retarget_calibration.json'));
 const cr=q(cal.bones['mixamorig:RightHand'].source_to_target_local_rotation),cl=q(cal.bones['mixamorig:LeftHand'].source_to_target_local_rotation);
 const hands=await measureHands(path+'/character.glb');
 const palms={right:hands.Right.contact,left:hands.Left.contact};
 const char=cfg.characters[cid]={native_height_m:1,target_height_m:1.75,hand_scale:1,palm_offset_native:palms.right,left_palm_offset_native:palms.left,support_pose_weight:1,finger_pose_weight:.8,shoulder_assist_max_degrees:12,mounts:{}};
 for(const id of ids){
  const src=source.characters.diandian.mounts[id];
  const convert=(m)=>{
   m=structuredClone(m);delete m.motions;delete m.chest_skinning_relief;
   m.quaternion_xyzw=cr.clone().multiply(q(m.quaternion_xyzw)).toArray();
   if(m.right_hand_quaternion_offset)m.right_hand_quaternion_offset=cr.clone().multiply(q(m.right_hand_quaternion_offset)).multiply(cr.clone().invert()).toArray();
   if(m.right_hand_quaternion_weapon)m.right_hand_quaternion_weapon=q(m.right_hand_quaternion_weapon).multiply(cr.clone().invert()).toArray();
   if(m.left_hand_quaternion_weapon)m.left_hand_quaternion_weapon=q(m.left_hand_quaternion_weapon).multiply(cl.clone().invert()).toArray();
   m.palm_offset_native=palms.right;m.right_contact_offset_native=palms.right;m.left_palm_offset_native=palms.left;
   m.support_pose_weight=m.release_support_hand?0:1;
   for(const field of ['right_finger_quaternion_offsets','support_finger_quaternion_offsets'])for(const [n,v] of Object.entries(m[field]||{})){
    const bone=cal.bones[n.startsWith('mixamorig:')?n:'mixamorig:'+n];
    if(bone){const c=q(bone.source_to_target_local_rotation);m[field][n]=c.clone().multiply(q(v)).multiply(c.clone().invert()).toArray();}
   }
   return m;
  };
  char.mounts[id]=convert(src);char.mounts[id].motions={};
  for(const motion of motions){const actual=source.weapons[id].animation_overrides?.[motion];const m={...src,...(source.characters.diandian.mounts[motion]||{}),...(src.motions?.[motion]||{}),...(actual?src.motions?.[actual]||{}:{})};char.mounts[id].motions[motion]=convert(m);}
  // The authored reload moves the free hand between magazine and receiver.
  char.mounts[id].motions.Reloading.release_support_hand=true;
  char.mounts[id].motions.Reloading.support_pose_weight=0;
 }
 await calibrateGrips(char,cfg.weapons,hands,base+'/assets/weapons');
 fs.writeFileSync(path+'/hand_surface_calibration.json',JSON.stringify(hands,null,2)+'\n');
 fs.mkdirSync(`${out}/assets/characters/${cid}`,{recursive:true});
 for(const f of ['character.glb','motions.glb'])if(fs.existsSync(`${path}/${f}`))fs.copyFileSync(`${path}/${f}`,`${out}/assets/characters/${cid}/${f}`);
}
fs.writeFileSync(out+'/assets/weapon_attachment.json',JSON.stringify(cfg,null,2)+'\n');
console.log('Calibrated Linxu and five weapons.');

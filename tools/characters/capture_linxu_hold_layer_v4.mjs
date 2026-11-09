// Author a steady right-hand hold for a generic released-left-hand reload.
// Torso ancestry is deliberately recalibrated; this is not a magazine exchange.
import fs from 'node:fs';import * as T from 'three';import{setupLinxu}from '../qa/validate_linxu_motion.mjs';
const file='web/motion-labs/linxu-motion-lab/assets/weapon_attachment.json',cfg=JSON.parse(fs.readFileSync(file)),rt=await setupLinxu('linxu'),rows=[];
for(const weapon of (process.argv[2]||'type56_1,qcq171').split(',')){
 rt.pose('RifleIdle',rt.duration('RifleIdle',weapon)*.37,weapon);const gun=rt.attachment.weapons.get(weapon),frame=rt.bones.get('mixamorig:Spine2'),quats={};
 for(const name of ['Spine1','Spine2','Neck','Head','RightShoulder','RightArm','RightForeArm','RightHand'])quats[name]=rt.bones.get('mixamorig:'+name).quaternion.toArray();
 const fields={weapon_frame_bone:'Spine2',weapon_frame_position_native:frame.worldToLocal(gun.getWorldPosition(new T.Vector3())).toArray(),weapon_frame_rotation_xyzw:frame.getWorldQuaternion(new T.Quaternion()).invert().multiply(gun.getWorldQuaternion(new T.Quaternion())).toArray(),upper_body_local_quaternions:quats,shoulder_local_quaternions:{},shoulder_contact:false,weapon_offset_body_m:[0,0,0],weapon_offset_weapon_m:[0,0,0],right_forearm_twist_weight:0,right_upper_arm_twist_weight:0,right_elbow_swivel_degrees:null,right_elbow_swivel_track:null,right_elbow_hint_weapon_m:null,right_elbow_lift_ratio:null,right_elbow_offset_body_m:null,right_elbow_from_hand_weight:0,right_elbow_outward_weight:0,weapon_body_clearance_track:null,support_elbow_swivel_track:null,reload_clearance_track:null,reload_support_shift_weapon_m:null};
 Object.assign(cfg.characters.linxu.mounts[weapon].motions.Reloading,fields);rows.push({weapon,motion:'Reloading',source:'Reviewed RifleIdle at phase 0.37, right hold and torso only; left local gesture remains released.',fields});
}
fs.writeFileSync(file,JSON.stringify(cfg,null,2)+'\n');fs.writeFileSync('work/linxu-motion-v4/reload-hold-layers.json',JSON.stringify(rows,null,2)+'\n');console.log(rows.map(r=>r.weapon));

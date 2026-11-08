// Calibrate the military QCQ171 run against its posed glove web, rather than
// treating the rest-pose thumb-influenced point as a rigid palm point.
import fs from 'node:fs';
import * as T from 'three';
import {setupResistance} from '../qa/validate_resistance_r48.mjs';
const path='web/motion-labs/resistance-motion-lab/assets/weapon_attachment.json';
const cfg=JSON.parse(fs.readFileSync(path)),baseline=JSON.parse(fs.readFileSync('assets/characters/resistance_r47/weapon_attachment.json'));
const mount=cfg.characters.military.mounts.qcq171.motions.RifleRun;
mount.right_contact_offset_native=baseline.characters.military.mounts.qcq171.motions.RifleRun.right_contact_offset_native;
const model=await setupResistance('military');model.attachment.config=cfg;model.attachment.character=cfg.characters.military;
const state=model.pose('RifleRun',model.duration('RifleRun','qcq171')*.37,'qcq171'),gun=model.attachment.weapons.get('qcq171');
const target=new T.Vector3().fromArray(state.rightSurfaceTargetWorld),inward=new T.Vector3(-1,0,0).applyQuaternion(gun.quaternion);
const meshes=[];model.root.traverse(o=>{if(o.isSkinnedMesh){o.material=new T.MeshBasicMaterial({side:T.DoubleSide});o.computeBoundingSphere();o.computeBoundingBox();meshes.push(o);}});
function weight(mesh,index){let sum=0;for(let j=0;j<4;j++){const b=mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(index,j)].name;if(/RightHand(?:Thumb\d+)?$/.test(b))sum+=mesh.geometry.attributes.skinWeight.getComponent(index,j);}return sum;}
const ray=new T.Raycaster(target.clone().addScaledVector(inward,.035),inward.clone().negate(),0,.08);
const hit=ray.intersectObjects(meshes,false).find(h=>h.face&&[h.face.a,h.face.b,h.face.c].every(i=>weight(h.object,i)>.9));
if(!hit)throw Error('No posed right web surface at QCQ171 contact');
const original=[...mount.right_contact_offset_native],corrected=model.bones.get('mixamorig:RightHand').worldToLocal(hit.point.clone()).toArray();
if(new T.Vector3().fromArray(corrected).distanceTo(new T.Vector3().fromArray(original))>.015)throw Error('Unexpected large palm correction');
mount.right_contact_offset_native=corrected;
fs.writeFileSync(path,JSON.stringify(cfg,null,2)+'\n');
fs.writeFileSync('web/motion-labs/verification_r48/qcq171-run-contact-calibration.json',JSON.stringify({character:'military',weapon:'qcq171',motion:'RifleRun',changed_field:'right_contact_offset_native',rest_offset:original,posed_offset:corrected,original_world_surface_offset_m:hit.point.distanceTo(target),method:'Exact posed glove-web ray intersection; preserve weapon placement and reference hand/finger rotations. Apply only to military QCQ171 RifleRun.'},null,2)+'\n');
console.log({original,corrected,worldOffset:hit.point.distanceTo(target)});

// Hand resizing changes the rest-pose bounding box. Keep the R43 preview origin
// so all existing weapon/character placement remains unchanged in world space.
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {read,decode,encode} from '../qa/validate_pf89.mjs';
const files=[
 'assets/characters/diandian_classic/diandian_classic_fixed.glb',
 'web/motion-labs/diandian-classic-motion-lab/assets/diandian_fixed.glb',
 'web/motion-labs/diandian-classic-motion-lab/assets/diandian_before.glb',
];
for(const file of files){
 const {g,bin}=decode(file);
 if(!g.asset.extras.preview_normalization){
  const original=await read('work/r44-baseline/'+file),box=new THREE.Box3().setFromObject(original.scene);
  g.asset.extras.preview_normalization={scale:1.75/(box.max.y-box.min.y),center:box.getCenter(new THREE.Vector3()).toArray(),floor:box.min.y};
 }
 fs.writeFileSync(file,encode(g,bin));
 console.log('R44_PRESERVED_ORIGIN',file);
}
const reportFile='assets/characters/diandian_classic/hand_scale_r44.json';
const report=JSON.parse(fs.readFileSync(reportFile));
for(const entry of report){entry.sha256=crypto.createHash('sha256').update(fs.readFileSync(entry.file)).digest('hex');entry.preview_origin_preserved=true;}
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');

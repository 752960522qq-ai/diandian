/** Deterministic build from reviewed V4 authoring data, not a fresh optimization. */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
fs.mkdirSync('work/linxu-motion-v4',{recursive:true});
const run=(bin,...args)=>{const p=spawnSync(bin,args,{stdio:'inherit'});if(p.status!==0)throw Error(`${bin} ${args.join(' ')} failed`);};
run('node','tools/gltf/shorten_linxu_neck_v4.mjs');
run('python3','tools/gltf/build_linxu_browser_character.py');
fs.copyFileSync('assets/characters/linxu_motion_v3/fitting_v4/attachment_v4_authored.json','web/motion-labs/linxu-motion-lab/assets/weapon_attachment.json');
run('node','tools/gltf/bake_linxu_grips_v3.mjs');
run('node','tools/qa/validate_linxu_neck_v4.mjs');
run('node','tools/qa/validate_linxu_motion.mjs','--out=web/motion-labs/verification_linxu_v4');
// Expensive surface verification is deliberately explicit:
// node tools/qa/audit_linxu_dense_collisions_v4.mjs

import fs from 'node:fs';import * as T from 'three';
import {read,decode,encode,setup} from '../../tools/qa/validate_pf89.mjs';
import {prepareRig} from '../../web/motion-labs/linxu-motion-lab/rig.js';
const site='web/motion-labs/linxu-motion-lab',dir='work/linxu-motion-v3/poses';fs.mkdirSync(dir,{recursive:true});
function posed(file,model,transform,out){const {g,bin}=decode(file);delete g.animations;for(const n of g.nodes){const b=model.bones?.get(n.name);if(b){n.translation=b.position.toArray();n.rotation=b.quaternion.toArray();n.scale=b.scale.toArray();delete n.matrix;}}const index=g.nodes.length;g.nodes.push({name:'PreviewTransform',translation:transform.position.toArray(),rotation:transform.quaternion.toArray(),scale:transform.scale.toArray(),children:g.scenes[g.scene||0].nodes});g.scenes[g.scene||0].nodes=[index];fs.writeFileSync(out,encode(g,bin));}
const current=JSON.parse(fs.readFileSync(site+'/assets/weapon_attachment.json')),old=JSON.parse(fs.readFileSync('assets/characters/linxu_motion_v3/source_weapon_attachment_v2.json'));
const source=await setup('diandian');
for(const wid of (process.argv[2]||'qbz95,type56_1,qbu85,type97hawk,qcq171').split(','))for(const motion of (process.argv[3]||'RifleAimingIdle').split(',')){
 for(const cid of ['linxu'])for(const [ver,cfg]of [['before',old],['after',current]]){
 const file=`${site}/assets/characters/${cid}/character.glb`,weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(`${site}/assets/weapons/${id}.glb`)).scene]))),m=prepareRig(await read(file),await read(`${site}/assets/characters/${cid}/motions.glb`),cid,cfg,weapons,new T.Scene());m.pose(motion,m.duration(motion,wid)*.37,wid);
 posed(file,m,m.wrapper,`${dir}/${cid}-${wid}-${motion}-${ver}.glb`);posed(`${site}/assets/weapons/${wid}.glb`,{},m.attachment.weapons.get(wid),`${dir}/${cid}-${wid}-${motion}-${ver}-gun.glb`);
 }
 const actual=source.cfg.weapons[wid].animation_overrides?.[motion]||motion;source.pose(motion,source.model.actions.get(actual).getClip().duration*.37,wid);
 posed(source.file,source.model,source.model.wrapper,`${dir}/diandian-${wid}-${motion}-reference.glb`);posed(`${source.dir}/assets/weapons/${wid}.glb`,{},source.attachment.weapons.get(wid),`${dir}/diandian-${wid}-${motion}-reference-gun.glb`);
}

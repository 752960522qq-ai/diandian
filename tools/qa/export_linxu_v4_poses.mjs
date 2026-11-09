import fs from 'node:fs';import * as T from 'three';import{read,decode,encode}from './validate_pf89.mjs';import{prepareRig}from '../../web/motion-labs/linxu-motion-lab/rig.js';
const site='web/motion-labs/linxu-motion-lab',dir='work/linxu-motion-v4/poses';fs.mkdirSync(dir,{recursive:true});
function exportPose(file,model,root,transform,out){const{g,bin}=decode(file);delete g.animations;for(const n of g.nodes){const o=model?.bones.get(n.name)||root?.getObjectByName(n.name);if(o){n.translation=o.position.toArray();n.rotation=o.quaternion.toArray();n.scale=o.scale.toArray();delete n.matrix;}}const i=g.nodes.length;g.nodes.push({name:'PreviewTransform',translation:transform.position.toArray(),rotation:transform.quaternion.toArray(),scale:transform.scale.toArray(),children:g.scenes[g.scene||0].nodes});g.scenes[g.scene||0].nodes=[i];fs.writeFileSync(out,encode(g,bin));}
const cfgs={before:JSON.parse(fs.readFileSync('assets/characters/linxu_motion_v3/fitting_v4/source_attachment_v3.json')),after:JSON.parse(fs.readFileSync(site+'/assets/weapon_attachment.json'))};
for(const [ver,cfg]of Object.entries(cfgs)){
 const file=ver==='before'?'assets/characters/linxu_motion/character.glb':`${site}/assets/characters/linxu/character.glb`,weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(`${site}/assets/weapons/${id}.glb`)).scene]))),m=prepareRig(await read(file),await read(`${site}/assets/characters/linxu/motions.glb`),'linxu',cfg,weapons,new T.Scene());
 for(const w of (process.argv[2]||Object.keys(cfg.weapons).join(',')).split(','))for(const motion of (process.argv[3]||'RifleAimingIdle').split(','))for(const phase of (process.argv[4]||'.37').split(',').map(Number)){
  m.pose(motion,m.duration(motion,w)*phase,w);const gun=m.attachment.weapons.get(w),prefix=`${dir}/${w}-${motion}-${Math.round(phase*100)}-${ver}`;exportPose(file,m,null,m.wrapper,prefix+'.glb');exportPose(`${site}/assets/weapons/${w}.glb`,null,gun,gun,prefix+'-gun.glb');
 }
}

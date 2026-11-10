import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import * as T from 'three';
import {read,decode,encode} from '../qa/validate_pf89.mjs';
export {read,decode,encode};
export async function runtime(cid,root=process.cwd()){
 const site=path.join(root,`web/motion-labs/${cid==='linxu'?'linxu':'resistance'}-motion-lab`),cfg=JSON.parse(fs.readFileSync(site+'/assets/weapon_attachment.json')),weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(`${site}/assets/weapons/${id}.glb`)).scene]))),file=`${site}/assets/characters/${cid}/character.glb`,g=await read(file),p=await read(`${site}/assets/characters/${cid}/motions.glb`),ename=fs.existsSync(`${site}/assets/characters/${cid}/weapon_update_v7.glb`)?'weapon_update_v7':'weapon_update_v6',extra=await read(`${site}/assets/characters/${cid}/${ename}.glb`),{prepareRig}=await import(pathToFileURL(site+'/rig.js'));
 const model=prepareRig(g,p,cid,cfg,weapons,new T.Scene(),extra);return {model,file,site,cfg,gltf:g,pack:p,extra};
}

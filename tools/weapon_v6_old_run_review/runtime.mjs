/** Self-contained, read-only Linxu QA loader. No dependency on scratch snapshots or other QA tool folders. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const ROOT=fileURLToPath(new URL('../..',import.meta.url));
export const SITE=path.resolve(ROOT,process.env.LINXU_OLD_RUN_SITE||'web/motion-labs/linxu-motion-lab');
export const BASE=path.resolve(ROOT,process.env.WEAPON_V6_BASELINE||'../character_adapt_baseline');
export const OUT=path.resolve(ROOT,process.env.LINXU_OLD_RUN_OUTPUT||'web/motion-labs/verification_weapon_v6_old_run_review');
globalThis.ProgressEvent??=class{constructor(type,opts){Object.assign(this,opts);this.type=type;}};
export function decode(file){const b=fs.readFileSync(file);if(b.toString('ascii',0,4)!=='glTF')throw Error('Expected materialized GLB, not an LFS pointer or other file: '+file);const n=b.readUInt32LE(12);return{g:JSON.parse(b.subarray(20,20+n).toString()),bin:b.subarray(28+n)};}
export function encode(g,bin){const j=Buffer.from(JSON.stringify(g)),jp=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]),bp=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]),o=Buffer.alloc(28+jp.length+bp.length);o.write('glTF');o.writeUInt32LE(2,4);o.writeUInt32LE(o.length,8);o.writeUInt32LE(jp.length,12);o.write('JSON',16);jp.copy(o,20);o.writeUInt32LE(bp.length,20+jp.length);o.write('BIN\0',24+jp.length);bp.copy(o,28+jp.length);return o;}
export async function read(file){const{g,bin}=decode(file);delete g.images;delete g.textures;delete g.samplers;delete g.materials;for(const m of g.meshes||[])for(const p of m.primitives)delete p.material;const b=encode(g,bin);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
export async function runtime(kind='current'){
 const dir=kind==='baseline'?path.join(BASE,'web/motion-labs/linxu-motion-lab'):kind==='current'?SITE:path.resolve(ROOT,kind),file=dir+'/assets/characters/linxu/character.glb';
 for(const p of ['rig.js','app.js','assets/weapon_attachment.json','assets/characters/linxu/character.glb','assets/characters/linxu/motions.glb'])if(!fs.existsSync(dir+'/'+p))throw Error('Missing required '+kind+' site input: '+dir+'/'+p+'. Baseline must be the materialized original81d5a48 site; no current-source fallback is used.');
 const cfg=JSON.parse(fs.readFileSync(dir+'/assets/weapon_attachment.json')),weapons=new Map(await Promise.all(Object.keys(cfg.weapons).map(async id=>[id,(await read(dir+'/assets/weapons/'+id+'.glb')).scene]))),gltf=await read(file),pack=await read(dir+'/assets/characters/linxu/motions.glb'),xp=dir+'/assets/characters/linxu/'+(fs.readFileSync(dir+'/app.js','utf8').includes('weapon_update_v6.glb')?'weapon_update_v6.glb':'weapon_update_v5.glb'),extra=fs.existsSync(xp)?await read(xp):{animations:[]},scene=new T.Scene(),{prepareRig}=await import(pathToFileURL(dir+'/rig.js')),model=prepareRig(gltf,pack,'linxu',cfg,weapons,scene,extra);scene.updateMatrixWorld(true);
 const rest=new Map();model.root.traverse(o=>rest.set(o,{p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));
 const restore=()=>{model.attachment.beforeAnimation();model.mixer.stopAllAction();for(const[o,v]of rest){o.position.copy(v.p);o.quaternion.copy(v.q);o.scale.copy(v.s);}scene.updateMatrixWorld(true);};
 return{dir,file,gltf,pack,extra,scene,model,cfg,restore,duration:(m,w='none')=>model.duration(m,w)};
}

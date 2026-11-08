// Run from any directory: node tools/qa/validate_non_pf89_regression.mjs [baseline-ref]
// Extracts original runtime modules into ignored work/, never overwrites production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {read} from './validate_pf89.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url)), ref=process.argv[2]||'2ddb672';
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:128*1024*1024});
const baselineCommit=git('rev-parse',ref).toString().trim();
const baselineRoot=path.join(root,'work/pf89-r39/non-pf89-baseline',baselineCommit);
const report={baselineCommit,tolerance:1e-10,scope:'All non-PF89 weapons, common motion catalog, both characters; local and world transforms, visibility, config, immutable assets',characters:{}};
const differences=[];
function compare(a,b,label,stats) {
 if(typeof a==='number'&&typeof b==='number') {const delta=Math.abs(a-b);stats.maxDelta=Math.max(stats.maxDelta,delta);if(!Number.isFinite(delta)||delta>report.tolerance)differences.push({label,baseline:a,current:b});return;}
 if(Array.isArray(a)&&Array.isArray(b)){if(a.length!==b.length)differences.push({label,reason:'length'});for(let i=0;i<Math.min(a.length,b.length);i++)compare(a[i],b[i],`${label}[${i}]`,stats);return;}
 if(a&&b&&typeof a==='object'&&typeof b==='object'){if(JSON.stringify(Object.keys(a).sort())!==JSON.stringify(Object.keys(b).sort()))differences.push({label,reason:'keys'});for(const k of Object.keys(a))compare(a[k],b[k],`${label}.${k}`,stats);return;}
 if(a!==b)differences.push({label,baseline:a,current:b});
}
function snapshot(rt){
 const transform=o=>({position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),world:o.matrixWorld.toArray(),visible:o.visible});
 const bones=Object.fromEntries([...new Set(rt.model.bones.values())].map(b=>[b.name,transform(b)]));
 const weapons={};for(const [id,weapon] of rt.attachment.weapons){if(id==='pf89')continue;const nodes=[];weapon.traverse(o=>nodes.push({name:o.name,...transform(o)}));weapons[id]=nodes;}
 return {bones,weapons};
}
async function setup(cid,dir,assetDir){
 const gltf=await read(path.join(assetDir,'assets',`${cid}_fixed.glb`));
 const scene=new THREE.Scene(),wrapper=new THREE.Group(),box=new THREE.Box3().setFromObject(gltf.scene),scale=1.75/(box.max.y-box.min.y),center=box.getCenter(new THREE.Vector3());
 wrapper.scale.setScalar(scale);wrapper.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);wrapper.add(gltf.scene);scene.add(wrapper);
 const bones=new Map();gltf.scene.traverse(o=>{if(o.isBone){bones.set(o.name,o);bones.set(o.userData.name||o.name,o);}});
 const mixer=new THREE.AnimationMixer(gltf.scene),actions=new Map();for(const clip of gltf.animations)actions.set(clip.name,mixer.clipAction(clip));
 const model={root:gltf.scene,wrapper,bones,mixer,actions};
 for(const f of ['motion_additions.glb','leon_pistol_animations.glb','re4_shotgun_animations.glb','re4_rocket_upper.glb']){const pack=await read(path.join(assetDir,'assets',f));for(const clip of pack.animations)actions.set(clip.name,mixer.clipAction(clip));}
 const module=async name=>import(pathToFileURL(path.join(dir,name)).href);
 (await module('type97-motion.js')).installType97Motions(model);
 (await module('rocket-motion.js')).installRocketMotions(model);
 const cfg=JSON.parse(fs.readFileSync(path.join(dir,'assets/weapon_attachment.json'))),weapons=new Map();
 for(const id of Object.keys(cfg.weapons))weapons.set(id,(await read(path.join(assetDir,'assets/weapons',id+'.glb'))).scene);
 const {WeaponAttachment}=await module('weapon-attachment.js'),attachment=new WeaponAttachment(model,cfg,cid,weapons,scene);model.weaponAttachment=attachment;
 function pose(motion,t,weapon){attachment.beforeAnimation();mixer.stopAllAction();attachment.setWeapon(weapon);const name=cfg.weapons[weapon].animation_overrides?.[motion]||motion,action=actions.get(name);assert(action,`${cid}/${weapon}/${name}`);action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.time=t;mixer.update(0);scene.updateMatrixWorld(true);attachment.update(motion,t,{activeClips:[{name,weight:1}]});scene.updateMatrixWorld(true);}
 return {model,attachment,cfg,pose};
}
for(const cid of ['diandian','zhigeng']){
 const folder=cid==='diandian'?'diandian-classic-motion-lab':'zhigeng-motion-lab',relative=`web/motion-labs/${folder}`,currentDir=path.join(root,relative),baselineDir=path.join(baselineRoot,relative);
 fs.mkdirSync(path.join(baselineDir,'assets'),{recursive:true});
 const modules=git('ls-tree','-r','--name-only',ref,relative).toString().trim().split('\n').filter(p=>p.endsWith('.js')&&!p.includes('/vendor/'));
 for(const p of [...modules,`${relative}/assets/weapon_attachment.json`]){const out=path.join(baselineRoot,p);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,git('show',`${ref}:${p}`));}
 const baseline=await setup(cid,baselineDir,currentDir),current=await setup(cid,currentDir,currentDir);
 const unaffected=c=>{const result=structuredClone(c);delete result.revision;delete result.weapons.pf89;for(const ch of Object.values(result.characters))delete ch.mounts.pf89;return result;};
 assert.deepEqual(unaffected(current.cfg),unaffected(baseline.cfg),`${cid}: non-PF89 config changed`);
 const assetPaths=git('ls-tree','-r','--name-only',ref,`${relative}/assets`).toString().trim().split('\n').filter(p=>p.endsWith('.glb')&&!p.endsWith('/pf89.glb')&&!p.endsWith('/re4_rocket_upper.glb'));
 for(const p of assetPaths){const expected=git('show',`${ref}:${p}`),actual=fs.readFileSync(path.join(root,p)),lfs=expected.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\noid sha256:([a-f0-9]+)\nsize (\d+)/);assert(lfs ? actual.length===Number(lfs[2])&&createHash('sha256').update(actual).digest('hex')===lfs[1] : actual.equals(expected),`${p}: shared/non-PF89 asset changed`);}
 const stats={weapons:[],motions:[],samples:0,bones:new Set(current.model.bones.values()).size,verifiedUnchangedAssetCount:assetPaths.length,maxDelta:0,configUnchanged:true,unavailableMotionPairs:[]};
 // Include all common armed motions for every weapon, including cross-category selection,
 // unarmed idle/locomotion and the animation overrides used by pistols/C96/Hanyang/shotguns.
 const motions=['Idle','Walk','Run','RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading','PistolIdle','PistolAimingIdle','PistolWalk','ShotgunAimUp','ShotgunAimDown','ShotgunAimLevel','ShotgunPump'];
 for(const weapon of Object.keys(current.cfg.weapons).filter(id=>id!=='pf89')){
  stats.weapons.push(weapon);
  for(const motion of motions){const name=baseline.cfg.weapons[weapon].animation_overrides?.[motion]||motion;if(!baseline.model.actions.has(name)){assert(!current.model.actions.has(name),`${cid}/${weapon}/${name}: availability changed`);stats.unavailableMotionPairs.push({weapon,motion,resolvedClip:name});continue;}const duration=baseline.model.actions.get(name).getClip().duration;
   if(!stats.motions.includes(motion))stats.motions.push(motion);
   for(const t of [0,.2,duration/2,duration]){baseline.pose(motion,t,weapon);current.pose(motion,t,weapon);compare(snapshot(baseline),snapshot(current),`${cid}/${weapon}/${motion}/${t}`,stats);stats.samples++;}
  }
 }
 report.characters[cid]=stats;
}
report.passed=differences.length===0;report.mismatchCount=differences.length;report.firstMismatches=differences.slice(0,20);
const output=path.join(root,'work/pf89-r39/non-pf89-regression.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;

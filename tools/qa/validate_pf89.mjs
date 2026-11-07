// Requires Node.js and three@0.180.0. Optional argv[2]: full asset root with <character>/dist.
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GLTFLoader } from '../../web/motion-labs/diandian-classic-motion-lab/vendor/GLTFLoader.js';

import { installType97Motions, isType97UpperTrack } from '../../web/motion-labs/diandian-classic-motion-lab/type97-motion.js';
import { installRocketMotions } from '../../web/motion-labs/diandian-classic-motion-lab/rocket-motion.js';
globalThis.ProgressEvent=class {constructor(type,opts){Object.assign(this,opts);this.type=type;}};
const cwd=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
const assetRoot=isMain ? process.argv[2] : undefined;
export function decode(file){const bytes=fs.readFileSync(file),len=bytes.readUInt32LE(12);return {g:JSON.parse(bytes.subarray(20,20+len).toString()),bin:bytes.subarray(28+len)};}
export function encode(g,bin){const jb=Buffer.from(JSON.stringify(g));const jp=Buffer.concat([jb,Buffer.alloc((4-jb.length%4)%4,32)]);const bp=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);const out=Buffer.alloc(28+jp.length+bp.length);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jp.length,12);out.write('JSON',16);jp.copy(out,20);out.writeUInt32LE(bp.length,20+jp.length);out.write('BIN\0',24+jp.length);bp.copy(out,28+jp.length);return out;}
export async function read(file){const {g,bin}=decode(file);delete g.images;delete g.textures;delete g.samplers;delete g.materials;for(const m of g.meshes||[])for(const p of m.primitives)delete p.material;const b=encode(g,bin);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
export async function setup(cid){
 const folder=cid==='diandian'?'diandian-classic-motion-lab':'zhigeng-motion-lab';const dir=`${cwd}/web/motion-labs/${folder}`,old=assetRoot ? path.resolve(assetRoot,cid,'dist') : dir;
 const file=old+`/assets/${cid}_fixed.glb`;const gltf=await read(file);const scene=new THREE.Scene(),wrapper=new THREE.Group(),box=new THREE.Box3().setFromObject(gltf.scene),height=box.max.y-box.min.y,scale=1.75/height,center=box.getCenter(new THREE.Vector3());wrapper.scale.setScalar(scale);wrapper.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);wrapper.add(gltf.scene);scene.add(wrapper);
 const bones=new Map();gltf.scene.traverse(o=>{if(o.isBone){bones.set(o.name,o);bones.set(o.userData.name||o.name,o);}});
 const mixer=new THREE.AnimationMixer(gltf.scene),actions=new Map();for(const clip of gltf.animations)actions.set(clip.name,mixer.clipAction(clip));
 const model={root:gltf.scene,wrapper,bones,mixer,actions};
 for(const f of ['motion_additions.glb','leon_pistol_animations.glb','re4_shotgun_animations.glb','re4_rocket_upper.glb']){const pack=await read((f==='re4_rocket_upper.glb'?dir:old)+'/assets/'+f);for(const clip of pack.animations)actions.set(clip.name,mixer.clipAction(clip));}
 installType97Motions(model);const composition=installRocketMotions(model);
 const cfg=JSON.parse(fs.readFileSync(dir+'/assets/weapon_attachment.json','utf8'));const weapons=new Map();for(const id of Object.keys(cfg.weapons)){weapons.set(id,(await read((id==='pf89'?dir:old)+'/assets/weapons/'+id+'.glb')).scene);}
 const { WeaponAttachment }=await import('../../web/motion-labs/'+folder+'/weapon-attachment.js');
 const attachment=new WeaponAttachment(model,cfg,cid,weapons,scene);model.weaponAttachment=attachment;
 function pose(motion,t=0,weapon='pf89') {attachment.beforeAnimation();mixer.stopAllAction();attachment.setWeapon(weapon);const name=cfg.weapons[weapon].animation_overrides?.[motion]||motion;const action=actions.get(name);if(!action)throw Error(name);action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();action.time=t;mixer.update(0);scene.updateMatrixWorld(true);attachment.update(motion,t,{activeClips:[{name,weight:1}]});scene.updateMatrixWorld(true);return attachment.getState();}
 return {cid,dir,old,file,gltf,model,scene,attachment,composition,cfg,pose};
}
if (isMain) {
const report={characters:{},browserQA:{performed:false,reason:'CPU validation only; this script does not launch a browser.'}};
for(const cid of ['diandian','zhigeng']){
 const rt=await setup(cid);const q={lowerMismatch:0,results:[]};
 for(const entry of rt.composition){
  const clip=rt.model.actions.get(entry.name).getClip(),base=rt.model.actions.get(entry.base).getClip();
  for(const track of base.tracks.filter(t=>!isType97UpperTrack(t))){const other=clip.tracks.find(t=>t.name===track.name);if(!other||['times','values'].some(k=>track[k].length!==other[k].length||track[k].some((v,i)=>v!==other[k][i])))q.lowerMismatch++;}
  const motion=Object.entries(rt.cfg.weapons.pf89.animation_overrides).find(([k,v])=>v===entry.name)?.[0]||entry.name;
  for(let i=0;i<=30;i++){const state=rt.pose(motion,entry.duration*i/30);q.results.push({visible:state.visible,supportWeight:state.supportWeight,rightSupportWeight:state.rightSupportWeight,left:state.leftContactErrorM,right:state.rightContactErrorM,pitch:state.barrelPitchDegrees});}
 }
 const locked=q.results.filter(r=>r.visible&&r.supportWeight===1);
 if(q.lowerMismatch)throw Error('Changed lower body');
 if(locked.some(r=>!(r.left<.005&&r.right<.001&&Number.isFinite(r.pitch))))throw Error('Grip/pitch failed');
 let runtimeLowerMismatches=0;
 for(const entry of rt.composition){const motion=Object.entries(rt.cfg.weapons.pf89.animation_overrides).find(([k,v])=>v===entry.name)?.[0]||entry.name;for(const t of [0,entry.duration/2,entry.duration]){rt.pose(motion,t);const base=rt.model.actions.get(entry.base).getClip();for(const track of base.tracks.filter(t=>!isType97UpperTrack(t))){const dot=track.name.lastIndexOf('.'),name=track.name.slice(0,dot),property=track.name.slice(dot+1);const node=rt.model.root.getObjectByName(name);if(!node||!node[property]?.toArray)continue;const expected=Array.from(track.createInterpolant().evaluate(t)),actual=node[property].toArray();if(actual.some((v,i)=>Math.abs(v-expected[i])>1e-5))runtimeLowerMismatches++;}}}
 if(runtimeLowerMismatches)throw Error('Runtime lower body modified');
 const bonePose=()=>Object.fromEntries([...new Set(rt.model.bones.values())].map(b=>[b.name,[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]]));
 rt.pose('RifleAimingIdle',.2);const before=bonePose();
 for(let i=0;i<12;i++){rt.pose('RocketDiscard',.8);rt.pose('RifleWalk',.4,'qbz95');rt.pose('FiringRifle',.2,'type97hawk');rt.pose('RocketDraw',.1);rt.pose('RocketDraw',.56);rt.pose('RifleRun',.3);}
 const afterState=rt.pose('RifleAimingIdle',.2),after=bonePose();let maxPoseDrift=0;for(const k of Object.keys(before))for(let i=0;i<before[k].length;i++)maxPoseDrift=Math.max(maxPoseDrift,Math.abs(before[k][i]-after[k][i]));
 if(maxPoseDrift>1e-5||!afterState.visible)throw Error('Seek/switch drift');
 const {g}=decode(rt.dir+'/assets/re4_rocket_upper.glb');let upperChannels=0;for(const a of g.animations){if(!a.extras?.reference_hips)throw Error('No reference hips');for(const c of a.channels){const n=g.nodes[c.target.node].name;if(/Hips|Leg|Foot|Toe|Root/.test(n)||c.target.path!=='rotation')throw Error('Invalid upper layer');upperChannels++;}}
 report.characters[cid]={actions:rt.composition.length,sampledFrames:q.results.length,lowerTrackMismatches:q.lowerMismatch,runtimeLowerMismatches,maxLockedLeftContactErrorM:Math.max(...locked.map(x=>x.left)),maxRightContactErrorM:Math.max(...q.results.filter(x=>x.visible && (x.rightSupportWeight ?? 1) === 1).map(x=>x.right||0)),maxPoseDrift,upperRotationChannels:upperChannels,sourceActionCount:13,horizontalDerivedActionCount:4};
}
console.log(JSON.stringify(report,null,2));
}

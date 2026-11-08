// Bake the same standing operator solves used by the browser for Blender/Godot.
import fs from 'node:fs';
import {setup,decode,encode}from '../qa/validate_pf89.mjs';
import {fixedGunMotions,installFixedGunMotions}from '../../web/motion-labs/diandian-classic-motion-lab/fixed-machine-gun.js';
const output='assets/animations/emplacements_r43';fs.mkdirSync(output,{recursive:true});
for(const cid of ['diandian','zhigeng']) {
 const rt=await setup(cid);installFixedGunMotions(rt.model);
 const {g}=decode(`assets/animations/motion_lab_r42/${cid}/uploaded_motions.glb`);
 for(const key of ['meshes','skins','images','materials','textures','samplers'])delete g[key];
 for(const node of g.nodes){delete node.mesh;delete node.skin;delete node.weights;}
 g.animations=[];g.accessors=[];g.bufferViews=[];const chunks=[];let length=0;
 const names=g.nodes.filter(n=>n.name?.startsWith('mixamorig:')||n.name?.startsWith('ZG_Ponytail_')).map(n=>n.name);
 function append(values,type) {
  const width={SCALAR:1,VEC3:3,VEC4:4}[type],b=Buffer.alloc(values.length*4);values.forEach((n,i)=>b.writeFloatLE(n,i*4));
  const bufferView=g.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length})-1;chunks.push(b);length+=b.length;
  const accessor={bufferView,componentType:5126,count:values.length/width,type};
  if(type==='SCALAR'){accessor.min=[Math.min(...values)];accessor.max=[Math.max(...values)];}
  return g.accessors.push(accessor)-1;
 }
 for(const entry of fixedGunMotions){
  const duration=rt.model.actions.get(entry.name).getClip().duration,frames=Math.ceil(duration*60),times=Array.from({length:frames+1},(_,i)=>duration*i/frames);
  const rotations=Object.fromEntries(names.map(n=>[n,[]])),hips=[],scales={Left:[],Right:[]};
  for(const t of times){rt.pose(entry.name,t,'qjz89');for(const name of names)rotations[name].push(...rt.model.bones.get(name).quaternion.toArray());hips.push(...rt.model.bones.get('mixamorig:Hips').position.toArray());for(const side of ['Left','Right'])scales[side].push(...rt.model.bones.get('mixamorig:'+side+'Hand').scale.toArray());}
  const input=append(times,'SCALAR'),clip={name:entry.name,samplers:[],channels:[],extras:{source:entry.name.endsWith('Idle')?'RocketIdle':'RocketAimLevel',fixed_emplacement:true,frame_rate:60}};
  const channel=(name,path,values,type)=>{const sampler=clip.samplers.length;clip.samplers.push({input,output:append(values,type),interpolation:'LINEAR'});clip.channels.push({sampler,target:{node:g.nodes.findIndex(n=>n.name===name),path}});};
  for(const name of names)channel(name,'rotation',rotations[name],'VEC4');channel('mixamorig:Hips','translation',hips,'VEC3');
  for(const side of ['Left','Right']){const name='mixamorig:'+side+'Hand';channel(name,'scale',scales[side],'VEC3');g.nodes.find(n=>n.name===name).scale=scales[side].slice(0,3);}
  g.animations.push(clip);
 }
 g.buffers=[{byteLength:length}];const dir=`${output}/${cid}`;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(`${dir}/uploaded_motions.glb`,encode(g,Buffer.concat(chunks)));
 fs.writeFileSync(`${dir}/authoring.json`,JSON.stringify({character:cid,wrapper:{position:rt.model.wrapper.position.toArray(),scale:rt.model.wrapper.scale.toArray()},mount:rt.cfg.characters[cid].mounts.qjz89,weapon:rt.cfg.weapons.qjz89,clips:g.animations.map(a=>({name:a.name,tracks:a.channels.length,...a.extras}))},null,2)+'\n');
 console.log('BAKED_R43',cid,g.animations.map(a=>[a.name,a.channels.length]));
}
fs.writeFileSync(output+'/catalog.json',JSON.stringify(fixedGunMotions.map(m=>({...m,extra_bones:['ZG_Ponytail_01','ZG_Ponytail_02','ZG_Ponytail_03'],scale_bones:['mixamorig_LeftHand','mixamorig_RightHand']})),null,2)+'\n');

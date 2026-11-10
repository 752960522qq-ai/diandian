/** Assert exact baked scope against the immutable pre-fix copies. */
import fs from 'node:fs';import crypto from 'node:crypto';import {decode} from '../qa/validate_pf89.mjs';
const OUT='web/motion-labs/verification_weapon_v6_three',BEFORE=OUT+'/shoulderfix_before',sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const access=(g,bin,index)=>{const a=g.accessors[index],v=g.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a.type]*4*a.count;return bin.subarray((v.byteOffset||0)+(a.byteOffset||0),(v.byteOffset||0)+(a.byteOffset||0)+size);};
const report={scope:'Production bake vs immutable pre-shoulderfix bytes. Only Natural_m870_RifleRun left upper arm/forearm/hand/finger rotation samples may change, plus explicit provenance metadata and resource cache identifiers.',characters:{},unchanged_files:[],changed_files:[],failures:[]};
for(const cid of ['linxu','military','vest']){
 const file=`assets/characters/weapon_update_v6/${cid}/motions.glb`,a=decode(BEFORE+'/'+file),b=decode(file),rows=[],allowed='Natural_m870_RifleRun';
 if(JSON.stringify(a.g.nodes)!==JSON.stringify(b.g.nodes))report.failures.push({cid,error:'Node/skeleton structure changed'});
 for(const aa of a.g.animations){const bb=b.g.animations.find(x=>x.name===aa.name),changed=[];if(!bb){report.failures.push({cid,clip:aa.name,error:'Clip missing'});continue;}
  if(aa.channels.length!==bb.channels.length)report.failures.push({cid,clip:aa.name,error:'Channel count changed'});
  for(let i=0;i<aa.channels.length;i++){const ac=aa.channels[i],bc=bb.channels[i],as=aa.samplers[ac.sampler],bs=bb.samplers[bc.sampler],bone=a.g.nodes[ac.target.node].name;if(JSON.stringify(ac)!==JSON.stringify(bc))report.failures.push({cid,clip:aa.name,bone,error:'Channel mapping changed'});if(!access(a.g,a.bin,as.input).equals(access(b.g,b.bin,bs.input)))report.failures.push({cid,clip:aa.name,bone,error:'Time samples changed'});if(!access(a.g,a.bin,as.output).equals(access(b.g,b.bin,bs.output))){changed.push({bone,path:ac.target.path});if(aa.name!==allowed||ac.target.path!=='rotation'||!/^mixamorig:Left(Arm|ForeArm|Hand)/.test(bone))report.failures.push({cid,clip:aa.name,bone,path:ac.target.path,error:'Out-of-scope animation data changed'});}}
  if(aa.name!==allowed&&JSON.stringify(aa)!==JSON.stringify(bb))report.failures.push({cid,clip:aa.name,error:'Unrelated clip metadata changed'});
  rows.push({clip:aa.name,changed_channels:changed,unchanged:changed.length===0});
 }
 const xf=`assets/characters/weapon_update_v6/${cid}/equipped_weapon_transforms.json`,site=`web/motion-labs/${cid==='linxu'?'linxu':'resistance'}-motion-lab`,pack=site+`/assets/characters/${cid}/weapon_update_v6.glb`;
 const gunTracksIdentical=fs.readFileSync(BEFORE+'/'+xf).equals(fs.readFileSync(xf));if(!gunTracksIdentical)report.failures.push({cid,error:'Gun-local transform JSON changed'});
 if(sha(pack)!==sha(file)||sha(file)!==sha(`assets/characters/weapon_update_v6/${cid}/equipped_motions.glb`))report.failures.push({cid,error:'Source/bake/runtime pack disagreement'});
 const meta=b.g.asset.extras.natural_weapon_v6;if(meta.generator_sha256!==sha('tools/weapon_v6_three/candidate.mjs')||meta.builder_sha256!==sha('tools/weapon_v6_three/build.mjs'))report.failures.push({cid,error:'Generator/build provenance mismatch'});
 report.characters[cid]={production_pack_sha256:sha(pack),before_pack_sha256:sha(BEFORE+'/'+file),unchanged_clips:rows.filter(x=>x.unchanged).length,changed_clips:rows.filter(x=>!x.unchanged),gun_transform_json_exactly_unchanged:gunTracksIdentical,embedded_provenance:meta};
}
const before=JSON.parse(fs.readFileSync(BEFORE+'/MANIFEST.json'));
for(const [file,info]of Object.entries(before.files)){
 if(!file.startsWith('web/motion-labs/linxu-motion-lab/')&&!file.startsWith('web/motion-labs/resistance-motion-lab/'))continue;
 const current=sha(file);if(current===info.sha256){report.unchanged_files.push(file);continue;}report.changed_files.push({file,before:info.sha256,after:current});
 if(!/\/(app\.js|rig\.js|index\.html|weapon-attachment\.js|weapon_update_v6\.glb|weapon_attachment\.json)$/.test(file))report.failures.push({file,error:'Unexpected production file changed'});
 if(/\/(app\.js|rig\.js|index\.html|weapon-attachment\.js)$/.test(file)){const normalize=s=>s.replace(/v=natural-v6(?:-shoulderfix|-comparefix|-walk)?/g,'v=natural-v6');if(normalize(fs.readFileSync(BEFORE+'/'+file,'utf8'))!==normalize(fs.readFileSync(file,'utf8')))report.failures.push({file,error:'Runtime change exceeds resource version strings'});}
 if(file.endsWith('weapon_attachment.json')&&fs.readFileSync(BEFORE+'/'+file,'utf8')!==fs.readFileSync(file,'utf8'))report.failures.push({file,error:'Attachment config unexpectedly changed; weapon trajectory should stay exact'});
}
fs.writeFileSync(OUT+'/shoulderfix-scope-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({characters:Object.fromEntries(Object.entries(report.characters).map(([c,r])=>[c,{sha256:r.production_pack_sha256,unchanged_clips:r.unchanged_clips,changed_channels:r.changed_clips[0]?.changed_channels,gun_tracks_identical:r.gun_transform_json_exactly_unchanged}])),failures:report.failures},null,2));process.exitCode=report.failures.length?1:0;

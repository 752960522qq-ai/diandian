import fs from 'node:fs';
import {read} from './validate_pf89.mjs';
const report={};
for(const id of ['military','vest']){
 const from=`assets/characters/resistance_r46/${id}`,to=`assets/characters/resistance_r47/${id}`;
 for(const file of ['character.glb','retarget_calibration.json'])if(!fs.readFileSync(`${from}/${file}`).equals(fs.readFileSync(`${to}/${file}`)))throw Error(`Changed ${file}`);
 const old=(await read(`${from}/motions.glb`)).animations,pack=(await read(`${to}/motions.glb`)).animations,changes=[];let unchanged=0;
 for(const a of old){const b=pack.find(c=>c.name===a.name);if(!b||a.duration!==b.duration||a.tracks.length!==b.tracks.length)throw Error('Clip structure changed');let changed=false;
  for(const t of a.tracks){const target=b.tracks.find(v=>v.name===t.name);if(!target||t.times.some((v,i)=>v!==target.times[i]))throw Error('Key times changed');if(t.values.some((v,i)=>v!==target.values[i])){changed=true;if(!['Idle','Walk'].includes(a.name)||!/^mixamorig(?:Left|Right)(?:Shoulder|Arm)\.quaternion$/.test(t.name))throw Error(`Unexpected change: ${a.name} ${t.name}`);changes.push({clip:a.name,track:t.name});}}
  if(!changed)unchanged++;
 }
 if(unchanged!==31||changes.length!==8)throw Error('Changed clip/channel count');report[id]={character_byte_identical:true,calibration_byte_identical:true,unchanged_clips:unchanged,changed_channels:changes};
}
fs.writeFileSync('assets/characters/resistance_r47/change-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

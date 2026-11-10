/** Read-only QA of the actual current Linxu runtime. Numeric risk ranking, not visual acceptance. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {runtime} from './validate.mjs';

const out='web/motion-labs/verification_linxu_full_motion';
const matrixFile=out+'/linxu-ui-validation-matrix.json';
const matrix=JSON.parse(fs.readFileSync(matrixFile));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for(const [file,hash] of Object.entries(matrix.source_files)) if(sha(file)!==hash) throw Error('Inventory source changed: '+file);
const rt=await runtime('linxu'), clean=await runtime('linxu');
const names=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'];
const watched=names.map(n=>[n,rt.bones.get('mixamorig:'+n)]).filter(([n,b])=>b);
const pose=(r,row,t)=>r.pose(row.motion,t,row.weapon_id,row.compare_run);
function world(r,row){
  const value={};
  for(const [name] of watched){const b=r.bones.get('mixamorig:'+name);value[name]={p:b.getWorldPosition(new T.Vector3()).toArray(),q:b.getWorldQuaternion(new T.Quaternion()).normalize().toArray()};}
  if(row.weapon_id!=='none'){const g=r.attachment.weapons.get(row.weapon_id);value.weapon={p:g.getWorldPosition(new T.Vector3()).toArray(),q:g.getWorldQuaternion(new T.Quaternion()).normalize().toArray()};}
  return value;
}
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b)=>T.MathUtils.radToDeg(2*Math.acos(Math.min(1,Math.abs(a.reduce((s,v,i)=>s+v*b[i],0)))));
function delta(a,b){return Object.fromEntries(Object.keys(a).map(n=>[n,{position_m:dist(a[n].p,b[n].p),angle_deg:angle(a[n].q,b[n].q)}]));}
const maxEntry=(d,key,scale=1)=>Object.entries(d).map(([joint,x])=>({joint,value:x[key]*scale})).sort((a,b)=>b.value-a.value)[0];
const report={schema_version:1,generated_at:new Date().toISOString(),scope:'Current actual runtime poses at <=1/240 s spacing for every exposed action, numeric seam/velocity/finite checks plus all ordered UI selection transitions. No WebGL or surface acceptance claim.',matrix_file:matrixFile,matrix_sha256:sha(matrixFile),source_files:matrix.source_files,watched_world_joints:watched.map(([n])=>n),rows:[],errors:[],transition_summary:null};
const referenceStates=new Map();
function localState(r){return {bones:[...new Set(r.bones.values())].map(b=>({name:b.name,p:b.position.toArray(),q:b.quaternion.clone().normalize().toArray(),s:b.scale.toArray()})),guns:[...r.attachment.weapons].map(([id,g])=>({id,visible:g.visible,p:g.position.toArray(),q:g.quaternion.clone().normalize().toArray(),s:g.scale.toArray()})),pump:r.attachment.pumpParts.map(p=>({name:p.object.name,p:p.object.position.toArray()})),actualClip:r.attachment.getState().actualClip};}
for(const row of matrix.rows){
  const d=row.clip_duration_seconds, steps=Math.max(1,Math.ceil(d*240)),dt=d/steps;
  const rec={key:row.key,weapon:row.weapon_id,motion:row.motion,variant:row.variant,duration:d,ui_loop:row.ui_playback.loop,samples:steps+1,sample_step_seconds:dt,peak_linear_speed_m_s:{value:0},peak_angular_speed_deg_s:{value:0},joint_peak_speeds:{},endpoint_delta:null,loop_seam_risk:null};
  let prev=null,start=null,last=null,penultimate=null;
  for(let i=0;i<=steps;i++){
    try{pose(rt,row,i*dt);const now=world(rt,row);if(!Object.values(now).every(x=>[...x.p,...x.q].every(Number.isFinite)))throw Error('Non-finite world transform');
      if(i===0)start=now;if(i===steps-1)penultimate=now;
      if(prev){const change=delta(prev,now);for(const [joint,x]of Object.entries(change)){const peak=rec.joint_peak_speeds[joint]??={position_m_s:0,angle_deg_s:0};peak.position_m_s=Math.max(peak.position_m_s,x.position_m/dt);peak.angle_deg_s=Math.max(peak.angle_deg_s,x.angle_deg/dt);}
        const p=maxEntry(change,'position_m',1/dt),q=maxEntry(change,'angle_deg',1/dt);if(p.value>rec.peak_linear_speed_m_s.value)rec.peak_linear_speed_m_s={...p,time:i*dt,phase:i/steps};if(q.value>rec.peak_angular_speed_deg_s.value)rec.peak_angular_speed_deg_s={...q,time:i*dt,phase:i/steps};}
      prev=now;last=now;
    }catch(e){report.errors.push({key:row.key,phase:i/steps,error:String(e)});break;}
  }
  if(start&&last){rec.endpoint_delta=delta(last,start);if(row.ui_playback.loop){const seam=delta(penultimate||last,start),peakP=maxEntry(seam,'position_m',1/dt),peakQ=maxEntry(seam,'angle_deg',1/dt);rec.loop_seam_risk={endpoint_max_position_m:maxEntry(rec.endpoint_delta,'position_m'),endpoint_max_angle_deg:maxEntry(rec.endpoint_delta,'angle_deg'),last_sample_to_start_linear_speed_m_s:peakP,last_sample_to_start_angular_speed_deg_s:peakQ,linear_speed_ratio_to_within_clip_peak:peakP.value/Math.max(.001,rec.peak_linear_speed_m_s.value),angular_speed_ratio_to_within_clip_peak:peakQ.value/Math.max(.01,rec.peak_angular_speed_deg_s.value),note:'Large endpoint jumps and wrap-step speeds flag review candidates. A number alone is not a failure or permission to alter source motion.'};}}
  if(row.static_or_ultrashort_clip){const cadences=[1/24,1/30,1/60,1/120,.003,.041,.017,.029];let elapsed=0,maxP=0,maxQ=0;for(let i=0;i<480;i++){elapsed+=cadences[i%cadences.length];pose(rt,row,elapsed%d);const change=delta(start,world(rt,row));maxP=Math.max(maxP,maxEntry(change,'position_m').value);maxQ=Math.max(maxQ,maxEntry(change,'angle_deg').value);}rec.static_irregular_multirate_480_samples={max_position_drift_m:maxP,max_angle_drift_deg:maxQ};}
  pose(clean,matrix.rows[0],0);pose(clean,row,d*.37);referenceStates.set(row.key,localState(clean));
  report.rows.push(rec);console.log('sampled',report.rows.length+'/'+matrix.rows.length,row.key,'samples',steps+1);
  fs.writeFileSync(out+'/linxu-ui-numeric-sweep.partial.json',JSON.stringify(report,null,2)+'\n');
}
let transitions=0,maxPosition=0,maxAngle=0,maxScale=0,maxPump=0;const failures=[];
for(const from of matrix.rows)for(const to of matrix.rows){
  pose(rt,from,from.clip_duration_seconds*.73);pose(rt,to,to.clip_duration_seconds*.37);const actual=localState(rt),expected=referenceStates.get(to.key);let p=0,q=0,s=0,pump=0;
  for(let i=0;i<actual.bones.length;i++){const a=actual.bones[i],b=expected.bones[i];p=Math.max(p,dist(a.p,b.p));q=Math.max(q,angle(a.q,b.q));s=Math.max(s,dist(a.s,b.s));}
  let visibility=false;for(let i=0;i<actual.guns.length;i++){const a=actual.guns[i],b=expected.guns[i];visibility ||= a.visible!==b.visible;if(a.visible){p=Math.max(p,dist(a.p,b.p));q=Math.max(q,angle(a.q,b.q));s=Math.max(s,dist(a.s,b.s));}}
  for(let i=0;i<actual.pump.length;i++)pump=Math.max(pump,dist(actual.pump[i].p,expected.pump[i].p));
  maxPosition=Math.max(maxPosition,p);maxAngle=Math.max(maxAngle,q);maxScale=Math.max(maxScale,s);maxPump=Math.max(maxPump,pump);transitions++;
  if(p>1e-6||q>1e-3||s>1e-6||pump>1e-6||visibility||actual.actualClip!==expected.actualClip) failures.push({from:from.key,to:to.key,position_m:p,angle_deg:q,scale:s,pump_m:pump,visibility_diff:visibility,actual_clip:actual.actualClip,expected_clip:expected.actualClip});
}
report.transition_summary={ordered_pairs:transitions,source_phase:.73,target_phase:.37,reference:'Same target pose after native none/Idle reset in separately loaded runtime.',max_local_position_residual_m:maxPosition,max_local_angle_residual_deg:maxAngle,max_local_scale_residual:maxScale,max_pump_residual_m:maxPump,failures};
report.loop_ranking_by_endpoint_position=report.rows.filter(r=>r.loop_seam_risk).map(r=>({key:r.key,...r.loop_seam_risk})).sort((a,b)=>b.endpoint_max_position_m.value-a.endpoint_max_position_m.value);
report.velocity_ranking=report.rows.map(r=>({key:r.key,peak_linear_speed_m_s:r.peak_linear_speed_m_s,peak_angular_speed_deg_s:r.peak_angular_speed_deg_s})).sort((a,b)=>b.peak_linear_speed_m_s.value-a.peak_linear_speed_m_s.value);
report.source_hashes_still_match=Object.entries(matrix.source_files).every(([f,h])=>sha(f)===h);
fs.writeFileSync(out+'/linxu-ui-numeric-sweep.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({errors:report.errors,transitions:report.transition_summary,source_hashes_still_match:report.source_hashes_still_match,top_seams:report.loop_ranking_by_endpoint_position.slice(0,15)},null,2));

import fs from 'node:fs';import * as T from 'three';import {setupLinxu}from '../qa/validate_linxu_motion.mjs';import{gunGeometry,nearest,handVertices,vertexGun}from '../qa/linxu_surface_geometry_v4.mjs';
const file='web/motion-labs/linxu-motion-lab/assets/weapon_attachment.json',cfg=JSON.parse(fs.readFileSync(file)),anatomy=JSON.parse(fs.readFileSync('assets/characters/linxu_motion_v3/fitting_v4/native-curl-axes.json')).hands.Right.digits.Index;
const rt=await setupLinxu('linxu'),verts=handVertices(rt.root).filter(v=>v.side==='Right'&&v.digit==='Index'),V=a=>new T.Vector3().fromArray(a),Q=a=>new T.Quaternion().fromArray(a),deg=T.MathUtils.radToDeg;
const results=[];
for(const w of Object.keys(cfg.weapons)){
 rt.pose('FiringRifle',.0,w);const gun=rt.attachment.weapons.get(w),geom=gunGeometry(gun),chain=[1,2,3,4].map(i=>rt.bones.get('mixamorig:RightHandIndex'+i)),target=V(cfg.weapons[w].trigger).add(new T.Vector3(.006,0,0)),base=chain[0].quaternion.clone();
 const p0=gun.worldToLocal(chain[0].getWorldPosition(new T.Vector3()));
 function apply(p){for(let j=0;j<3;j++){chain[j].quaternion.copy(Q(anatomy[j].bindQuaternion).multiply(new T.Quaternion().setFromAxisAngle(V(anatomy[j].curlAxisLocal),T.MathUtils.degToRad(p[j]))));if(j===0)chain[j].quaternion.premultiply(new T.Quaternion().setFromEuler(new T.Euler(T.MathUtils.degToRad(p[3]),T.MathUtils.degToRad(p[4]),T.MathUtils.degToRad(p[5]))));chain[j].updateMatrixWorld(true);}}
 function loss(p){apply(p);let sum=0,max=0;for(const v of verts){const d=nearest(geom,vertexGun(v,gun)).signed;if(d<-.0005){let e=((d+.0005)*1000)**2;sum+=e;max=Math.max(max,e);}}const tip=gun.worldToLocal(chain[3].getWorldPosition(new T.Vector3()));return tip.distanceToSquared(target)*1e6*12+sum/verts.length*15+max*5+(p[3]**2+p[4]**2+p[5]**2)*.001;}
 let best=Infinity,params=null;const bounds=[[0,90],[0,100-anatomy[1].bindGeometricBendDegrees],[0,70],[-65,65],[-65,65],[-65,65]];
 for(const start of [[45,65,55,0,0,0],[65,75,65,0,0,0],[20,60,60,0,0,0]]){let p=start.map((v,i)=>Math.min(bounds[i][1],v)),c=loss(p);for(const step of [20,10,5,2,1])for(let it=0;it<5;it++)for(let j=0;j<6;j++)for(const sign of [-1,1]){const q=p.slice();q[j]+=step*sign;if(q[j]<bounds[j][0]||q[j]>bounds[j][1])continue;const v=loss(q);if(v<c){p=q;c=v;}}if(c<best){best=c;params=p;}}
 apply(params);const tip=gun.worldToLocal(chain[3].getWorldPosition(new T.Vector3())),quats=chain.slice(0,3).map(b=>b.quaternion.toArray());
 for(const key of ['FiringRifle','Type97Fire']){const mount=cfg.characters.linxu.mounts[w].motions[key];if(!mount?.reference_grip)continue;for(let j=1;j<=3;j++)mount.reference_grip.tracks['mixamorig:RightHandIndex'+j]={times:[0],values:quats[j-1]};}
 const row={weapon:w,target:target.toArray(),tip:tip.toArray(),gapMm:tip.distanceTo(target)*1000,loss:best,parameters:params};results.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync(file,JSON.stringify(cfg,null,2)+'\n');fs.writeFileSync('work/linxu-motion-v4/trigger-report.json',JSON.stringify(results,null,2)+'\n');

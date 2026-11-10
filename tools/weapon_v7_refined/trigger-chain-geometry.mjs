/** Trigger surface and anatomical finger-chain helpers for reproducible QA. */
import fs from 'node:fs';import * as T from 'three';import axes from './finger-axes.json' with {type:'json'};
export const D=Math.PI/180,V=a=>new T.Vector3().fromArray(a),Q=a=>new T.Quaternion().fromArray(a);
export function makeChain(bones,cid,gun){
 const b=[1,2,3,4].map(i=>bones.get('mixamorig:RightHandIndex'+i)),a=[1,2,3].map(i=>axes[cid]['RightHandIndex'+i]);
 const rest=a.map(x=>Q(x.rest)),hinge=a.map(x=>V(x.hinge)),abduct=new T.Vector3().crossVectors(hinge[0],new T.Vector3(0,1,0)).normalize();
 const orig=b.map(o=>o.quaternion.clone());
 const apply=p=>{for(let i=0;i<3;i++){b[i].quaternion.copy(rest[i]).multiply(new T.Quaternion().setFromAxisAngle(hinge[i],p[i]*D));if(i===0)b[i].quaternion.multiply(new T.Quaternion().setFromAxisAngle(abduct,p[3]*D));}b[0].updateMatrixWorld(true);};
 const points=()=>b.map(o=>gun.worldToLocal(o.getWorldPosition(new T.Vector3())));
 return{b,orig,apply,points,padNormal(){return new T.Vector3().crossVectors(hinge[2],new T.Vector3(0,1,0)).normalize().applyQuaternion(b[2].getWorldQuaternion(new T.Quaternion())).applyQuaternion(gun.getWorldQuaternion(new T.Quaternion()).invert());},restore(){b.forEach((o,i)=>o.quaternion.copy(orig[i]));b[0].updateMatrixWorld(true);}};
}
function minimize(f,initial,limits){let best=initial.map((v,i)=>T.MathUtils.clamp(v,...limits[i])),v=f(best);for(let step of [24,12,6,3,1.5,.7,.3,.15])for(let rep=0;rep<15;rep++){let changed=false;for(let i=0;i<4;i++)for(let sign of [-1,1]){let p=best.slice();p[i]=T.MathUtils.clamp(p[i]+sign*step,...limits[i]);let n=f(p);if(n<v){best=p;v=n;changed=true;}}if(!changed)break;}return{p:best,score:v};}
const cfg=JSON.parse(fs.readFileSync('assets/weapons/refined_v2_attachment.json')).weapons;
export function solve(chain,weapon,{targetMode='tip',prior=[-25,65,40,0],mcpMin=-55}={}){
 // Trigger anchor is only an initial contact reference; collision QA below uses geometry.
 const trigger=V(cfg[weapon].trigger);const target=trigger.clone();target.x=weapon==='type64'?.0075:.01;target.z-=.004;
 const limits=[[mcpMin,35],[0,105],[5,70],[-30,30]];
 const objective=p=>{chain.apply(p);const pts=chain.points(),tip=pts[3],dip=pts[2];let contact=targetMode==='pad'?dip.clone().lerp(tip,.7):tip;let score=contact.distanceToSquared(target)*1e6;
 for(let i=0;i<4;i++)score+=(p[i]-prior[i])**2*.004;
 // Keep the proximal phalanx outside frame, and distal chain on the trigger level.
 score+=Math.max(0,.019-pts[1].x)**2*1e6*.8;
 score+=(pts[2].y-trigger.y)**2*1e6*.12;
 score+=Math.max(0,-.012-tip.x)**2*1e6;
 return score;};
 let best={score:Infinity};for(const start of [prior,[-35,70,35,0],[-50,90,50,0],[-30,90,60,0],[-20,60,10,0]]){let s=minimize(objective,start,limits);if(s.score<best.score)best=s;}chain.apply(best.p);return {...best,target:target.toArray(),tipToTargetMm:chain.points()[3].distanceTo(target)*1000};
}

export function getTriggerSurface(gun,weapon){
 const name={qsz92:'tripo_part_6',type54:'frame_source_09',type64:'frame_source_16'}[weapon],mesh=gun.getObjectByName(name),g=mesh.geometry,pos=g.attributes.position,ix=g.index,mat=gun.matrixWorld.clone().invert().multiply(mesh.matrixWorld),y=cfg[weapon].trigger[1],ray=new T.Ray(new T.Vector3(.002,y,-.05),new T.Vector3(0,0,1));let hit=null;
 for(let i=0;i<(ix?ix.count:pos.count);i+=3){const p=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,ix?ix.getX(i+j):i+j).applyMatrix4(mat));const v=ray.intersectTriangle(...p,false,new T.Vector3());if(v&&(!hit||v.z<hit.z))hit=v;}return hit;
}
export function solveSurface(chain,weapon,gun,{mcpMin=-45,radius=.005}={}){
 const surface=getTriggerSurface(gun,weapon);if(!surface)throw Error('Trigger ray missed '+weapon);const limits=[[mcpMin,20],[0,100],[0,75],[-25,25]],prior=[-25,65,35,0];
 const objective=p=>{chain.apply(p);const pts=chain.points(),normal=chain.padNormal(),center=pts[2].clone().lerp(pts[3],.65),pad=center.addScaledVector(normal,radius);let score=pad.distanceToSquared(surface)*1e6;
 for(let i=0;i<4;i++)score+=(p[i]-prior[i])**2*.002;
 score+=Math.max(0,.019-pts[1].x)**2*1e6;
 score+=Math.max(0,.65-normal.z)**2*12;
 return score;};let best={score:Infinity};for(const start of [prior,[-40,70,50,-5],[-45,85,60,-5],[-20,40,60,0]]){const t=minimize(objective,start,limits);if(t.score<best.score)best=t;}chain.apply(best.p);const pts=chain.points(),normal=chain.padNormal(),pad=pts[2].clone().lerp(pts[3],.65).addScaledVector(normal,radius);return {...best,surface:surface.toArray(),pad:pad.toArray(),normal:normal.toArray(),padContactErrorMm:pad.distanceTo(surface)*1000};
}


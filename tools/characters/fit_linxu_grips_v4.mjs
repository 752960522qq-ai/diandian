import fs from 'node:fs';import * as T from 'three';
import {setupLinxu} from '../qa/validate_linxu_motion.mjs';import {gunGeometry,nearest,handVertices,vertexGun} from '../qa/linxu_surface_geometry_v4.mjs';
const rt=await setupLinxu('linxu'),cfg=JSON.parse(fs.readFileSync('assets/characters/linxu_motion_v3/fitting_v4/source_attachment_v3.json'));
const clone=x=>JSON.parse(JSON.stringify(x)),V=a=>new T.Vector3().fromArray(a),Q=a=>new T.Quaternion().fromArray(a),deg=T.MathUtils.radToDeg;
const allVertices=handVertices(rt.root),q95=cfg.characters.linxu.mounts.qbz95.motions.RifleAimingIdle.reference_grip;
const report=[];const anatomy=JSON.parse(fs.readFileSync('assets/characters/linxu_motion_v3/fitting_v4/native-curl-axes.json')).hands;
function posed(w,m,t=.37){return rt.pose(m,rt.duration(m,w)*t,w);}
function setWorldQ(b,q){const par=b.parent.getWorldQuaternion(new T.Quaternion());b.quaternion.copy(par.invert().multiply(q));b.updateMatrixWorld(true);}
function turn(b,current,desired){const q=new T.Quaternion().setFromUnitVectors(current.normalize(),desired.normalize());setWorldQ(b,q.multiply(b.getWorldQuaternion(new T.Quaternion())));}
function angle(chain,j){return chain[j].getWorldPosition(new T.Vector3()).sub(chain[j-1].getWorldPosition(new T.Vector3())).angleTo(chain[j+1].getWorldPosition(new T.Vector3()).sub(chain[j].getWorldPosition(new T.Vector3())));}
function limit(chain){for(const j of [1,2]){const a=chain[j].getWorldPosition(new T.Vector3()).sub(chain[j-1].getWorldPosition(new T.Vector3())).normalize(),b=chain[j+1].getWorldPosition(new T.Vector3()).sub(chain[j].getWorldPosition(new T.Vector3())).normalize(),ang=a.angleTo(b),max=T.MathUtils.degToRad(j===1?100:70);if(ang>max){const q=new T.Quaternion().setFromUnitVectors(a,b);const dir=a.clone().applyQuaternion(new T.Quaternion().slerp(q,max/ang));turn(chain[j],b,dir);}}}
for(const w of (process.argv[2]||'qbz95,type56_1,qbu85,type97hawk,qcq171').split(',')){
 const base=cfg.characters.linxu.mounts[w],orig=clone(base),aim=orig.motions.RifleAimingIdle.reference_grip;
 // Stable per-weapon native hand frame: no gait-dependent finger opening.
 for(const [m,mount]of [['RifleIdle',base],...Object.entries(base.motions)])if(mount.reference_grip){const p=mount.reference_grip;p.tracks=clone(aim.tracks);for(const tr of Object.values(p.tracks)){tr.values=tr.values.slice(0,4);tr.times=[0];}for(const k of Object.keys(p.tracks).filter(k=>k.includes('Left'))){p.tracks[k]=clone(q95.tracks[k]);p.tracks[k].values=p.tracks[k].values.slice(0,4);p.tracks[k].times=[0];}if(w==='type97hawk'){p.tracks.RightHand=clone(q95.tracks.RightHand);p.tracks.RightHand.values=p.tracks.RightHand.values.slice(0,4);p.tracks.RightHand.times=[0];}delete p.left_middle_reference;mount.left_palm_offset_native=[-.00087634,.05405372,-.00746168];}
 rt.attachment.config=cfg;rt.attachment.character=cfg.characters.linxu;
 posed(w,'RifleAimingIdle');const gun=rt.attachment.weapons.get(w),geom=gunGeometry(gun);
 for(const side of ['Right','Left']){
  const hand=rt.bones.get(`mixamorig:${side}Hand`),samples=allVertices.filter(v=>v.side===side);
  // Optimize rigid wrist translation only first, through actual skin against gun.
  const startp=hand.getWorldPosition(new T.Vector3()),gp=gun.worldToLocal(startp.clone());
  const refQ=hand.quaternion.clone();
  function shift(delta){const world=gun.localToWorld(gp.clone().add(V(delta)));hand.position.copy(hand.parent.worldToLocal(world));hand.updateMatrixWorld(true);}
  const palms=samples.filter(v=>v.digit==='Palm');
  function costPalm(d){shift(d);let c=0,max=0;for(const v of palms){const s=nearest(geom,vertexGun(v,gun)).signed;if(s<-.0005){const p=((s+.0005)*1000)**2;c+=p*20;max=Math.max(max,p);}}return c/palms.length+max*5+d.reduce((a,v)=>a+(v*1000)**2*.02,0);}
  let dp=[0,0,0],cost=costPalm(dp);for(const step of [.008,.004,.002,.001])for(let it=0;it<3;it++)for(let ax=0;ax<3;ax++)for(const sign of [-1,1]){const p=dp.slice();p[ax]+=sign*step;if(Math.abs(p[ax])>.035)continue;const c=costPalm(p);if(c<cost){cost=c;dp=p;}}shift(dp);
  const handDelta=dp.slice(),fingerResult={};
  for(const digit of ['Thumb','Index','Middle','Ring','Pinky']){
   const chain=[1,2,3,4].map(j=>rt.bones.get(`mixamorig:${side}Hand${digit}${j}`)),verts=samples.filter(v=>v.digit===digit),start=chain.slice(0,3).map(b=>b.quaternion.clone());
   const globalAxes=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)];
   const aa=anatomy[side].digits[digit];
   if(side==='Right'&&digit!=='Thumb'){for(let j=0;j<3;j++){const delta=side==='Right'&&digit==='Index'?0:[40,45,30][j];chain[j].quaternion.copy(Q(aa[j].bindQuaternion).multiply(new T.Quaternion().setFromAxisAngle(V(aa[j].curlAxisLocal),T.MathUtils.degToRad(delta))));chain[j].updateMatrixWorld(true);}}
   if(digit==='Thumb'&&side==='Right'){for(let j=0;j<3;j++){const dirs=[[-.55,-.1,.83],[-.98,-.1,-.2],[-.4,-.1,-.91]],p=chain[j].getWorldPosition(new T.Vector3());turn(chain[j],chain[j+1].getWorldPosition(new T.Vector3()).sub(p),V(dirs[j]).applyQuaternion(gun.getWorldQuaternion(new T.Quaternion())));}}
   limit(chain);
   const tip0=gun.worldToLocal(chain[3].getWorldPosition(new T.Vector3())),target=nearest(geom,tip0).point;
   let targetTip=target.clone().addScaledVector(nearest(geom,tip0).normal,.006);
   if(digit==='Thumb'){const grip=V(side==='Right'?cfg.weapons[w].right_grip:base.motions.RifleAimingIdle.left_grip);targetTip=side==='Right'?grip.add(new T.Vector3(-.023,.015,.055)):grip.add(new T.Vector3(-.025,.037,-.035));}
   if(side==='Right'&&digit==='Index'){const root=gun.worldToLocal(chain[0].getWorldPosition(new T.Vector3()));targetTip=root.clone().add(new T.Vector3(0,0,-.075));}
   function loss(){let c=0,max=0;for(const v of verts){const d=nearest(geom,vertexGun(v,gun)).signed;if(d<-.0005){const p=((d+.0005)*1000)**2;c+=p*30;max=Math.max(max,p);}}
    c/=Math.max(1,verts.length);c+=max*8;const tip=gun.worldToLocal(chain[3].getWorldPosition(new T.Vector3()));c+=tip.distanceToSquared(targetTip)*1e6*.6;
    for(let j=0;j<3;j++)c+=(deg(chain[j].quaternion.angleTo(start[j]))**2)*.003;
    for(let j=1;j<3;j++){const a=deg(angle(chain,j)),max=j===1?100:70;c+=Math.max(0,a-max)**2*15;}
    return c;
   }
   let best=loss();
   if(side==='Right'&&digit!=='Thumb'&&digit!=='Index'){
    let params=side==='Right'&&digit==='Index'?[0,0,0]:[40,45,30];
    function apply(p){for(let j=0;j<3;j++){chain[j].quaternion.copy(Q(aa[j].bindQuaternion).multiply(new T.Quaternion().setFromAxisAngle(V(aa[j].curlAxisLocal),T.MathUtils.degToRad(p[j]))));chain[j].updateMatrixWorld(true);}}
    const limits=side==='Right'&&digit==='Index'?[[0,15],[0,12],[0,12]]:[[0,85],[0,100-aa[1].bindGeometricBendDegrees],[0,70]];
    apply(params);best=loss();for(const ds of [20,10,5,2,1])for(let iter=0;iter<4;iter++)for(let j=0;j<3;j++)for(const sign of [-1,1]){const p=params.slice();p[j]+=ds*sign;if(p[j]<limits[j][0]||p[j]>limits[j][1])continue;apply(p);const c=loss();if(c<best){params=p;best=c;}}
    apply(params);
   }else if(side==='Right'&&digit==='Index'){
    for(let j=0;j<3;j++){const p=chain[j].getWorldPosition(new T.Vector3()),dir=new T.Vector3(0,-.04*j,-1).normalize().applyQuaternion(gun.getWorldQuaternion(new T.Quaternion()));turn(chain[j],chain[j+1].getWorldPosition(new T.Vector3()).sub(p),dir);}
   }else{
    for(const ds of [20,10,5,2,1])for(let iter=0;iter<6;iter++)for(let j=2;j>=0;j--){
     const old=chain[j].quaternion.clone(),bestq=old.clone();let score=best;
     let axes=globalAxes;if(j>0&&digit!=='Thumb'){const prev=chain[j].getWorldPosition(new T.Vector3()).sub(chain[j-1].getWorldPosition(new T.Vector3())).normalize(),next=chain[j+1].getWorldPosition(new T.Vector3()).sub(chain[j].getWorldPosition(new T.Vector3())).normalize();axes=[new T.Vector3().crossVectors(prev,next).normalize().applyQuaternion(chain[j].parent.getWorldQuaternion(new T.Quaternion()).invert())];}
     for(const axis of axes)for(const sign of [-1,1]){chain[j].quaternion.copy(new T.Quaternion().setFromAxisAngle(axis,T.MathUtils.degToRad(sign*ds)).multiply(old));chain[j].updateMatrixWorld(true);const c=loss();if(c<score){score=c;bestq.copy(chain[j].quaternion);}}
     chain[j].quaternion.copy(bestq);chain[j].updateMatrixWorld(true);best=score;
    }
   }
   limit(chain);fingerResult[digit]={quaternions:chain.slice(0,3).map(b=>b.quaternion.toArray()),pip:deg(angle(chain,1)),dip:deg(angle(chain,2)),loss:loss()};
  }
  // Store native joint angles and a gun-local wrist shift. Runtime solves the arm, never changes bone lengths.
  for(const [motion,mount] of [['RifleIdle',base],...Object.entries(base.motions)])if(mount.reference_grip){for(const [digit,val]of Object.entries(fingerResult))for(let j=1;j<=3;j++)mount.reference_grip.tracks[`mixamorig:${side}Hand${digit}${j}`]={times:[0],values:val.quaternions[j-1]};
   if(side==='Right'){const old=mount.right_hand_shift_weapon_m||[0,0,0];mount.right_hand_shift_weapon_m=old.map((v,i)=>v+handDelta[i]);}else{mount.left_grip=mount.left_grip.map((v,i)=>v+handDelta[i]);}}
  report.push({weapon:w,side,wristShift:handDelta,fingers:fingerResult});
  // Restore the skeleton translation: only the arm IK owns wrist placement.
  hand.position.copy(hand.parent.worldToLocal(startp));hand.quaternion.copy(refQ);hand.updateMatrixWorld(true);
 }
 console.log('FIT',w);
}
cfg.revision='Linxu V4 native-length bounded finger fit';
fs.writeFileSync('web/motion-labs/linxu-motion-lab/assets/weapon_attachment.json',JSON.stringify(cfg,null,2)+'\n');fs.writeFileSync('work/linxu-motion-v4/fitting-report.json',JSON.stringify(report,null,2));

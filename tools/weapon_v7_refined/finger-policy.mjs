/** Small, action-specific hand repairs for the three male retargets.
 * This runs while baking each pose, after shotgun-policy. It never moves a gun.
 * Constants are the three targets' unanimated bind-local rotations; they are
 * kept here so the exported animation has no runtime or JSON dependency.
 */
import * as T from 'three';
const DEG=Math.PI/180;
const BIND={
 linxu:{index3:[-0.000001147,-0.000000172,0.000000123,1],middle2:[0.160157174,0.005848542,0.010810765,0.987015009]},
 military:{index3:[-0.000000643,-0.000000160,0.000000109,1],middle2:[0.239011779,-0.009234889,0.047611654,0.969804764]},
 vest:{index3:[-0.000000452,-0.000000079,-0.000000127,1],middle2:[0.257346690,-0.010292002,0.056885619,0.964588404]},
};
// Bind-space three-joint offsets fitted to the actual trigger front surface.
// Multiplication retains any authored per-frame finger rotation instead of
// freezing the motion to a pose. Military QSZ is the validated 4 mm wrist fit.
const INDEX_DELTA={
 "linxu": {
  "qsz92": [
   [
    -0.1744597708,
    -0.0043335156,
    -0.1772671952,
    0.9685666474
   ],
   [
    -0.0586711516,
    -0.0224841213,
    0.282267268,
    0.957276005
   ],
   [
    -0.5508173388,
    -0.2211588919,
    0.7461923816,
    0.3014729398
   ]
  ],
  "type54": [
   [
    -0.2207632626,
    -0.006254408,
    -0.156463509,
    0.9626752488
   ],
   [
    0.0495960304,
    0.0175362004,
    0.1853527547,
    0.9812629983
   ],
   [
    -0.8201298611,
    -0.1398824743,
    0.4655915683,
    0.301735639
   ]
  ],
  "type64": [
   [
    -0.2310154562,
    0.0141490642,
    -0.0759807428,
    0.9698755537
   ],
   [
    -0.1015236776,
    -0.0103264852,
    0.171364561,
    0.9799084109
   ],
   [
    -0.8283958386,
    -0.1561358278,
    0.460318727,
    0.2783677555
   ]
  ]
 },
 "military": {
  "qsz92": [
   [
    0.0160714881,
    0.0011954879,
    -0.0977411463,
    0.9950813768
   ],
   [
    -0.3005550664,
    -0.1365499687,
    0.160245425,
    0.9302376911
   ],
   [
    -0.7284524023,
    -0.3530281358,
    0.545893246,
    0.2161684457
   ]
  ],
  "type54": [
   [
    -0.0836788942,
    -0.0034970378,
    -0.1186183213,
    0.9894014894
   ],
   [
    -0.1638345653,
    -0.0750531113,
    0.1271662482,
    0.9753737802
   ],
   [
    -0.928986893,
    -0.2208476689,
    0.2355478359,
    0.1809057122
   ]
  ],
  "type64": [
   [
    -0.0402161578,
    0.0019854022,
    -0.0187544462,
    0.9990130077
   ],
   [
    -0.3628654626,
    -0.1117943841,
    0.0395033415,
    0.9242673627
   ],
   [
    -0.9336463787,
    -0.2528573051,
    0.2182445757,
    0.1293712793
   ]
  ]
 },
 "vest": {
  "qsz92": [
   [
    -0.1590800586,
    -0.0089222986,
    -0.1840497822,
    0.9699173188
   ],
   [
    -0.0722175154,
    0.0079335503,
    0.2922581361,
    0.953575834
   ],
   [
    -0.5213935395,
    -0.2665966424,
    0.7633037077,
    0.2728414502
   ]
  ],
  "type54": [
   [
    -0.2024956482,
    -0.0105565875,
    -0.1514133003,
    0.9674492666
   ],
   [
    0.0076430509,
    0.0473868958,
    0.1784111635,
    0.9827845759
   ],
   [
    -0.7826284029,
    -0.1237550976,
    0.5180780078,
    0.3221376052
   ]
  ],
  "type64": [
   [
    -0.2275260786,
    0.0075079582,
    -0.0812609477,
    0.9703464188
   ],
   [
    -0.0828452076,
    0.0308260333,
    0.1783228817,
    0.9799935597
   ],
   [
    -0.8219690621,
    -0.2066036919,
    0.4909584133,
    0.2015976486
   ]
  ]
 }
};
const PISTOLS=new Set(['qsz92','type54','type64']);
const HIGH_READY=new Set(['PistolIdle','PistolWalk']);
const TRIGGER=new Set(['PistolAimingIdle','PistolShooting']);
function setWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize();b.updateMatrixWorld(true);}
function offsetWrist(bones,gun,side,shift){
 const upper=bones.get('mixamorig:'+side+'Arm'),fore=bones.get('mixamorig:'+side+'ForeArm'),hand=bones.get('mixamorig:'+side+'Hand');
 if(!upper||!fore||!hand||!gun)return null;
 const shoulder=upper.getWorldPosition(new T.Vector3()),elbow=fore.getWorldPosition(new T.Vector3()),wrist=hand.getWorldPosition(new T.Vector3());
 const handQ=hand.getWorldQuaternion(new T.Quaternion());
 // Translation is in weapon space. Keep authored wrist orientation and elbow plane.
 const target=wrist.clone().add(new T.Vector3().fromArray(shift).applyQuaternion(gun.getWorldQuaternion(new T.Quaternion())));
 const ul=shoulder.distanceTo(elbow),fl=elbow.distanceTo(wrist),dir=target.clone().sub(shoulder);
 if(dir.lengthSq()<1e-12||ul<1e-6||fl<1e-6)return null;
 const d=T.MathUtils.clamp(dir.length(),Math.abs(ul-fl)+1e-6,ul+fl-1e-6);dir.normalize();
 const bend=elbow.clone().sub(shoulder).addScaledVector(dir,-elbow.clone().sub(shoulder).dot(dir));
 if(bend.lengthSq()<1e-12)return null;bend.normalize();
 const along=(ul*ul-fl*fl+d*d)/(2*d),height=Math.sqrt(Math.max(0,ul*ul-along*along));
 const desiredElbow=shoulder.clone().addScaledVector(dir,along).addScaledVector(bend,height);
 const turn=(b,from,to)=>{if(from.lengthSq()<1e-12||to.lengthSq()<1e-12)return;setWorld(b,new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(b.getWorldQuaternion(new T.Quaternion())));};
 turn(upper,elbow.clone().sub(shoulder),desiredElbow.sub(shoulder));
 const nextElbow=fore.getWorldPosition(new T.Vector3());turn(fore,hand.getWorldPosition(new T.Vector3()).sub(nextElbow),target.clone().sub(nextElbow));setWorld(hand,handQ);
 return {reachErrorM:hand.getWorldPosition(new T.Vector3()).distanceTo(target)};
}
/** Limit only a digit's axial rotation. Keep its original swing (curl) and,
 * when requested, its child's entire world orientation; that redistributes the
 * excessive spin without moving the finger joints or grip contact.
 */
function limitAxialTwist(b,bind,maxDegrees,preserveChild=null){
 const rest=new T.Quaternion().fromArray(bind).normalize(),delta=rest.clone().invert().multiply(b.quaternion).normalize(),axis=new T.Vector3(0,1,0);
 let angle=2*Math.atan2(delta.y,delta.w);angle=T.MathUtils.euclideanModulo(angle+Math.PI,2*Math.PI)-Math.PI;
 const limited=T.MathUtils.clamp(angle,-maxDegrees*DEG,maxDegrees*DEG);if(Math.abs(angle-limited)<1e-7)return null;
 const childQ=preserveChild?.getWorldQuaternion(new T.Quaternion());
 const swing=delta.clone().multiply(new T.Quaternion().setFromAxisAngle(axis,-angle));
 b.quaternion.copy(rest.multiply(swing).multiply(new T.Quaternion().setFromAxisAngle(axis,limited))).normalize();b.updateMatrixWorld(true);
 if(preserveChild){preserveChild.quaternion.copy(preserveChild.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(childQ)).normalize();preserveChild.updateMatrixWorld(true);}
 return {beforeDegrees:angle/DEG,afterDegrees:limited/DEG};
}
export function applyFingerPolicy({bones,gun,cid,weapon,motion,time=0,duration=0}){
 const bind=BIND[cid],changedBones=[];if(!bind)return {active:false,changedBones};let reachErrorM;
 if(PISTOLS.has(weapon)&&HIGH_READY.has(motion)){
  // Reposition the support palm across the other hand without forcing fingertips.
  const result=offsetWrist(bones,gun,'Left',[.04,0,0]);if(result){changedBones.push('mixamorig:LeftArm','mixamorig:LeftForeArm','mixamorig:LeftHand');reachErrorM=result.reachErrorM;}
 }
 if(PISTOLS.has(weapon)&&TRIGGER.has(motion)){
  // Only the short-fingered military QSZ rig needs a 4 mm forward wrist fit;
  // the gun itself is held fixed and the baker records its hand-local track.
  if(cid==='military'&&weapon==='qsz92'){
   const result=offsetWrist(bones,gun,'Right',[0,0,-.004]);
   if(result){changedBones.push('mixamorig:RightArm','mixamorig:RightForeArm','mixamorig:RightHand');reachErrorM=result.reachErrorM;}
  }
  const delta=INDEX_DELTA[cid]?.[weapon];
  if(delta)for(let i=1;i<=3;i++){
   const name='mixamorig:RightHandIndex'+i,b=bones.get(name);
   if(b){b.quaternion.multiply(new T.Quaternion().fromArray(delta[i-1])).normalize();changedBones.push(name);}
  }
 }
 if(weapon==='m870'&&motion==='RifleWalk'){
  const n2='mixamorig:RightHandMiddle2',n3='mixamorig:RightHandMiddle3',b=bones.get(n2),child=bones.get(n3);
  if(b&&child&&child.parent===b&&limitAxialTwist(b,bind.middle2,35,child))changedBones.push(n2,n3);
 }
 return {active:changedBones.length>0,changedBones,...(reachErrorM===undefined?{}:{reachErrorM})};
}

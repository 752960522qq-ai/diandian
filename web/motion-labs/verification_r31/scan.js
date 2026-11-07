(() => {
 const {a,m,l,T}=qa, rows=[];
 for(const weapon of ['hanyang88','qbz95','c96','qcq171','type56_1','type97hawk','qbu85','winchester1897']) {
  const motions=['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle'];
  if(weapon==='type97hawk')motions.push('ShotgunPump');
  for(const motion of motions){
   poseAt(weapon,motion,0);const duration=l.getState().duration;
   const row={weapon,motion,duration,leftWrist:0,rightWrist:0,leftContact:0,rightContact:0,maxStep:0,maxStepBone:null,clearance:null,finite:true,elbowMin:180,elbowMax:0,pitchMin:180,pitchMax:-180};
   let prev;
   const count=Math.ceil(duration*60);
   for(let i=0;i<=count;i++){
    const t=duration*i/count;poseAt(weapon,motion,t);const d=metrics();
    row.leftWrist=Math.max(row.leftWrist,d.arms.Left.wristAngle);row.rightWrist=Math.max(row.rightWrist,d.arms.Right.wristAngle);
    row.leftContact=Math.max(row.leftContact,d.state.leftContactErrorM||0);row.rightContact=Math.max(row.rightContact,d.state.rightContactErrorM||0);
    row.elbowMin=Math.min(row.elbowMin,d.arms.Left.elbowAngle);row.elbowMax=Math.max(row.elbowMax,d.arms.Left.elbowAngle);
    row.pitchMin=Math.min(row.pitchMin,d.state.barrelPitchDegrees);row.pitchMax=Math.max(row.pitchMax,d.state.barrelPitchDegrees);
    const qs=['LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'].map(n=>a.bones[n].quaternion.clone());
    if(prev)qs.forEach((q,j)=>{const v=T.MathUtils.radToDeg(q.angleTo(prev[j]));if(v>row.maxStep){row.maxStep=v;row.maxStepBone=j;row.stepTime=t}});
    row.finite &&= qs.every(q=>q.toArray().every(Number.isFinite));prev=qs;
   }
   if(['c96','qbz95'].includes(weapon))for(let i=0;i<=12;i++){
    const v=armClearance(weapon,motion,duration*i/12).min;
    if(row.clearance===null||v<row.clearance){row.clearance=v;row.clearanceTime=duration*i/12}
   }
   rows.push(row);
  }
 }
 return {character:a.characterId,chestVertices:a.chestSkinning.vertexCount,rows};
})();

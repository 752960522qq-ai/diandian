(()=>{const {a,l,T}=qa,rows=[];const tests=[['hanyang88','RifleWalk'],...['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle'].flatMap(m=>[['qcq171',m],['qbu85',m]]),['type97hawk','RifleAimingIdle']];
 for(const [w,mo] of tests){poseAt(w,mo,0);const duration=l.getState().duration,g=a.weapons.get(w),stock=[];
  if(w==='qbu85')g.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,M=g.matrixWorld.clone().invert().multiply(o.matrixWorld);for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(M);if(v.z>.435)stock.push(v);}});
  const row={w,mo,duration,maxLeftWrist:0,maxRightWrist:0,leftError:0,rightError:0,stockClearance:1,stockTime:0,minElbow:180,maxElbow:0};
  for(let i=0;i<=Math.ceil(duration*60);i++){const t=duration*i/Math.ceil(duration*60);poseAt(w,mo,t);const data=metrics();row.maxLeftWrist=Math.max(row.maxLeftWrist,data.arms.Left.wristAngle);row.maxRightWrist=Math.max(row.maxRightWrist,data.arms.Right.wristAngle);row.leftError=Math.max(row.leftError,data.state.leftContactErrorM);row.rightError=Math.max(row.rightError,data.state.rightContactErrorM);row.minElbow=Math.min(row.minElbow,data.arms.Left.elbowAngle);row.maxElbow=Math.max(row.maxElbow,data.arms.Left.elbowAngle);
   if(stock.length){const e=g.worldToLocal(pos('RightForeArm')),p=g.worldToLocal(pos('RightHand')),seg=new T.Line3(e,p);for(const v of stock){const f=seg.closestPointToPointParameter(v,true),n=seg.at(f,new T.Vector3()),r=T.MathUtils.lerp(.046,.025,f),d=v.distanceTo(n)-r;if(d<row.stockClearance){row.stockClearance=d;row.stockTime=t;}}}
  } rows.push(row);
 }return rows;
})();

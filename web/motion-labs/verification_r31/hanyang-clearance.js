(() => {
 const {a,T,l}=qa;poseAt('hanyang88','RifleIdle',0);const gun=a.weapons.get('hanyang88'),triangles=[];
 gun.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index;
  for(let i=0;i<(idx?.count||p.count);i+=3){const vs=[0,1,2].map(k=>gun.worldToLocal(new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+k):i+k).applyMatrix4(o.matrixWorld)));
   if(vs.reduce((s,p)=>s+p.z,0)/3>.36)triangles.push(new T.Triangle(...vs));
  }
 });
 window.hanyangClearance=(motion,t)=>{
  poseAt('hanyang88',motion,t);const result={};
  for(const [part,from,to,r1,r2] of [['upper','RightArm','RightForeArm',.043,.03],['fore','RightForeArm','RightHand',.03,.020]]){
   const line=new T.Line3(gun.worldToLocal(pos(from)),gun.worldToLocal(pos(to)));let min=99,point=null;
   for(let j=0;j<=24;j++){const t=j/24,p=line.at(t,new T.Vector3()),r=T.MathUtils.lerp(r1,r2,t),q=new T.Vector3();
    for(const tri of triangles){tri.closestPointToPoint(p,q);const d=q.distanceTo(p)*gun.scale.x-r;if(d<min){min=d;point={t,p:p.toArray(),q:q.toArray()}}}
   }result[part]={min,point};
  }return result;
 };
 const rows=[];
 for(const mo of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle']){
  poseAt('hanyang88',mo,0);const duration=l.getState().duration;
  let upper=99,fore=99,tu=0,tf=0;
  for(let i=0;i<=12;i++){const t=duration*i/12,c=hanyangClearance(mo,t);if(c.upper.min<upper){upper=c.upper.min;tu=t}if(c.fore.min<fore){fore=c.fore.min;tf=t}}
  rows.push({mo,upper,fore,tu,tf});
 }return rows;
})();

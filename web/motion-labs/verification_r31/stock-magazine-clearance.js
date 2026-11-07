(() => {
 const {a,T}=qa;
 window.armClearance=(weapon,motion,time)=>{
  poseAt(weapon,motion,time);const gun=a.weapons.get(weapon),objects=[];
  gun.traverse(o=>{if(o.isMesh&&(weapon==='c96'?o.name.startsWith('stock'):o.name==='tripo_part_2'))objects.push(o)});
  const e=pos('RightForeArm'),w=pos('RightHand'),line=new T.Line3(e,w),out=new T.Vector3();
  let min=99,point=null,box=new T.Box3();
  for(const o of objects){const p=o.geometry.attributes.position,idx=o.geometry.index;
   for(let i=0;i<(idx?.count||p.count);i+=3){
    const vs=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(i+k):i+k).applyMatrix4(o.matrixWorld));
    const tri=new T.Triangle(...vs);
    for(let j=0;j<=32;j++){
     const t=j/32,center=line.at(t,new T.Vector3());tri.closestPointToPoint(center,out);
     const distance=out.distanceTo(center);const radius=T.MathUtils.lerp(.031,.020,t);
     if(distance-radius<min){min=distance-radius;point={t,center:gun.worldToLocal(center).toArray(),nearest:gun.worldToLocal(out.clone()).toArray(),distance,radius}}
    }
    for(const v of vs)box.expandByPoint(gun.worldToLocal(v.clone()));
   }
  }
  return {min,point,box};
 };
 return ['c96','qbz95'].map(w=>({weapon:w,...armClearance(w,'RifleIdle',3.46)}));
})();

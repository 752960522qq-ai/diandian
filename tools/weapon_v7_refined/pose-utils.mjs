import * as T from 'three';
export const V=a=>new T.Vector3().fromArray(a);
export function setWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize();b.updateMatrixWorld(true);}
export function repositionWrist(bones,side,target,handRotation=null){
 const bone=n=>bones.get('mixamorig:'+side+n),upper=bone('Arm'),fore=bone('ForeArm'),hand=bone('Hand');
 const s=upper.getWorldPosition(new T.Vector3()),e=fore.getWorldPosition(new T.Vector3()),h=hand.getWorldPosition(new T.Vector3()),hq=handRotation||hand.getWorldQuaternion(new T.Quaternion()),ul=s.distanceTo(e),fl=e.distanceTo(h),dir=target.clone().sub(s),d=T.MathUtils.clamp(dir.length(),Math.abs(ul-fl)+1e-6,ul+fl-1e-6);dir.normalize();
 const bend=e.clone().sub(s).addScaledVector(dir,-e.clone().sub(s).dot(dir)).normalize(),along=(ul*ul-fl*fl+d*d)/(2*d),height=Math.sqrt(Math.max(0,ul*ul-along*along)),elbow=s.clone().addScaledVector(dir,along).addScaledVector(bend,height);
 const turn=(b,a,z)=>setWorld(b,new T.Quaternion().setFromUnitVectors(a.normalize(),z.normalize()).multiply(b.getWorldQuaternion(new T.Quaternion())));
 turn(upper,e.clone().sub(s),elbow.sub(s));const ne=fore.getWorldPosition(new T.Vector3());turn(fore,hand.getWorldPosition(new T.Vector3()).sub(ne),target.clone().sub(ne));setWorld(hand,hq);return hand.getWorldPosition(new T.Vector3()).distanceTo(target);
}

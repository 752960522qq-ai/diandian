import * as THREE from 'three';
/** Playback the original-action retarget. No runtime body, wrist, or finger solve. */
export function applyNaturalWeaponTrack(attachment,track,time){
 const times=track.times;let i=1;while(i<times.length-1&&time>times[i])i++;const a=i-1,b=i,f=THREE.MathUtils.clamp((time-times[a])/(times[b]-times[a]||1),0,1);
 const p=new THREE.Vector3().fromArray(track.positions,a*3).lerp(new THREE.Vector3().fromArray(track.positions,b*3),f),q=new THREE.Quaternion().fromArray(track.rotations,a*4).slerp(new THREE.Quaternion().fromArray(track.rotations,b*4),f);
 const hand=attachment.bones.RightHand,gun=attachment.weapons.get(attachment.selectedWeapon);gun.position.copy(hand.localToWorld(p));gun.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).multiply(q));gun.scale.setScalar(1);gun.updateMatrixWorld(true);
 const pump=THREE.MathUtils.lerp(track.pump[a],track.pump[b],f);
 if(attachment.selectedWeapon==='m870')for(const part of attachment.pumpParts){const origin=part.object.parent.worldToLocal(gun.localToWorld(new THREE.Vector3())),shift=part.object.parent.worldToLocal(gun.localToWorld(new THREE.Vector3(0,0,pump)));part.object.position.copy(part.rest).add(shift.sub(origin));part.object.updateMatrixWorld(true);}
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(gun.quaternion);Object.assign(attachment.state,{naturalReference:true,sourceClip:track.source_clip,pumpTravelM:pump,barrelPitchDegrees:THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(forward.y,-1,1))),leftContactErrorM:null,rightContactErrorM:null});
}

// Read-only R40 check: final carry retains the re-targeted source hand direction.
import {setup} from './validate_pf89.mjs';import * as T from 'three';import fs from 'node:fs';
const result={hz:120,limits:'Source is the supplied Leon w07 upper-body retarget, with original rifle lower-body composition. No source finger animation exists. Hand quaternion comparison is in world space; elapsed steps do not prove full skin clearance.',characters:{}};
for(const cid of ['diandian','zhigeng']){const rt=await setup(cid),b=rt.attachment.bones,rows={};
 for(const motion of ['RifleIdle','RifleWalk','RifleRun']){const action=rt.model.actions.get(rt.cfg.weapons.pf89.animation_overrides[motion]),dur=action.getClip().duration,row={frames:0,minLeftAboveRightM:Infinity,maxSourceHandDirectionErrorDeg:0,maxSourceElbowPositionShiftM:0,maxLocalQuaternionStepDeg:0,maxLockedLeftErrorM:0,loopEndpointDeg:{}},prev={},first={};
 for(let i=0;i<=Math.ceil(dur*120);i++){const t=Math.min(i/120,dur),state=rt.pose(motion,t);row.frames++;row.minLeftAboveRightM=Math.min(row.minLeftAboveRightM,b.LeftHand.getWorldPosition(new T.Vector3()).y-b.RightHand.getWorldPosition(new T.Vector3()).y);row.maxLockedLeftErrorM=Math.max(row.maxLockedLeftErrorM,state.leftContactErrorM);
 const finalHandQ=b.LeftHand.getWorldQuaternion(new T.Quaternion()),finalElbow=b.LeftForeArm.getWorldPosition(new T.Vector3());
 for(const name of ['LeftArm','LeftForeArm','LeftHand']){const q=b[name].quaternion.clone();if(prev[name])row.maxLocalQuaternionStepDeg=Math.max(row.maxLocalQuaternionStepDeg,T.MathUtils.radToDeg(q.angleTo(prev[name])));first[name]??=q.clone();prev[name]=q;if(t===dur)row.loopEndpointDeg[name]=T.MathUtils.radToDeg(first[name].angleTo(q));}
 rt.attachment.beforeAnimation();rt.model.mixer.update(0);rt.scene.updateMatrixWorld(true);
 row.maxSourceHandDirectionErrorDeg=Math.max(row.maxSourceHandDirectionErrorDeg,T.MathUtils.radToDeg(finalHandQ.angleTo(b.LeftHand.getWorldQuaternion(new T.Quaternion()))));row.maxSourceElbowPositionShiftM=Math.max(row.maxSourceElbowPositionShiftM,finalElbow.distanceTo(b.LeftForeArm.getWorldPosition(new T.Vector3())));}
 if(row.minLeftAboveRightM<.12||row.maxSourceHandDirectionErrorDeg>.1||row.maxLocalQuaternionStepDeg>3||row.maxLockedLeftErrorM>.001)throw Error(`${cid}/${motion} carry constraint failed`);rows[motion]=row;}
 result.characters[cid]=rows;}
fs.writeFileSync(process.argv[2]||'work/pf89-r40/carry-source.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

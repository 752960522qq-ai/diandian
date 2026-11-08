// Actual skeleton playback, loop seams, finite transforms, grip and switching.
// Run: node tools/qa/validate_uploaded_motions.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {setup,read} from './validate_pf89.mjs';
import {uploadedMotions} from '../../web/motion-labs/diandian-classic-motion-lab/uploaded-motion.js';

const report = {};
assert.equal(uploadedMotions.length,8);
for (const cid of ['diandian','zhigeng']) {
  const rt=await setup(cid), {model}=rt;
  const pack=await read(`${rt.dir}/assets/uploaded_motions.glb`);
  assert.deepEqual(pack.animations.map(c=>c.name).sort(),uploadedMotions.map(m=>m.name).sort());
  for (const clip of pack.animations) {
    assert(!model.actions.has(clip.name),'Do not overwrite an existing action');
    model.actions.set(clip.name,model.mixer.clipAction(clip));
    assert.equal(clip.tracks.length,cid==='zhigeng'&&clip.name==='PistolShooting'?67:66);
    for (const track of clip.tracks) {
      assert(model.root.getObjectByName(track.name.slice(0,track.name.lastIndexOf('.'))),`Unbound ${track.name}`);
      assert([...track.times,...track.values].every(Number.isFinite));
    }
  }
  const bones=[...new Set(model.bones.values())];
  const snapshot=()=>bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
  const entries=[];
  for (const motion of uploadedMotions) {
    const clip=model.actions.get(motion.name).getClip();
    let minY=Infinity,maxY=-Infinity,maxLeft=0,maxRight=0;
    const count=Math.ceil(clip.duration*30);
    for(let i=0;i<=count;i++) {
      const state=rt.pose(motion.name,clip.duration*i/count,'qsz92');
      assert.equal(state.visible,motion.name==='PistolShooting');
      const values=snapshot();assert(values.every(Number.isFinite));
      const hips=model.bones.get('mixamorig:Hips').getWorldPosition(new THREE.Vector3());
      minY=Math.min(minY,hips.y);maxY=Math.max(maxY,hips.y);
      if (state.visible) {maxLeft=Math.max(maxLeft,state.leftContactErrorM);maxRight=Math.max(maxRight,state.rightContactErrorM);}
    }
    let seam=0;
    if(motion.loop) {
      rt.pose(motion.name,0,'qsz92');const start=snapshot();
      rt.pose(motion.name,clip.duration,'qsz92');const end=snapshot();
      seam=Math.max(...start.map((n,i)=>Math.abs(n-end[i])));
      assert(seam<1e-5,`${motion.name} seam ${seam}`);
    }
    assert(maxRight<.001,`${motion.name} right grip ${maxRight}`);
    assert(maxLeft<.04,`${motion.name} left grip ${maxLeft}`);
    rt.pose(motion.name,clip.duration*.37,'qsz92');const before=snapshot();
    rt.pose('RifleAimingIdle',.2,'pf89');rt.pose('RifleWalk',.4,'qbz95');
    rt.pose('SittingTalking',20,'qsz92');rt.pose(motion.name,clip.duration*.37,'qsz92');
    const after=snapshot(),drift=Math.max(...before.map((n,i)=>Math.abs(n-after[i])));
    assert(drift<1e-6,`${motion.name} switch drift ${drift}`);
    entries.push({name:motion.name,duration:clip.duration,frames:count+1,loop:motion.loop,loopSeam:seam,maxSwitchDrift:drift,hipsHeightRangeM:[minY,maxY],maxLeftGripErrorM:maxLeft,maxRightGripErrorM:maxRight});
  }
  const pistolGrips={};
  const duration=model.actions.get('PistolShooting').getClip().duration;
  for(const weapon of ['qsz92','type54']) {
    let left=0,right=0;
    for(let i=0;i<=35;i++) {
      const state=rt.pose('PistolShooting',duration*i/35,weapon);
      assert(state.visible);assert.equal(state.selectedWeapon,weapon);
      left=Math.max(left,state.leftContactErrorM);right=Math.max(right,state.rightContactErrorM);
    }
    assert(left<.01 && right<.001,`${cid} ${weapon} grip ${left}/${right}`);
    pistolGrips[weapon]={samples:36,maxLeftContactErrorM:left,maxRightContactErrorM:right};
  }
  report[cid]={passed:true,actions:entries,pistolGrips};
}
const path=new URL('../../web/motion-labs/verification_r42/catalog-runtime.json',import.meta.url);
fs.mkdirSync(new URL('.',path),{recursive:true});fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

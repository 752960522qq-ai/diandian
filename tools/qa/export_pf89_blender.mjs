// Export the evaluated runtime poses for a reproducible Blender animation bake.
// node tools/qa/export_pf89_blender.mjs output-directory
import { setup } from './validate_pf89.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as THREE from 'three';

const dest = path.resolve(process.argv[2]);
fs.mkdirSync(dest, { recursive: true });
for (const cid of ['diandian', 'zhigeng']) {
  const rt = await setup(cid);
  const fps = 60;
  const inverseBind = new Map();
  rt.model.root.traverse(o => {
    if (o.isSkinnedMesh) o.skeleton.bones.forEach((b, i) => {
      if ((b.userData.name || b.name).startsWith('mixamorig')) inverseBind.set(b, o.skeleton.boneInverses[i]);
    });
  });
  const clips = [];
  for (const entry of rt.composition) {
    const motion = Object.entries(rt.cfg.weapons.pf89.animation_overrides).find(([, v]) => v === entry.name)?.[0] || entry.name;
    const frames = [], count = Math.ceil(entry.duration * fps);
    for (let i = 0; i <= count; i++) {
      const time = entry.duration * i / count;
      const state = rt.pose(motion, time);
      const deforms = Object.fromEntries([...inverseBind].map(([bone, inv]) => [bone.userData.name || bone.name,
        bone.matrixWorld.clone().multiply(inv).toArray()]));
      const anchors = Object.fromEntries(['Hips','Head','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftFoot','RightFoot'].map(n =>
        ['mixamorig:' + n, rt.model.bones.get('mixamorig:' + n).getWorldPosition(new THREE.Vector3()).toArray()]));
      frames.push({ frame: 1 + time * fps, deforms, anchors,
        weapon: rt.attachment.weapons.get('pf89').matrixWorld.toArray(), visible: state.visible });
    }
    clips.push({ name: entry.name, motion, duration: entry.duration, frames });
  }
  const data = { character: cid, fps, model: rt.file, weapon: rt.dir + '/assets/weapons/pf89.glb', clips };
  fs.writeFileSync(path.join(dest, cid + '-poses.json.gz'), zlib.gzipSync(JSON.stringify(data)));
  console.log(cid, clips.length, 'clips exported');
}

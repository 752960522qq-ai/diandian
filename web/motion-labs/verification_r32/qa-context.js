(async () => {
  const T = await import(new URL('./vendor/three.module.js', location.href));
  const l = window.diandianLab || window.zhigengLab;
  const m = l.models.get('fixed'), a = m.weaponAttachment;
  window.qa = { T, l, m, a, baseline: await (await fetch('/assets/weapons/character_attachment_v31.json')).json(), candidate: structuredClone(a.config) };
  window.T = T;
  l.setPlaying(false);
  l.controls.enableDamping = false;
  window.pos = n => m.bones.get('mixamorig:' + n).getWorldPosition(new T.Vector3());
  window.poseAt = (weapon, motion, time) => {
    if (l.getState().weapon !== weapon) l.selectWeapon(weapon);
    if (l.getState().motion !== motion) l.setMotion(motion);
    l.setPlaying(false); l.seek(time);
    a.beforeAnimation();
    for (const { action } of m.activeActions) action.time = time;
    m.mixer.update(0);
    a.update(motion, time, { activeClips: l.getActiveClips(), aimPitch: 0 });
    l.scene.updateMatrixWorld(true);
    m.root.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
  };
  window.metrics = () => {
    const out = { state: a.getState(), arms: {} };
    for (const side of ['Left', 'Right']) {
      const s=pos(side+'Arm'), e=pos(side+'ForeArm'), w=pos(side+'Hand');
      out.arms[side] = { shoulder:s.toArray(), elbow:e.toArray(), wrist:w.toArray(),
        wristAngle:T.MathUtils.radToDeg(w.clone().sub(e).angleTo(pos(side+'HandMiddle1').sub(w))),
        elbowAngle:T.MathUtils.radToDeg(s.clone().sub(e).angleTo(w.clone().sub(e))),
        q:['Shoulder','Arm','ForeArm','Hand'].map(n=>m.bones.get('mixamorig:'+side+n).quaternion.toArray()) };
    }
    return out;
  };
  window.view = (kind='front', target=[0,1.2,0], distance=2.0) => {
    const dirs={front:[0,0,1],quarter:[1,.15,1],right:[1,0,.1],left:[-1,0,.1],top:[0,1,.15],back:[0,0,-1]};
    const center=new T.Vector3(...target), dir=new T.Vector3(...(dirs[kind]||kind)).normalize();
    l.camera.position.copy(center).addScaledVector(dir,distance);
    l.controls.target.copy(center); l.controls.update();
    l.renderer.render(l.scene,l.camera);
  };
  return { ready:true, character:a.characterId, motions:[...m.actions.keys()] };
})();

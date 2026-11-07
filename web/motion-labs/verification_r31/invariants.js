(async () => {
  const {a, m, l, T} = qa;
  const checks = [];
  const check = (name, pass, detail) => checks.push({name, pass, detail});
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const {isType97UpperTrack} = await import(new URL('./type97-motion.js?v=grip-r31', location.href));
  const key = track => {
    const p = T.PropertyBinding.parseTrackName(track.name);
    return `${(p.objectIndex || p.nodeName).replace(/[^A-Za-z0-9]/g, '')}.${p.propertyName}[${p.propertyIndex ?? ''}]`;
  };
  for (const [name, lower, upper] of [
    ['Type97Fire', 'FiringRifle', 'ShotgunFireLevel'],
    ['Type97Pump', 'RifleAimingIdle', 'ShotgunPumpLevel']
  ]) {
    const clip = m.actions.get(name).getClip();
    const base = m.actions.get(lower).getClip();
    const reference = m.actions.get(upper).getClip();
    const sources = new Map([...base.tracks.filter(t => !isType97UpperTrack(t)), ...reference.tracks.filter(isType97UpperTrack)].map(t => [key(t), t]));
    const mismatches = clip.tracks.filter(t => {
      const source = sources.get(key(t));
      return !source || !same(t.times, source.times) || !same(t.values, source.values);
    }).map(t => t.name);
    check(name + ': source tracks and duration', mismatches.length === 0 && clip.duration === reference.duration && clip.tracks.length === sources.size,
      {duration:clip.duration, upperTracks:clip.tracks.filter(isType97UpperTrack).length, lowerTracks:clip.tracks.filter(t => !isType97UpperTrack(t)).length, mismatches});
  }

  const snapshot = () => {
    const values = [];
    m.bones.forEach(b => values.push(...b.position.toArray(), ...b.quaternion.toArray(), ...b.scale.toArray()));
    const gun = a.weapons.get(a.selectedWeapon);
    values.push(...gun.position.toArray(), ...gun.quaternion.toArray(), ...gun.scale.toArray());
    return values;
  };
  const delta = (x, y) => Math.max(...x.map((v, i) => Math.abs(v - y[i])));
  let repeatError = 0, seekError = 0;
  for (const [w, mo, t] of [['hanyang88','RifleWalk',.23], ['qbz95','RifleRun',.47], ['c96','RifleIdle',5.11], ['type97hawk','ShotgunPump',.3], ['type56_1','RifleAimingIdle',2.03]]) {
    poseAt(w, mo, t); const original = snapshot();
    for (let i=0;i<5;i++) poseAt(w, mo, t);
    repeatError = Math.max(repeatError, delta(original, snapshot()));
    poseAt('qsz92','PistolAimingIdle',.2); poseAt(w, mo, 0); poseAt(w, mo, t);
    seekError = Math.max(seekError, delta(original, snapshot()));
  }
  check('Repeated poses do not accumulate', repeatError < 1e-10, {maxComponentDifference:repeatError});
  check('Switching and seeking restores poses', seekError < 1e-10, {maxComponentDifference:seekError});

  const pump = a.config.weapons.type97hawk.pump_motion;
  let maximum = 0, maxGeometryError = 0, maxHandError = 0;
  for (const t of pump.pump_times) {
    poseAt('type97hawk','ShotgunPump',t);
    maximum = Math.max(maximum,a.state.pumpTravelM);
    maxHandError = Math.max(maxHandError,a.state.leftContactErrorM);
    const gun = a.weapons.get('type97hawk');
    for (const part of a.type97PumpParts) {
      const rest = part.object.parent.localToWorld(part.rest.clone());
      const current = part.object.getWorldPosition(new T.Vector3());
      const expected = new T.Vector3(0,0,a.state.pumpTravelM * gun.scale.x).applyQuaternion(gun.quaternion);
      maxGeometryError = Math.max(maxGeometryError,current.sub(rest).distanceTo(expected));
    }
  }
  check('Pump geometry and support palm follow the same travel', maxGeometryError < 1e-6 && maxHandError < 1e-5,
    {maximumTravelM:maximum,maxGeometryErrorM:maxGeometryError,maxPalmErrorM:maxHandError});
  poseAt('type97hawk','RifleIdle',0);
  check('Pump resets outside its action', a.type97PumpParts.every(p => p.object.position.distanceTo(p.rest) < 1e-10), {travel:a.state.pumpTravelM});

  let badWeights = 0, maxWeightError = 0;
  for (const entry of a.chestSkinning.entries) {
    for (let i=0;i<entry.weights.count;i++) {
      const weights = Array.from(entry.weights.array.slice(i*4,i*4+4));
      if (weights.some(v=>!Number.isFinite(v)||v<0)) badWeights++;
      maxWeightError = Math.max(maxWeightError,Math.abs(weights.reduce((sum,v)=>sum+v,0)-1));
    }
  }
  check('Chest weights remain normalized and nonnegative', badWeights === 0 && maxWeightError < 1e-6,
    {affectedVertices:a.chestSkinning.vertexCount,badWeights,maxWeightError});
  const scope = [];
  for (const [w, mo, expected] of [['type97hawk','RifleIdle',true],['hanyang88','RifleWalk',true],['qbz95','RifleAimingIdle',false],['c96','Reloading',false],['type97hawk','ShotgunPump',false],['qsz92','PistolIdle',false]]) {
    poseAt(w,mo,.1);
    scope.push({weapon:w,motion:mo,expected,enabled:a.chestSkinning.enabled,correctBuffers:a.chestSkinning.entries.every(e=>e.geometry.attributes.skinWeight === (expected?e.weights:e.originalWeights))});
  }
  check('Chest relief only applies to long-gun idle and walk',scope.every(s=>s.expected===s.enabled&&s.correctBuffers),scope);
  check('97 model and physical length remain unchanged',a.mountFor('type97hawk','RifleIdle').model_scale === 1,{modelScale:a.mountFor('type97hawk','RifleIdle').model_scale});
  return {character:a.characterId,passed:checks.every(c=>c.pass),checks};
})();

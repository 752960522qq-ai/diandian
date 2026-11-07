(() => {
  const { a, m, l, T, candidate, baseline } = qa;
  const held = ['RifleIdle', 'RifleWalk', 'RifleRun', 'RifleAimingIdle', 'FiringRifle'];
  const use = config => { a.config = config; a.character = config.characters[a.characterId]; };
  const capture = () => ({
    bones: Object.fromEntries([...m.bones].map(([name, bone]) => [name,
      [...bone.position.toArray(), ...bone.quaternion.toArray(), ...bone.scale.toArray()]])),
    gun: a.weapons.get(a.selectedWeapon).matrixWorld.toArray(),
    hands: ['Left', 'Right'].map(s => a.bones[s + 'Hand'].matrixWorld.toArray()),
  });
  const delta = (x, y) => Math.max(...x.map((v, i) => Math.abs(v - y[i])));
  const cycles = [], regression = [], repeats = [];
  use(candidate);
  for (const weapon of ['qcq171', 'qbz95', 'hanyang88']) {
    for (const motion of held) {
      poseAt(weapon, motion, 0);
      const duration = l.getState().duration, count = Math.ceil(duration * 60);
      const row = { weapon, motion, frames: count + 1, finite: true,
        maxStepDegrees: 0, leftContactM: 0, rightContactM: 0,
        leftWristDegrees: 0, rightWristDegrees: 0, lengthDriftM: 0, gripDriftM: 0 };
      const side = weapon === 'hanyang88' ? 'Right' : 'Left';
      const firstGrip = a.weapons.get(weapon).worldToLocal(pos(side + 'HandMiddle1'));
      const lengths = ['Left', 'Right'].flatMap(s => [pos(s + 'Arm').distanceTo(pos(s + 'ForeArm')),
        pos(s + 'ForeArm').distanceTo(pos(s + 'Hand'))]);
      let previous;
      for (let i = 0; i <= count; i++) {
        poseAt(weapon, motion, duration * i / count);
        const data = metrics();
        const qs = ['LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand']
          .map(name => a.bones[name].quaternion.clone());
        row.finite &&= qs.every(q => q.toArray().every(Number.isFinite));
        if (previous) qs.forEach((q, j) => { row.maxStepDegrees = Math.max(row.maxStepDegrees,
          T.MathUtils.radToDeg(q.angleTo(previous[j]))); });
        previous = qs;
        const nowLengths = ['Left', 'Right'].flatMap(s => [pos(s + 'Arm').distanceTo(pos(s + 'ForeArm')),
          pos(s + 'ForeArm').distanceTo(pos(s + 'Hand'))]);
        row.lengthDriftM = Math.max(row.lengthDriftM, delta(lengths, nowLengths));
        row.gripDriftM = Math.max(row.gripDriftM,
          a.weapons.get(weapon).worldToLocal(pos(side + 'HandMiddle1')).distanceTo(firstGrip));
        row.leftContactM = Math.max(row.leftContactM, data.state.leftContactErrorM || 0);
        row.rightContactM = Math.max(row.rightContactM, data.state.rightContactErrorM || 0);
        row.leftWristDegrees = Math.max(row.leftWristDegrees, data.arms.Left.wristAngle);
        row.rightWristDegrees = Math.max(row.rightWristDegrees, data.arms.Right.wristAngle);
      }
      row.pass = row.finite && row.maxStepDegrees < 25 && row.lengthDriftM < 1e-5
        && row.gripDriftM < 1e-5 && row.leftContactM < 1e-5 && row.rightContactM < 1e-5;
      cycles.push(row);
    }
  }
  for (const weapon of Object.keys(a.config.weapons)) {
    const motions = a.config.weapons[weapon].type === 'pistol'
      ? ['PistolIdle', 'PistolWalk', 'PistolAimingIdle', ...(a.config.weapons[weapon].compatible_motions || [])]
      : [...held, 'Reloading'];
    if (['type97hawk', 'winchester1897'].includes(weapon)) motions.push('ShotgunPump');
    for (const motion of motions) for (const fraction of [0, .37, .79]) {
      use(candidate); poseAt(weapon, motion, 0);
      const time = l.getState().duration * fraction;
      poseAt(weapon, motion, time); const after = capture();
      use(baseline); poseAt(weapon, motion, time); const before = capture();
      const target = (weapon === 'qcq171' || weapon === 'hanyang88') && held.includes(motion)
        || weapon === 'qbz95' && ['RifleAimingIdle', 'FiringRifle'].includes(motion);
      const changedSide = weapon === 'hanyang88' ? 'Right' : 'Left';
      const permitted = name => target && ['Shoulder', 'Arm', 'ForeArm', 'Hand']
        .some(part => name.replace('mixamorig:', 'mixamorig').startsWith('mixamorig' + changedSide + part));
      let boneDelta = 0;
      for (const name in after.bones) if (!permitted(name))
        boneDelta = Math.max(boneDelta, delta(after.bones[name], before.bones[name]));
      const gunDelta = delta(after.gun, before.gun);
      const handDelta = weapon === 'qbz95' ? delta(after.hands[0], before.hands[0]) : 0;
      regression.push({ weapon, motion, fraction, boneDelta, gunDelta, handDelta,
        pass: boneDelta < 1e-6 && gunDelta < 1e-6 && handDelta < 2e-6 });
    }
  }
  use(candidate);
  for (const weapon of ['qcq171', 'qbz95', 'hanyang88']) for (const motion of held) {
    poseAt(weapon, motion, .1); const expected = capture();
    for (let i = 0; i < 20; i++) poseAt(weapon, motion, .1);
    poseAt('type56_1', 'RifleRun', .4); poseAt(weapon, motion, .1);
    const actual = capture();
    const maximum = Math.max(delta(expected.gun, actual.gun), ...Object.keys(expected.bones)
      .map(name => delta(expected.bones[name], actual.bones[name])));
    repeats.push({ weapon, motion, maximum, pass: maximum < 1e-6 });
  }
  return { character: a.characterId, revision: a.config.revision,
    passed: [...cycles, ...regression, ...repeats].every(r => r.pass),
    totalFrames: cycles.reduce((sum, r) => sum + r.frames, 0), cycles, regression, repeats };
})();

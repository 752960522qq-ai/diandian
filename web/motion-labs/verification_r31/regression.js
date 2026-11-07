(async () => {
  const {a,m,l,T}=qa;
  const root = window.QA_BASELINE_ROOT || `/work/grip-r31/before/${a.characterId}/`;
  const [{WeaponAttachment:Baseline},baseline] = await Promise.all([
    import(root+'weapon-attachment.js'),fetch(root+'assets/weapon_attachment.json').then(r=>r.json())
  ]);
  const currentConfig=a.config, currentPrototype=Object.getPrototypeOf(a);
  const cases=[];
  for(const w of ['qsz92','type54']) for(const mo of ['PistolIdle','PistolAimingIdle','PistolWalk']) for(const t of [0,.2])cases.push([w,mo,t]);
  for(const w of ['qbu85','winchester1897'])for(const mo of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle','Reloading'])for(const t of [0,.2])cases.push([w,mo,t]);
  for(const mo of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','Reloading']) for(const t of [0,.2])cases.push(['type97hawk',mo,t]);
  for(const mo of ['RifleAimingIdle','FiringRifle','Reloading'])for(const t of [0,.2])cases.push(['c96',mo,t]);
  for(const mo of ['RifleIdle','RifleWalk','RifleRun','Reloading'])for(const t of [0,.2])cases.push(['qcq171',mo,t]);
  for(const w of ['hanyang88','qbz95','type56_1'])cases.push([w,'Reloading',.2]);
  cases.push(['qbz95','RifleWalk',.2]);
  const capture=(w,mo,t)=>{
    poseAt(w,mo,t);const bones={};m.bones.forEach((b,n)=>bones[n]=[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]);
    const gun=a.weapons.get(w);return {bones,gun:[...gun.position.toArray(),...gun.quaternion.toArray(),...gun.scale.toArray()]};
  };
  const maxDelta=(x,y)=>Math.max(...x.map((v,i)=>Math.abs(v-y[i])));
  const useBaseline=()=>{a.beforeAnimation();a.chestSkinning.setEnabled(false);a.config=baseline;a.character=baseline.characters[a.characterId];Object.setPrototypeOf(a,Baseline.prototype);};
  const useCurrent=()=>{a.beforeAnimation();a.config=currentConfig;a.character=currentConfig.characters[a.characterId];Object.setPrototypeOf(a,currentPrototype);};
  const results=[];
  try {
    for(const [w,mo,t] of cases){
      useCurrent();const after=capture(w,mo,t);useBaseline();const before=capture(w,mo,t);
      const error=Math.max(maxDelta(before.gun,after.gun),...Object.keys(before.bones).map(n=>maxDelta(before.bones[n],after.bones[n])));
      results.push({weapon:w,motion:mo,time:t,maxComponentDifference:error,pass:error<1e-10});
    }
    const grip=[];
    for(const mo of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle']){
      useBaseline();poseAt('type56_1',mo,.15);const oldPosition=a.weapons.get('type56_1').position.clone(),oldQuaternion=a.weapons.get('type56_1').quaternion.clone(),oldHand=pos('RightHand');
      const leftBones=['LeftShoulder','LeftArm','LeftForeArm','LeftHand'];
      const oldLeft=leftBones.flatMap(n=>a.bones[n].quaternion.toArray());
      const baselineSupportErrorM=a.state.leftContactErrorM;
      useCurrent();poseAt('type56_1',mo,.15);const gun=a.weapons.get('type56_1');
      const offset=pos('RightHand').sub(oldHand).applyQuaternion(gun.quaternion.clone().invert()).divideScalar(gun.scale.x);
      const leftArmDifference=maxDelta(oldLeft,leftBones.flatMap(n=>a.bones[n].quaternion.toArray()));
      grip.push({motion:mo,weaponPositionDifference:gun.position.distanceTo(oldPosition),weaponAngleDifference:gun.quaternion.angleTo(oldQuaternion),handOffsetWeaponM:offset.toArray(),leftArmDifference,baselineSupportErrorM,supportErrorM:a.state.leftContactErrorM,pass:gun.position.distanceTo(oldPosition)<1e-10&&gun.quaternion.angleTo(oldQuaternion)<1e-7&&offset.distanceTo(new T.Vector3(0,0,.02))<1e-6&&leftArmDifference<1e-10});
    }
    return {character:a.characterId,passed:results.every(r=>r.pass)&&grip.every(r=>r.pass),unchangedPoses:results,type56Grip:grip};
  } finally {useCurrent();}
})();

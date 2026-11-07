(() => {
 const {a,l}=qa,rows=[];
 for(const weapon of ['hanyang88','qbz95','c96'])for(const motion of ['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','FiringRifle']){
  poseAt(weapon,motion,0);const duration=l.getState().duration;
  // 61 uniform samples, plus source key times, cover endpoints and authored extrema.
  const times=new Set(Array.from({length:61},(_,i)=>duration*i/60));
  for(const {action} of qa.m.activeActions) for(const track of action.getClip().tracks)for(const t of track.times)if(t>=0&&t<=duration)times.add(t);
  const row={weapon,motion,samples:times.size,foreMinM:99,foreTime:0,upperMinM:weapon==='hanyang88'?99:null,upperTime:null};
  for(const t of [...times].sort((a,b)=>a-b)){
   const result=weapon==='hanyang88'?hanyangClearance(motion,t):{fore:{min:armClearance(weapon,motion,t).min}};
   if(result.fore.min<row.foreMinM){row.foreMinM=result.fore.min;row.foreTime=t}
   if(result.upper&&result.upper.min<row.upperMinM){row.upperMinM=result.upper.min;row.upperTime=t}
  }
  row.pass=row.foreMinM>0&&(row.upperMinM===null||row.upperMinM>0);rows.push(row);
 }
 return {character:a.characterId,passed:rows.every(r=>r.pass),method:'Gun triangle distances to sampled tapered arm centerlines; a conservative geometric proxy, not a proof of all skin/cloth contacts.',rows};
})();

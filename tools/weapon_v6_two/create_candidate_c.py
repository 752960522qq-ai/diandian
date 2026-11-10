"""Keep pistol run/reload entry points while preserving source body motion."""
from pathlib import Path
import json,shutil,copy
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'work/weapon_v6_two'
meta=json.loads((ROOT/'assets/weapons/refined_v2_attachment.json').read_text())['weapons']
module='''import * as THREE from 'three';
/** Source RifleRun body/head/lower limbs plus LeonPistolWalk arms only.
 * The source library has no dedicated pistol run or reload clip.
 * Reloading uses the unmodified generic source Reloading clip, support hand released.
 */
export function installSourcePistolRun(model) {
  const run=model.actions.get('RifleRun').getClip(),carry=model.actions.get('LeonPistolWalk').getClip();
  const arm=t=>/Shoulder|Arm|ForeArm|Hand/.test(t.name);
  const tracks=run.tracks.filter(t=>!arm(t)).map(t=>t.clone());
  if(Math.abs(run.duration-carry.duration)>1e-6)throw new Error('Source run/carry durations differ; do not compress source arms implicitly.');
  for(const source of carry.tracks.filter(arm))tracks.push(source.clone());
  const clip=new THREE.AnimationClip('SourcePistolRun',run.duration,tracks);
  clip.userData={sourceBody:'RifleRun',sourceArms:'LeonPistolWalk',sourceLimitation:'No dedicated pistol run in the source library.'};
  model.actions.set(clip.name,model.mixer.clipAction(clip));
}
'''
for folder in ['diandian-classic-motion-lab','zhigeng-motion-lab']:
 src=out/'candidate_b'/folder;dst=out/'candidate_c'/folder
 if dst.exists():shutil.rmtree(dst)
 shutil.copytree(src,dst,symlinks=True)
 (dst/'source-pistol-motion.js').write_text(module)
 app=dst/'app.js';s=app.read_text();s="import { installSourcePistolRun } from './source-pistol-motion.js';\n"+s
 s=s.replace('  installFixedGunMotions(model);','  installFixedGunMotions(model);\n  installSourcePistolRun(model);')
 s=s.replace("&& type === 'pistol') weapon = state.lastRifleWeapon;", "&& type === 'pistol' && !weaponConfig.weapons[weapon].compatible_motions?.includes(name)) weapon = state.lastRifleWeapon;")
 s=s.replace('function selectWeapon(id, switchMotion = true) {', "function selectWeapon(id, switchMotion = true) {\n  if (id === 'winchester1897') id = 'm870';")
 app.write_text(s)
 p=dst/'assets/weapon_attachment.json';cfg=json.loads(p.read_text());w=cfg['weapons']['m870'];w['refined_geometry']=meta['m870'];w['length_m']=1
 for key in ['normalization','game_dimensions_m','game_sha256','width_adjustment','source']:
  if key in meta['m870']:w[key]=copy.deepcopy(meta['m870'][key])
 w.pop('length_match',None)
 original=json.loads((out/'baseline'/folder/'assets/weapon_attachment.json').read_text())
 w['re4_shotgun']['pump_travel_m']={k:[v*.075/.085 for v in vs] for k,vs in original['weapons']['winchester1897']['re4_shotgun']['pump_travel_m'].items()}
 w['re4_shotgun']['pump_travel_policy']='Original M97 pump timing/shape, amplitude scaled to refined M870 75 mm travel; hand follows actual pump.'
 for wid in ['qsz92','type54','type64']:
  cfg['weapons'][wid]['compatible_motions']=['RifleRun','Reloading'];cfg['weapons'][wid]['animation_overrides']['RifleRun']='SourcePistolRun'
  cfg['weapons'][wid]['motion_source_notes']={'RifleRun':'Original RifleRun body/head/lower limbs, original LeonPistolWalk arm tracks. Both original clips are 0.6666666865 s, so source times remain unchanged. No new joint poses.','Reloading':'Original generic Reloading clip and timing; support hand released. No authored magazine prop animation.'}
  for cid,char in cfg['characters'].items():
   m=char['mounts'][wid];m['motions']['SourcePistolRun']=copy.deepcopy(m['motions']['LeonPistolWalk'])
   # The generic reload mounting is present on source QSZ92; use that original
   # hand-to-gun orientation for 54/64 as well, without v5 guiding trajectories.
   reload=copy.deepcopy(original['characters'][cid]['mounts']['qsz92']['motions']['Reloading'])
   reload.update(release_support_hand=True,trigger_finger_ik=False)
   m['motions']['Reloading']=reload
 p.write_text(json.dumps(cfg,indent=2,ensure_ascii=False)+'\n')
 catpath=dst/'assets/weapon_catalog.json';cat=json.loads(catpath.read_text())
 for entry in cat:
  if entry['Id']=='winchester1897':entry.update(Id='m870',DisplayName='M870霰弹枪',AssetId='m870',ModelPath='res://assets/weapons/m870.glb',LengthMm=1000)
 if not any(e['Id']=='type64' for e in cat):cat.append({'Id':'type64','DisplayName':'64式手枪','Category':0,'AssetId':'type64','ModelPath':'res://assets/weapons/type64.glb','LengthMm':155})
 catpath.write_text(json.dumps(cat,indent=2,ensure_ascii=False)+'\n')
print('candidate_c generated with new 1 m/slimmer M870 and source-only pistol composition.')

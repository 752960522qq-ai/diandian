"""A second review candidate: source animation plus 30 mm support-hand translation.
No new upper-body clips, wrist orientation overrides, or finger poses are introduced.
"""
from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'work/weapon_v6_two'
meta=json.loads((ROOT/'assets/weapons/refined_v2_attachment.json').read_text())['weapons']
for folder in ['diandian-classic-motion-lab','zhigeng-motion-lab']:
 src=out/'candidate_a'/folder;dst=out/'candidate_b'/folder
 if dst.exists():shutil.rmtree(dst)
 shutil.copytree(src,dst,symlinks=True)
 p=dst/'assets/weapon_attachment.json';cfg=json.loads(p.read_text());w=cfg['weapons']['m870']
 w['refined_geometry']=meta['m870'];w['length_m']=meta['m870']['length_m']
 ratio=.07494300305843353/.085
 w['re4_shotgun']['pump_travel_m']={k:[v*ratio for v in vs] for k,vs in w['re4_shotgun']['pump_travel_m'].items()}
 w['re4_shotgun']['pump_travel_policy']='Original M97 pump timing/shape, amplitude scaled to refined M870 74.943 mm travel; hand follows actual pump.'
 for char in cfg['characters'].values():
  m=char['mounts']['m870']
  for pose in [m,*m['motions'].values(),m['re4_mount']]:
   if 'left_grip' in pose:pose['left_grip'][1]-=.030
  m['adaptation_policy']='Retain original M97 body animation, hand world directions and digit poses; support palm translates down 30 mm for the thicker/lower M870 fore-end.'
 p.write_text(json.dumps(cfg,indent=2,ensure_ascii=False)+'\n')
print('candidate_b ready for visual review; production unchanged.')

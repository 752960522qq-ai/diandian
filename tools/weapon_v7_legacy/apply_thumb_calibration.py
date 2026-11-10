"""Apply the reviewed V7 Linxu legacy Thumb1 correction without touching other fields.

Reference tracks incorrectly used a near-opposite thumb-root orientation in all
legacy grips. Move each unchanged track toward the original idle hand by each reviewed amount
pose; keep Thumb2/3, timing, hand/gun transforms and animation unchanged. The
bounded compromise prioritizes reducing the visible wrist pinch over exact
retention of a defective thumb-tip position. Re-run is idempotent, unexpected
input is rejected. This does not claim no interpenetration.
"""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
P=ROOT/'web/motion-labs/linxu-motion-lab/assets/weapon_attachment.json'
MANIFEST=Path(__file__).with_name('thumb_calibration.json')
D=json.loads(P.read_text()); records=json.loads(MANIFEST.read_text());key='mixamorig:RightHandThumb1';count=0
for wid,rec in records.items():
 mount=D['characters']['linxu']['mounts'][wid]
 for obj in [mount,*mount['motions'].values()]:
  track=obj.get('reference_grip',{}).get('tracks',{}).get(key)
  if not track:continue
  values=track['values']; assert len(values)%4==0
  for i in range(0,len(values),4):
   q=values[i:i+4];dot=lambda a,b:abs(sum(x*y for x,y in zip(a,b)))
   if dot(q,rec['after'])>1-1e-6:continue
   if dot(q,rec['before'])<1-1e-6 and dot(q,rec.get('prior_after',rec['before']))<1-1e-6:raise ValueError(f'unexpected {wid} thumb track at key {i//4}; refusing to overwrite')
   values[i:i+4]=rec['after'];count+=1
P.write_text(json.dumps(D,indent=2,ensure_ascii=False)+'\n')
print('updated thumb keys:',count)

import os
import json
from pathlib import Path
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[2]; I=Path(os.environ['LINXU_OLD_RUN_LEGACY_SOURCE']).resolve();O=(R/Path(os.environ.get('LINXU_OLD_RUN_OUTPUT','web/motion-labs/verification_weapon_v6_old_run_review'))).resolve();(O/'sheets').mkdir(exist_ok=True)
for row in json.loads((I/'legacy-review-manifest.json').read_text())['rows']:
 name=row['name'];paths=[I/'legacy-frames'/name/f'{v}-{i:03d}.png'for v in ['front','left','back']for i in range(9)]
 if not all(p.exists()for p in paths):continue
 dest=O/'sheets'/(name+'.jpg')
 if dest.exists():continue
 tile=320;out=Image.new('RGB',(9*tile,3*(tile+24)+40),'#202428');d=ImageDraw.Draw(out);d.text((10,10),name+' | actual UI branch '+row['clip']+' | textured skinned runtime | front / left / back',fill='white')
 for vi,v in enumerate(['front','left','back']):
  for i in range(9):
   im=Image.open(I/'legacy-frames'/name/f'{v}-{i:03d}.png').convert('RGB').resize((tile,tile));x=i*tile;y=40+vi*(tile+24);out.paste(im,(x,y));d.text((x+5,y+tile+4),f'{v} phase={i/8:.3f} t={row["duration"]*i/8:.3f}s',fill='white')
 out.save(dest,quality=95);print(dest)

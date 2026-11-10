from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
D=Path('web/motion-labs/verification_weapon_v6_three');font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
for cid in ['linxu','military','vest']:
 for w,motions in [('m870',['RifleIdle','RifleWalk','RifleRun','RifleAimingIdle','ShotgunAimUp','ShotgunAimDown','FiringRifle','ShotgunPump','Reloading']),('type64',['PistolIdle','PistolWalk','RifleRun','PistolAimingIdle','PistolShooting','Reloading'])]:
  sheet=Image.new('RGB',(6*230,len(motions)*260),(245,245,245));draw=ImageDraw.Draw(sheet)
  for row,m in enumerate(motions):
   for pi,ph in enumerate(['0','0.33','0.67']):
    for ai,angle in enumerate(['left','right']):
     f=D/f'{cid}-{w}-{m}-p{ph}-runtime-{angle}.png'
     if not f.exists():f=D/f'{cid}-{w}-{m}-p0-runtime-{angle}.png'
     x=(pi*2+ai)*230;y=row*260
     if f.exists():sheet.paste(Image.open(f).convert('RGB').resize((230,230)),(x,y))
     draw.text((x+3,y+232),f'{m}  {ph}  {angle}',font=font,fill=(10,10,10))
  sheet.save(D/f'{cid}-{w}-all-phase-review.jpg',quality=92)

from pathlib import Path
from PIL import Image,ImageDraw
p=Path(__file__).resolve().parents[2]/'web/motion-labs/verification_weapon_v6_two/sequences'
for cid in ['diandian','zhigeng']:
 for weapon,motion,phases in [('m870','Reloading',[0,.25,.5,.75,1]),('m870','ShotgunPump',[0,.25,.375,.5,1]),('qsz92','RifleRun',[0,.25,.5,.75,1]),('qsz92','Reloading',[0,.25,.5,.75,1])]:
  combos=[(k,a)for a in ['full','left'] for k in (['baseline','candidate_c'] if weapon=='m870' else ['candidate_c'])]
  files=[p/f'{cid}-{weapon}-{motion}-{phase}-{k}-{a}.png' for k,a in combos for phase in phases]
  if not all(f.exists() for f in files):continue
  im=Image.new('RGB',(2000,510*len(combos)),'white');d=ImageDraw.Draw(im)
  for j,(k,a) in enumerate(combos):
   for i,phase in enumerate(phases):
    file=p/f'{cid}-{weapon}-{motion}-{phase}-{k}-{a}.png';im.paste(Image.open(file),(i*400,j*510+30));d.text((i*400+8,j*510+8),f'{cid} {motion} {phase*100:g}% {k} {a}',fill='black')
  im.save(p/f'{cid}-{weapon}-{motion}-sequence.jpg')

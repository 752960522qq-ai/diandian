from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,subprocess
O=Path(__file__).resolve().parents[2]/'web/motion-labs/verification_weapon_v6_shoulder';F=O/'frames';C=O/'comparison-frames';C.mkdir(exist_ok=True);S=O/'sheets';S.mkdir(exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
missing=[str(F/m/f'{a}-{i:03d}.png')for m in ['before','after']for a in ['front','left','back']for i in range(41) if not(F/m/f'{a}-{i:03d}.png').exists()]
if missing:raise SystemExit('INCOMPLETE: '+str(len(missing))+' images remain')
for i in range(40):
 out=Image.new('RGB',(1440,1016),'white');d=ImageDraw.Draw(out)
 for j,mode in enumerate(['before','after']):
  for k,a in enumerate(['front','left','back']):
   out.paste(Image.open(F/mode/f'{a}-{i:03d}.png').convert('RGB'),(480*k,508*j+28));d.text((480*k+8,508*j+4),f'{mode.upper()} | {a} | phase {i/40:.3f}',font=font,fill='black')
 out.save(C/f'comparison-{i:03d}.png')
for a in ['front','left','back']:
 out=Image.new('RGB',(1920,1044),'white');d=ImageDraw.Draw(out)
 for p,i in enumerate(range(0,41,5)):
  row=p//3;col=p%3
  for j,mode in enumerate(['before','after']):
   x=col*640+j*320;y=row*348
   out.paste(Image.open(F/mode/f'{a}-{i:03d}.png').convert('RGB').resize((320,320)),(x,y+28));d.text((x+4,y+5),f'{mode} | p={i/40:.3f}',font=font,fill='black')
 out.save(S/f'{a}-nine-phase-before-after.jpg',quality=94)
 # All 41 actual candidate frames, split into two readable temporal sheets.
 for part,(start,end) in enumerate([(0,21),(21,41)]):
  out=Image.new('RGB',(1680,804),'white');d=ImageDraw.Draw(out)
  for idx,i in enumerate(range(start,end)):
   x=(idx%7)*240;y=(idx//7)*268
   out.paste(Image.open(F/'after'/f'{a}-{i:03d}.png').convert('RGB').resize((240,240)),(x,y+28));d.text((x+4,y+4),f'After p={i/40:.3f}',font=font,fill='black')
  out.save(S/f'{a}-all-candidate-{part+1}.jpg',quality=94)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-stream_loop','7','-framerate','60','-i',str(C/'comparison-%03d.png'),'-t','5.333333333','-c:v','libx264','-pix_fmt','yuv420p','-crf','19','-movflags','+faststart',str(O/'linxu-m870-run-before-after-three-views.mp4')],check=True)
print('COMPLETE: 246 exact skin renders; 9 temporal/phase sheets; 3-view comparison MP4, 8 loops at original speed')

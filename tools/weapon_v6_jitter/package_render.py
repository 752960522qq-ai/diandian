from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,subprocess
O=Path('web/motion-labs/verification_weapon_v6_jitter');F=O/'walk-render-frames';A=O/'walk-labeled-frames';A.mkdir(exist_ok=True)
font='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';f=ImageFont.truetype(font,23);small=ImageFont.truetype(font,17);frames=[]
for i in range(28):
 im=Image.open(F/f'{i:03}.png').convert('RGB');out=Image.new('RGB',(im.width,im.height+102),'#18232a');out.paste(im,(0,62));d=ImageDraw.Draw(out);d.text((135,13),'原站 / v5',font=f,fill='#ffb49f');d.text((570,13),'最小修复候选',font=f,fill='#87dfcb');d.text((18,im.height+70),'同一原始步态 · 固定镜头 · 正常上下起伏仍约4cm · 只平滑额外贴地补偿',font=small,fill='white');out.save(A/f'{i:03}.png');frames.append(out)
seq=frames*3;seq[0].save(O/'walk-original-vs-candidate.gif',save_all=True,append_images=seq[1:],duration=[50 if i%6==5 else 40 for i in range(len(seq))],loop=0,optimize=True)
sheet=Image.new('RGB',(1800,772),'#18232a')
for k,i in enumerate([0,4,8,12,16,20,24,27]):
 tile=frames[i].resize((450,386));sheet.paste(tile,((k%4)*450,(k//4)*386));d=ImageDraw.Draw(sheet);d.text(((k%4)*450+8,(k//4)*386+34),f'{i/24:.3f}s',font=small,fill='white')
sheet.save(O/'walk-contact-sheet.png')
try:
 subprocess.run(['ffmpeg','-y','-stream_loop','2','-framerate','24','-i',str(A/'%03d.png'),'-frames:v','84','-c:v','libx264','-pix_fmt','yuv420p','-crf','20','-movflags','+faststart',str(O/'walk-original-vs-candidate.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
except Exception as e:print('MP4 optional packaging failed:',e)
print('PACKAGED REAL RENDERS')

import json,sys,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[2];O=R/'web/motion-labs/verification_weapon_v6_full_review/linxu'
for root_name in ['frames','frames-full','frames-detail']:
 S=O/('sheets' if root_name=='frames' else root_name.replace('frames','sheets'));S.mkdir(exist_ok=True)
 for folder in sorted((O/root_name).glob('*')):
  if not(folder/'metadata.json').exists():continue
  meta=json.loads((folder/'metadata.json').read_text());rows=meta['frames'];N=max(x['index'] for x in rows)+1
  if any(not (O/x['image']).exists()for x in rows):continue
  destination=S/(folder.name+'.jpg')
  if not destination.exists()or destination.stat().st_mtime<(folder/'metadata.json').stat().st_mtime:
   tile=256;out=Image.new('RGB',(N*tile,3*(tile+24)+36),'#202428');draw=ImageDraw.Draw(out);draw.text((10,10),folder.name+' | actual runtime skinned mesh | front / side / back',fill='white')
   for item in rows:
    im=Image.open(O/item['image']).convert('RGB').resize((tile,tile));x=item['index']*tile;y=36+['front','side','back'].index(item['view'])*(tile+24);out.paste(im,(x,y));draw.text((x+5,y+tile+4),f"{item['view']} t={item['time']:.3f}s",fill='white')
   out.save(destination,quality=93)
  if (folder/'metadata-continuous.json').exists():
   V=O/'videos';V.mkdir(exist_ok=True);out=V/(folder.name+'.mp4');fps=json.loads((folder/'metadata-continuous.json').read_text())['renderSamplingHz']
   if out.exists():continue
   subprocess.run(['ffmpeg','-y','-loglevel','error',*[v for view in ['front','side','back'] for v in ['-framerate',str(fps),'-i',str(folder/(view+'-%03d-continuous.png'))]],'-filter_complex','[0:v][1:v][2:v]hstack=inputs=3[v]','-map','[v]','-c:v','libx264','-crf','21','-pix_fmt','yuv420p',str(out)],check=True)

"""Lay out real before/after render pairs, without altering their depicted geometry."""
import hashlib,json,textwrap
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parents[2];spec=json.loads((ROOT/'Docs/weapon_update_v7/evidence-pairs.json').read_text());OUT=ROOT/'Docs/weapon_update_v7/evidence';OUT.mkdir(exist_ok=True)
fontfile='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
font=lambda n:ImageFont.truetype(fontfile,n)
manifest=[]
for page in range((len(spec)+2)//3):
 rows=spec[page*3:page*3+3];sheet=Image.new('RGB',(1240,120+len(rows)*708),(243,245,247));draw=ImageDraw.Draw(sheet)
 draw.text((28,15),'V7 实际蒙皮前后复核',font=font(32),fill='#15232c');draw.text((28,62),'左：V6    右：V7    离线真实蒙皮渲染，非浏览器实机截图',font=font(22),fill='#46545f')
 for r,item in enumerate(rows):
  top=110+r*708;draw.text((28,top),item['caption'],font=font(24),fill='#15232c')
  record={**item,'sources':{}}
  for col,mode in enumerate(['before','after']):
   src=Path(item[mode]);src=src if src.is_absolute() else ROOT/src;raw=src.read_bytes();img=Image.open(src).convert('RGB');thumb=ImageOps.contain(img,(596,596),Image.Resampling.LANCZOS);sheet.paste(thumb,(24+col*612+(596-thumb.width)//2,top+44+(596-thumb.height)//2));record['sources'][mode]={'name':src.name,'sha256':hashlib.sha256(raw).hexdigest()}
  note=item.get('note','');draw.text((28,top+650),note,font=font(18),fill='#46545f');manifest.append(record)
 sheet.save(OUT/f'V7_前后复核_{page+1}.jpg',quality=91,optimize=True)
(OUT/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Created',page+1,'review sheets')

"""Package compact contact sheets from actual-runtime Blender QA renders.
Usage: python tools/weapon_v7_legacy/package_evidence.py [scratch_root] [output]
Inputs are produced by capture.mjs/render.py; full GLBs and frames are excluded.
"""
from PIL import Image,ImageDraw
from pathlib import Path
import sys,json,hashlib
scratch=Path(sys.argv[1] if len(sys.argv)>1 else '../terra_scratch').resolve()
out=Path(sys.argv[2] if len(sys.argv)>2 else 'web/motion-labs/verification_weapon_v7_legacy').resolve()
for d in ['idle','key_shots','actions','metrics']:(out/d).mkdir(parents=True,exist_ok=True)
weapons=['qcq171','type97hawk','qbu85','type56_1','qbz95'];cids=['linxu','military','vest'];nums=list(range(0,17,2))
for cid in cids:
 for w in weapons:
  ident=f'{cid}-{w}';sheet=Image.new('RGB',(256*9,2*282+30),'#1d2528');D=ImageDraw.Draw(sheet);D.text((8,8),f'{ident} RifleIdle: upper V6, lower V7; sampled phases',fill='white')
  for row,kind in enumerate(['before','current']):
   for col,i in enumerate(nums):
    p=scratch/kind/'render'/ident/f'angled-{i:02}.png'; assert p.exists(),p
    img=Image.open(p).convert('RGB').resize((256,256),Image.Resampling.LANCZOS);sheet.paste(img,(col*256,30+row*282));D.text((col*256+3,30+row*282+258),f'{kind} {i/16:.3f}',fill='white')
  sheet.save(out/'idle'/f'{ident}.jpg',quality=88,optimize=True)
for w,n in [('qcq171',8),('type97hawk',13),('qbu85',11),('type56_1',6),('qbz95',11)]:
 ident='linxu-'+w;sheet=Image.new('RGB',(1536,802),'#1d2528');d=ImageDraw.Draw(sheet)
 for i,kind in enumerate(['before','current']):
  p=scratch/kind/'render'/ident/f'angled-{n:02}.png';assert p.exists(),p;sheet.paste(Image.open(p).convert('RGB'),(i*768,34));d.text((i*768+8,10),f'{kind}, phase {n}/16',fill='white')
 sheet.save(out/'key_shots'/f'{ident}.png',optimize=True)
# Context frames for the two resistance variants.
for cid,w,n in [('military','type97hawk',8),('vest','qbu85',12)]:
 ident=f'{cid}-{w}';sheet=Image.new('RGB',(1536,802),'#1d2528');d=ImageDraw.Draw(sheet)
 for i,kind in enumerate(['before','current']):
  p=scratch/kind/'render'/ident/f'angled-{n:02}.png';assert p.exists(),p;sheet.paste(Image.open(p).convert('RGB'),(i*768,34));d.text((i*768+8,10),f'{kind}, phase {n}/16',fill='white')
 sheet.save(out/'key_shots'/f'{ident}.png',optimize=True)
for ident in ['linxu-type56_1-RifleWalk','linxu-type97hawk-ShotgunPump','linxu-qbu85-RifleAimingIdle','military-qcq171-FiringRifle','vest-type56_1-RifleWalk']:
 cid,w,motion=ident.split('-',2);sheet=Image.new('RGB',(512*3,2*536),'#1d2528');D=ImageDraw.Draw(sheet)
 for row,kind in enumerate(['before','current']):
  for col,i in enumerate([0,8,16]):
   p=scratch/'actions'/ident/kind/'render'/f'{cid}-{w}'/f'angled-{i:02}.png';assert p.exists(),p
   img=Image.open(p).convert('RGB').resize((512,512),Image.Resampling.LANCZOS);sheet.paste(img,(col*512,row*536+24));D.text((col*512+5,row*536+5),f'{kind} {i}/16',fill='white')
 sheet.save(out/'actions'/f'{ident}.jpg',quality=88,optimize=True)
for src,dst in [('finger-validation-postbuild.json','finger-validation.json'),('scope-validation-postbuild.json','scope-validation.json'),('hawk-switches-postbuild.json','hawk-switches.json'),('hawk-overlap-summary.json','hawk-overlap-summary.json')]:
 (out/'metrics'/dst).write_bytes((scratch/src).read_bytes())
repo=Path('.').resolve(); paths=['web/motion-labs/linxu-motion-lab/assets/weapon_attachment.json','web/motion-labs/resistance-motion-lab/assets/weapon_attachment.json','web/motion-labs/linxu-motion-lab/weapon-attachment.js','web/motion-labs/resistance-motion-lab/weapon-attachment.js']
hashes={p:hashlib.sha256((repo/p).read_bytes()).hexdigest() for p in paths};hashes['before_linxu_config']=hashlib.sha256((scratch/'before/linxu.json').read_bytes()).hexdigest();hashes['before_resistance_config']=hashlib.sha256((scratch/'before/resistance.json').read_bytes()).hexdigest()
# Keep an invariant specific to the five legacy mounts; unrelated new-weapon
# natural tracks may be rebaked later without changing these values.
for site in ['linxu','resistance']:
 d=json.loads((repo/f'web/motion-labs/{site}-motion-lab/assets/weapon_attachment.json').read_text());subset={cid:{w:c['mounts'][w] for w in weapons} for cid,c in d['characters'].items()};hashes[f'{site}_legacy_mounts_canonical_sha256']=hashlib.sha256(json.dumps(subset,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
(out/'metrics'/'source-sha256.json').write_text(json.dumps(hashes,indent=2)+'\n')
print('Packaged:',out)

#!/usr/bin/env python3
"""Package an explicitly frozen inventory for the repository baseline or V5 overlay."""
import argparse, hashlib, json, re, shutil, subprocess, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BASE='95bab506c0e01e04c7818f7e0f5001ad3a105c14'
V5=ROOT.parent/'diandian_weapon_update_v5/files'
V5_SHA='6218691f23a4867229747d25489a16cb1087449ab1432ed48ea069a7aec449c2'

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()

def baseline(rel):
 p=subprocess.run(['git','show',BASE+':'+rel],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 if p.returncode:return None
 m=re.fullmatch(rb'version https://git-lfs.github.com/spec/v1\noid sha256:([0-9a-f]{64})\nsize ([0-9]+)\n?',p.stdout)
 return {'sha256':m[1].decode(),'bytes':int(m[2]),'git_lfs':True} if m else {'sha256':hashlib.sha256(p.stdout).hexdigest(),'bytes':len(p.stdout),'git_lfs':False}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--inventory',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);a=ap.parse_args()
 inv=json.loads(a.inventory.read_text());assert inv['frozen'] is True,'Inventory is not frozen'
 dest=a.out.resolve();dest.mkdir(parents=True,exist_ok=True);rows=[]
 for rel,h in sorted(inv['files'].items()):
  p=Path(rel)
  if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe inventory path: '+rel)
  source=ROOT/p
  assert source.is_file() and sha(source)==h,'Source changed after freeze: '+rel
  b=baseline(rel)
  if b and b['sha256']==h:continue
  row={'path':rel,'baseline':b,'sha256':h,'bytes':source.stat().st_size}
  old=V5/p
  if old.is_file():
   old_sha=sha(old)
   if old_sha not in [h,b['sha256'] if b else None]:row['compatible_baselines']=[{'sha256':old_sha,'bytes':old.stat().st_size,'source':'verified V5 package'}]
  target=dest/'files'/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
  assert sha(target)==h,'Copy verification failed: '+rel
  rows.append(row)
 manifest={'version':2,'repository':'752960522qq-ai/diandian','baseline_commit':BASE,'compatible_previous_package_sha256':V5_SHA,'scope':'V6 original-motion-based corrective overlay. Recognized V5 fingerprints accepted, unknown edits rejected. No push or deployment.','file_count':len(rows),'total_bytes':sum(r['bytes'] for r in rows),'files':rows}
 (dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 shutil.copy2(ROOT/'tools/weapon_v6_delivery/apply_update.py',dest/'apply_update.py')
 shutil.copy2(ROOT/'Docs/weapon_update_v6/README.md',dest/'安装与验收说明.md')
 entries=['manifest.json','apply_update.py','安装与验收说明.md']+['files/'+r['path'] for r in rows]
 archive=dest.with_suffix('.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for name in sorted(entries):z.write(dest/name,name)
 with zipfile.ZipFile(archive) as z:
  assert set(z.namelist())==set(entries)
  for row in rows:assert hashlib.sha256(z.read('files/'+row['path'])).hexdigest()==row['sha256'],row['path']
 print(json.dumps({'package':str(archive),'sha256':sha(archive),'bytes':archive.stat().st_size,'files':len(rows)},ensure_ascii=False))

if __name__=='__main__':main()

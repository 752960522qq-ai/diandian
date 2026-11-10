"""Validate every final part and exercise the merger in isolated directories."""
import hashlib,json,os,shutil,subprocess,tempfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];DELIVERY=ROOT.parent/'delivery';manifest=json.loads((DELIVERY/'v7_split_manifest.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(script,*args,success=True):
 p=subprocess.run(['python3',str(script),*map(str,args)],capture_output=True,text=True)
 if (p.returncode==0)!=success:raise RuntimeError(p.stdout+'\n'+p.stderr)
 return {'exit_code':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
rows=[]
for p in manifest['parts']:
 f=DELIVERY/p['outer_file'];assert f.stat().st_size==p['outer_bytes']<30_000_000;assert sha(f)==p['outer_sha256']
 with zipfile.ZipFile(f) as z:
  assert z.testzip() is None;raw=z.read(p['payload']);assert len(raw)==p['payload_bytes'];assert hashlib.sha256(raw).hexdigest()==p['payload_sha256']
 rows.append({'name':f.name,'bytes':f.stat().st_size,'sha256':sha(f),'passed':True})
with tempfile.TemporaryDirectory(prefix='v7-merge-qa-',dir=ROOT.parent) as temp:
 d=Path(temp);script=d/'merge_v7.py';shutil.copyfile(ROOT/'tools/weapon_v7_delivery/merge_v7.py',script);shutil.copyfile(DELIVERY/'v7_split_manifest.json',d/'v7_split_manifest.json')
 for p in manifest['parts']:os.link(DELIVERY/p['outer_file'],d/p['outer_file'])
 logs=[run(script)];archive=d/manifest['archive'];assert sha(archive)==manifest['archive_sha256'];logs.append(run(script));archive.unlink()
 first=d/manifest['parts'][0]['outer_file'];hidden=first.with_suffix('.hidden');first.rename(hidden)
 logs.append(run(script,success=False));assert not archive.exists();hidden.rename(first)
 # Do not mutate a hard-linked source part: replace the fixture's link first.
 content=bytearray(first.read_bytes());content[-1]^=1;first.unlink();first.write_bytes(content)
 logs.append(run(script,success=False));assert not archive.exists();first.unlink();os.link(DELIVERY/manifest['parts'][0]['outer_file'],first)
 archive.write_bytes(b'User-existing output, must not overwrite');logs.append(run(script,success=False));assert archive.read_bytes()==b'User-existing output, must not overwrite'
report={'passed':True,'archive':{k:manifest[k] for k in ['archive','archive_bytes','archive_sha256']},'parts':rows,'checks':['every part <30000000 bytes','outer SHA-256 and ZIP CRC','inner payload size and SHA-256','actual reassembly matches full archive SHA-256 and ZIP CRC','idempotent correct output','missing part blocked','corrupt part blocked','different existing output preserved'],'logs':logs}
out=DELIVERY/'split-validation.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':True,'parts':len(rows),'max_part_bytes':max(r['bytes']for r in rows)}))

"""Place this script, v7_split_manifest.json and every V7 part ZIP together, then run Python 3."""
import hashlib,json,os,tempfile,zipfile,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def main():
 root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else HERE
 m=json.loads((HERE/'v7_split_manifest.json').read_text());output=root/m['archive']
 if Path(m['archive']).name!=m['archive']:raise RuntimeError('Unsafe archive name')
 if output.exists():
  if output.is_file() and sha(output)==m['archive_sha256']:print('Already merged and SHA-256 verified:',output);return
  raise RuntimeError('Output already exists with different content. Nothing overwritten: '+str(output))
 for p in m['parts']:
  if Path(p['outer_file']).name!=p['outer_file'] or Path(p['payload']).name!=p['payload']:raise RuntimeError('Unsafe part name')
  source=root/p['outer_file'];raw=root/p['payload']
  if source.is_file():
   if source.stat().st_size!=p['outer_bytes'] or sha(source)!=p['outer_sha256']:raise RuntimeError('Part failed integrity check: '+source.name)
  elif not raw.is_file() or raw.stat().st_size!=p['payload_bytes'] or sha(raw)!=p['payload_sha256']:raise RuntimeError('Missing or damaged part: '+source.name)
 fd,tmp=tempfile.mkstemp(prefix='v7-merge-',suffix='.tmp',dir=root);os.close(fd);tmp=Path(tmp)
 try:
  h=hashlib.sha256();total=0
  with tmp.open('wb') as dst:
   for p in m['parts']:
    source=root/p['outer_file'];zh=zipfile.ZipFile(source) if source.is_file() else None
    try:
     reader=zh.open(p['payload']) if zh else (root/p['payload']).open('rb');ph=hashlib.sha256();size=0
     with reader:
      for b in iter(lambda:reader.read(1024*1024),b''):dst.write(b);h.update(b);ph.update(b);size+=len(b);total+=len(b)
     if size!=p['payload_bytes'] or ph.hexdigest()!=p['payload_sha256']:raise RuntimeError('Payload verification failed: '+p['payload'])
    finally:
     if zh:zh.close()
  if total!=m['archive_bytes'] or h.hexdigest()!=m['archive_sha256']:raise RuntimeError('Combined archive verification failed')
  with zipfile.ZipFile(tmp) as z:
   if z.testzip():raise RuntimeError('Combined ZIP CRC failed')
  os.replace(tmp,output);print('Merged, SHA-256 and ZIP CRC verified:',output)
 finally:
  if tmp.exists():tmp.unlink()
if __name__=='__main__':
 try:main()
 except Exception as e:print('ERROR:',e,file=sys.stderr);sys.exit(1)

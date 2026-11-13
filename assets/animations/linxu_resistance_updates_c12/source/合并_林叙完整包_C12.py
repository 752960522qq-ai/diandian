# -*- coding: utf-8 -*-
# Put this script and all numbered volumes in the same folder.
from pathlib import Path
import hashlib,json,sys,tempfile,os
SPEC = {'archive_name': '林叙_完整修改包_C12.zip', 'archive_bytes': 58984760, 'archive_sha256': '657c8611dbb25f4cdb340fe57fd87b6b9052a0fe90cfdbac5bc84ab35e0e7338', 'parts': [{'name': '林叙_完整修改包_C12.zip.001', 'bytes': 29500000, 'sha256': 'f7af5c10651edbb964bf5c392043c8a3ab5fdb27a88caaeeb291e3518dee21ab'}, {'name': '林叙_完整修改包_C12.zip.002', 'bytes': 29484760, 'sha256': '1d5276dfe1a7f53d7a7b764b28e3867fbb60dc2fc3d5868d058fee13e5c11385'}]}
folder=Path(sys.argv[1]).resolve()if len(sys.argv)>1 else Path(__file__).resolve().parent
def digest(p):
 m=hashlib.sha256()
 with p.open('rb')as f:
  while b:=f.read(1024*1024):m.update(b)
 return m.hexdigest()
for item in SPEC['parts']:
 p=folder/item['name']
 if not p.is_file():raise SystemExit('缺少分卷：'+item['name'])
 if p.stat().st_size!=item['bytes']or digest(p)!=item['sha256']:raise SystemExit('分卷不完整或哈希不符：'+item['name'])
out=folder/SPEC['archive_name']
if out.exists():
 if digest(out)==SPEC['archive_sha256']:print('完整ZIP已经存在且校验一致，可直接解压：'+str(out));raise SystemExit(0)
 raise SystemExit('同名ZIP已存在但校验不符，请先移走旧文件，再运行；未覆盖旧文件。')
fd,tmp=tempfile.mkstemp(prefix='linxu_merging_',suffix='.tmp',dir=folder);os.close(fd);tmp=Path(tmp)
try:
 with tmp.open('wb')as dest:
  for item in SPEC['parts']:
   with (folder/item['name']).open('rb')as f:
    while b:=f.read(1024*1024):dest.write(b)
 if tmp.stat().st_size!=SPEC['archive_bytes']or digest(tmp)!=SPEC['archive_sha256']:raise RuntimeError('合并校验失败')
 if out.exists():raise RuntimeError('合并期间出现同名文件，未覆盖它')
 tmp.rename(out)
 print('合并及SHA256校验通过：'+str(out))
 print('现在解压ZIP，先读 Linxu_Full_C12/请先阅读_完整包说明.md。')
finally:
 if tmp.exists():tmp.unlink()

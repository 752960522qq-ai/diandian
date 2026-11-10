"""Build the complete V6+V7 overlay, manifest and independently verifiable <=30 MB split ZIPs."""
import hashlib,json,shutil,subprocess,zipfile,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT.parent
V6=WORK/'baseline'
OUT=WORK/'delivery'
STAGE=OUT/'package'
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
# Never package a stale bake after a last-minute runtime or policy correction.
for cid in ['linxu','military','vest']:
 out=ROOT/'assets/characters/weapon_update_v7'/cid
 site=ROOT/f"web/motion-labs/{'linxu' if cid=='linxu' else 'resistance'}-motion-lab"
 build=json.loads((out/'report.json').read_text());bake=json.loads((out/'equipped_all_report.json').read_text())
 if build['generator_sha256']!=sha(ROOT/'tools/weapon_v7_refined/build.mjs'):raise RuntimeError('Stale V7 generator: '+cid)
 for name,digest in build['policies'].items():
  if sha(ROOT/'tools/weapon_v7_refined'/name)!=digest:raise RuntimeError('Stale V7 policy bake: '+cid+'/'+name)
 for key,p in [('source_config_sha256',site/'assets/weapon_attachment.json'),('source_runtime_sha256',site/'weapon-attachment.js'),('source_v7_pack_sha256',out/'motions.glb')]:
  if bake[key]!=sha(p):raise RuntimeError('Stale equipped bake: '+cid+'/'+key)
 if sha(out/'motions.glb')!=sha(site/f'assets/characters/{cid}/weapon_update_v7.glb'):raise RuntimeError('Site and engine V7 packs differ: '+cid)
 readback=json.loads((ROOT/'web/motion-labs/verification_weapon_v7/equipped-readback.json').read_text())
 if not readback['passed'] or readback['characters'][cid]['pack_sha256']!=sha(out/'equipped_all_motions.glb'):raise RuntimeError('Missing/stale successful readback: '+cid)
 hand_audit=json.loads((ROOT/'web/motion-labs/verification_weapon_v7/refined/final-hand-runtime-audit.json').read_text())
 if not hand_audit['passed'] or hand_audit['characters'][cid]['load']['generatedSha256']!=sha(out/'motions.glb'):raise RuntimeError('Missing/stale successful final hand audit: '+cid)
v6=json.loads((V6/'manifest.json').read_text())
prior={r['path']:r for r in v6['files']}
preservation=[{'path':r['path'],'v6_sha256':r['sha256'],'v7_sha256':sha(ROOT/r['path']),'content_preserved':r['sha256']==sha(ROOT/r['path'])} for r in v6['files']]
preserved={'v6_path_count':len(preservation),'all_v6_paths_preserved':True,'unchanged_content_count':sum(r['content_preserved'] for r in preservation),'changed_existing_paths':[r['path']for r in preservation if not r['content_preserved']],'rows':preservation}
(ROOT/'web/motion-labs/verification_weapon_v7/v6-dependency-preservation.json').write_text(json.dumps(preserved,indent=2)+'\n')
paths=set(prior)
# Any modified existing tracked file is part of the overlay.
paths.update(subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=ROOT,text=True).splitlines())
for folder in ['assets/characters/weapon_update_v7','tools/weapon_v7_legacy','tools/weapon_v7_delivery','Docs/weapon_update_v7']:
 paths.update(str(p.relative_to(ROOT)) for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ['build.mjs','finger-policy.mjs','shotgun-policy.mjs','pose-utils.mjs','runtime.mjs','export-all-equipped.mjs','final-hand-audit.mjs','validate-runtime.mjs','audit-shotgun.mjs','render.py','final-hand-renders.mjs','final-shotgun-renders.mjs','final-trigger-renders.mjs','trigger-chain-runtime-audit.mjs','trigger-chain-geometry.mjs','trigger-chain-targets.json','finger-axes.json']:
 paths.add('tools/weapon_v7_refined/'+name)
for cid in ['linxu','military','vest']:
 paths.add(f"web/motion-labs/{'linxu' if cid=='linxu' else 'resistance'}-motion-lab/assets/characters/{cid}/weapon_update_v7.glb")
# Additional runtime files and compact QA evidence are listed by the coordinator.
paths.update(json.loads((ROOT/'Docs/weapon_update_v7/additional-files.json').read_text()))
if STAGE.exists():shutil.rmtree(STAGE)
rows=[]
for rel in sorted(paths):
 p=ROOT/rel
 if not p.is_file():raise RuntimeError('Missing planned payload: '+rel)
 if p.stat().st_size<200 and p.read_bytes().startswith(b'version https://git-lfs'):raise RuntimeError('LFS pointer in payload: '+rel)
 old=prior.get(rel)
 if old:baseline=old['baseline'];compatible=list(old.get('compatible_baselines',[]))
 else:
  source=WORK/'original'/rel
  if source.is_file():baseline={'sha256':sha(source),'size':source.stat().st_size}
  else:
   check=subprocess.run(['git','cat-file','-e','HEAD:'+rel],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   if check.returncode==0:
    b=subprocess.check_output(['git','show','HEAD:'+rel],cwd=ROOT)
    if b.startswith(b'version https://git-lfs'):raise RuntimeError('Need actual baseline LFS bytes: '+rel)
    baseline={'sha256':hashlib.sha256(b).hexdigest(),'size':len(b)}
   else:baseline=None
  compatible=[]
 if old and old['sha256'] not in [x['sha256'] for x in compatible]:compatible.append({'sha256':old['sha256'],'source':'verified V6 overlay','size':old.get('size_bytes')})
 target=STAGE/'files'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
 rows.append({'path':rel,'sha256':sha(p),'size_bytes':p.stat().st_size,'baseline':baseline,'compatible_baselines':compatible})
manifest={'format_version':1,'revision':'male-pose-v7','baseline_commit':'95bab506c0e01e04c7818f7e0f5001ad3a105c14','includes_complete_v6_overlay':True,'v6_package_sha256':sha(WORK/'input/diandian_weapon_natural_v6.zip'),'v6_file_count':len(prior),'files':rows}
STAGE.mkdir(parents=True,exist_ok=True);(STAGE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(ROOT/'tools/weapon_v7_delivery/apply_update.py',STAGE/'apply_update.py')
shutil.copyfile(ROOT/'Docs/weapon_update_v7/README.md',STAGE/'安装与验收说明.md')
archive=OUT/'diandian_male_pose_v7.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(STAGE.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(STAGE))
with zipfile.ZipFile(archive) as z:
 if z.testzip():raise RuntimeError('Archive CRC failed')
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive),'files':len(rows)},indent=2))
if '--split' in sys.argv:
 for stale in OUT.glob('diandian_male_pose_v7.part*.zip'):stale.unlink()
 chunksize=29_500_000;n=(archive.stat().st_size+chunksize-1)//chunksize;parts=[]
 with archive.open('rb') as f:
  for i in range(1,n+1):
   data=f.read(chunksize);raw=f'{archive.name}.part{i:03d}';outer=OUT/f'diandian_male_pose_v7.part{i:03d}.zip';entry={'index':i,'total':n,'outer_file':outer.name,'payload':raw,'payload_bytes':len(data),'payload_sha256':hashlib.sha256(data).hexdigest()}
   with zipfile.ZipFile(outer,'w',zipfile.ZIP_STORED) as z:z.writestr(raw,data);z.writestr('part_info.json',json.dumps(entry,indent=2))
   if outer.stat().st_size>=30_000_000:raise RuntimeError('Part exceeds user limit')
   entry.update(outer_bytes=outer.stat().st_size,outer_sha256=sha(outer));parts.append(entry)
 split={'archive':archive.name,'archive_bytes':archive.stat().st_size,'archive_sha256':sha(archive),'parts':parts}
 (OUT/'v7_split_manifest.json').write_text(json.dumps(split,indent=2)+'\n')
 print(json.dumps(split,indent=2))

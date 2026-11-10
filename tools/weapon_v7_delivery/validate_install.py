"""Exercise dry-run, install, idempotence, rollback and conflict protection on isolated fixtures."""
import hashlib,json,os,shutil,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];WORK=ROOT.parent;PACKAGE=WORK/'delivery/package';rows=json.loads((PACKAGE/'manifest.json').read_text())['files']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def run(script,root,*args,success=True):
 p=subprocess.run(['python3',str(script),str(root),*map(str,args)],capture_output=True,text=True)
 if (p.returncode==0)!=success:raise RuntimeError(p.stdout+'\n'+p.stderr)
 return {'exit_code':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
def snapshot(root):return {r['path']:sha(root/r['path']) for r in rows}
def fixture(root):
 shutil.copytree(WORK/'original',root,copy_function=os.link)
 for name in ['project.godot','.gitattributes']:(root/name).write_bytes(subprocess.check_output(['git','show','HEAD:'+name],cwd=ROOT))
report={'passed':True,'fixtures':{},'scope':'Local isolated main and applied-V6 fixtures; full manifest hash checks, backup restoration, no-overwrite protections. Not a live user checkout.'}
with tempfile.TemporaryDirectory(prefix='v7-install-qa-',dir=WORK) as temp:
 for baseline in ['main','v6']:
  root=Path(temp)/baseline;fixture(root);logs=[]
  if baseline=='v6':logs.append(run(WORK/'baseline/apply_update.py',root,'--apply'))
  before=snapshot(root);logs.append(run(PACKAGE/'apply_update.py',root));assert snapshot(root)==before,'Dry run wrote files'
  logs.append(run(PACKAGE/'apply_update.py',root,'--apply'))
  assert all(sha(root/r['path'])==r['sha256'] for r in rows),'Installed hash mismatch'
  backups=sorted((root/'work/weapon-v7-backups').iterdir());assert len(backups)==1
  logs.append(run(PACKAGE/'apply_update.py',root,'--apply'));assert len(list((root/'work/weapon-v7-backups').iterdir()))==1,'Idempotence created backup'
  # A post-install user edit must block rollback before any path is restored.
  chosen=next(r['path'] for r in rows if r['path'].endswith('/linxu-motion-lab/app.js'))
  p=root/chosen;saved=p.read_bytes();p.write_bytes(saved+b'\n// QA user edit\n');conflicted=snapshot(root)
  logs.append(run(PACKAGE/'apply_update.py',root,'--rollback',backups[0],success=False));assert snapshot(root)==conflicted,'Failed rollback modified files';p.write_bytes(saved)
  logs.append(run(PACKAGE/'apply_update.py',root,'--rollback',backups[0]));assert snapshot(root)==before,'Rollback did not restore baseline'
  # An unknown pre-install modification must stop the whole apply operation.
  saved=p.read_bytes();p.write_bytes(saved+b'\n// QA unknown baseline\n');conflicted=snapshot(root)
  logs.append(run(PACKAGE/'apply_update.py',root,'--apply',success=False));assert snapshot(root)==conflicted,'Conflicted install wrote files';p.write_bytes(saved)
  report['fixtures'][baseline]={'passed':True,'manifest_files':len(rows),'checks':['dry-run read-only','installed file hashes','idempotent re-apply','post-edit rollback blocked before writes','exact rollback restoration','unknown baseline blocks entire apply'],'logs':logs}
out=ROOT/'web/motion-labs/verification_weapon_v7/install-validation.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':True,'fixtures':list(report['fixtures']),'manifest_files':len(rows)}))

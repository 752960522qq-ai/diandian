#!/usr/bin/env python3
import hashlib, json, shutil, subprocess, sys, tempfile
from pathlib import Path

def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    with tempfile.TemporaryDirectory(prefix='weapon-v6-installer-') as tmp:
        root=Path(tmp);pkg=root/'package';repo=root/'repository';pkg.mkdir();repo.mkdir()
        shutil.copy2(Path(__file__).with_name('apply_update.py'),pkg/'apply_update.py')
        (repo/'project.godot').write_text('config_version=5\n')
        (repo/'existing.txt').write_bytes(b'old');(pkg/'files').mkdir()
        (pkg/'files/existing.txt').write_bytes(b'new');(pkg/'files/added.txt').write_bytes(b'added')
        manifest={'baseline_commit':'test','files':[{'path':'existing.txt','baseline':{'sha256':sha(b'old')},'sha256':sha(b'new')},{'path':'added.txt','baseline':None,'sha256':sha(b'added')}]}
        (pkg/'manifest.json').write_text(json.dumps(manifest))
        def run(*args,ok=True):
            r=subprocess.run([sys.executable,str(pkg/'apply_update.py'),str(repo),*map(str,args)],capture_output=True,text=True)
            assert (r.returncode==0)==ok,(r.returncode,r.stdout,r.stderr)
            return r
        run();assert (repo/'existing.txt').read_bytes()==b'old';assert not (repo/'added.txt').exists()
        (repo/'existing.txt').write_bytes(b'conflict');run('--apply',ok=False)
        assert (repo/'existing.txt').read_bytes()==b'conflict' and not (repo/'added.txt').exists()
        (repo/'existing.txt').write_bytes(b'old');run('--apply');assert (repo/'existing.txt').read_bytes()==b'new'
        assert (repo/'added.txt').read_bytes()==b'added';run('--apply')
        backup=next((repo/'work/weapon-v6-backups').iterdir())
        (repo/'existing.txt').write_bytes(b'new-user-edit');run('--rollback',backup,ok=False)
        assert (repo/'added.txt').exists();(repo/'existing.txt').write_bytes(b'new');run('--rollback',backup)
        assert (repo/'existing.txt').read_bytes()==b'old' and not (repo/'added.txt').exists()
        # Both a main-repository file and a newly added V5 file may have an
        # explicitly recognized prior-package fingerprint. Unknown edits must
        # still fail, and rollback must restore the actual recognized version.
        manifest['files'][0]['compatible_baselines']=[{'sha256':sha(b'prior-v5')}]
        manifest['files'][1]['compatible_baselines']=[{'sha256':sha(b'prior-added')}]
        (pkg/'manifest.json').write_text(json.dumps(manifest))
        (repo/'existing.txt').write_bytes(b'prior-v5');(repo/'added.txt').write_bytes(b'prior-added')
        run('--apply');backup=sorted((repo/'work/weapon-v6-backups').iterdir())[-1]
        run('--rollback',backup)
        assert (repo/'existing.txt').read_bytes()==b'prior-v5' and (repo/'added.txt').read_bytes()==b'prior-added'
        (repo/'existing.txt').write_bytes(b'unknown-edited-v5');run('--apply',ok=False)
        assert (repo/'added.txt').read_bytes()==b'prior-added'
        (repo/'existing.txt').write_bytes(b'old');(repo/'added.txt').unlink()
        (pkg/'files/added.txt').write_bytes(b'tampered');run('--apply',ok=False)
        assert (repo/'existing.txt').read_bytes()==b'old'
        manifest['files'][0]['path']='../outside.txt';(pkg/'manifest.json').write_text(json.dumps(manifest));run(ok=False)
    print(json.dumps({'passed':True,'cases':['dry-run does not write','conflict is atomic/no overwrite','apply verifies outputs','repeat apply is idempotent','rollback refuses user edits','rollback restores originals/removes new files','recognized prior-package fingerprints accepted and restored','unknown edits to prior-package files rejected atomically','tampered package rejected before writes','path traversal rejected']},indent=2))

if __name__=='__main__':main()

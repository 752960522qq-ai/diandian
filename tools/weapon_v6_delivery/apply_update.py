#!/usr/bin/env python3
"""Verify/apply/rollback this self-contained weapon update. No network access."""
import argparse, hashlib, json, os, shutil, sys, tempfile
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent

def sha(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()

def target(root,rel):
    p=Path(rel)
    if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe path: '+rel)
    out=root/p
    if not out.resolve().is_relative_to(root.resolve()):raise ValueError('Path escapes repository: '+rel)
    return out

def atomic_copy(src,dst):
    dst.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix='.weapon-update-',dir=dst.parent);os.close(fd)
    try:shutil.copyfile(src,tmp);os.replace(tmp,dst)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def rollback(root,backup):
    journal=json.loads((backup/'journal.json').read_text())
    conflicts=[]
    for row in journal['files']:
        p=target(root,row['path'])
        # Do not destroy a user's post-install edits during rollback.
        if not p.is_file() or sha(p)!=row['installed_sha256']:conflicts.append(row['path'])
    if conflicts:raise RuntimeError('Rollback stopped. Files changed after installation:\n'+'\n'.join(conflicts))
    for row in reversed(journal['files']):
        p=target(root,row['path'])
        if row['existed']:atomic_copy(target(backup/'original',row['path']),p)
        else:p.unlink()
    print('Rollback completed:',len(journal['files']),'files. Backup retained at',backup)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('repository',type=Path,help='Existing diandian checkout path')
    mode=ap.add_mutually_exclusive_group();mode.add_argument('--apply',action='store_true');mode.add_argument('--rollback',type=Path)
    args=ap.parse_args();root=args.repository.resolve()
    if not root.is_dir():raise RuntimeError('Repository directory does not exist')
    if args.rollback:return rollback(root,args.rollback.resolve())
    manifest=json.loads((HERE/'manifest.json').read_text())
    if not (root/'project.godot').is_file():raise RuntimeError('Target is not a diandian checkout (project.godot missing)')
    rows=[];conflicts=[];already=0
    for row in manifest['files']:
        rel=row['path'];src=target(HERE/'files',rel);dst=target(root,rel)
        if not src.is_file() or sha(src)!=row['sha256']:raise RuntimeError('Package integrity check failed: '+rel)
        actual=sha(dst) if dst.is_file() else None
        if actual==row['sha256']:already+=1;continue
        expected=row['baseline']['sha256'] if row['baseline'] else None
        accepted=[expected]+[b['sha256'] for b in row.get('compatible_baselines',[])]
        if actual not in accepted:
            conflicts.append({'path':rel,'expected_known_sha256':accepted,'actual':actual,'reason':'Missing/different baseline. Run git lfs pull first if this is an LFS pointer.' if row['baseline'] else 'A file already exists at a new output path and is not a recognized previous package version.'})
        else:rows.append(row)
    print('Baseline:',manifest['baseline_commit'])
    print('Ready:',len(rows),'Already installed:',already,'Conflicts:',len(conflicts))
    if conflicts:
        print(json.dumps(conflicts,ensure_ascii=False,indent=2));raise RuntimeError('No files were changed. Resolve conflicts before applying.')
    if not args.apply:print('Dry run passed. Re-run with --apply to install.');return
    if not rows:print('Already installed; no files changed.');return
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup=root/'work'/'weapon-v6-backups'/stamp;backup.mkdir(parents=True)
    journal={'baseline':manifest['baseline_commit'],'files':[]}
    for row in rows:
        dst=target(root,row['path']);existed=dst.exists()
        if existed:atomic_copy(dst,target(backup/'original',row['path']))
        journal['files'].append({'path':row['path'],'existed':existed,'installed_sha256':row['sha256']})
    (backup/'journal.json').write_text(json.dumps(journal,ensure_ascii=False,indent=2)+'\n')
    completed=[]
    try:
        for row in rows:
            dst=target(root,row['path']);atomic_copy(target(HERE/'files',row['path']),dst);completed.append(row)
            if sha(dst)!=row['sha256']:raise RuntimeError('Write verification failed: '+row['path'])
    except Exception:
        for row in reversed(completed):
            dst=target(root,row['path']);old=target(backup/'original',row['path'])
            if old.is_file():atomic_copy(old,dst)
            elif dst.exists():dst.unlink()
        raise
    print('Installed:',len(rows),'files. Backup:',backup)
    print('Rollback: python apply_update.py',str(root),'--rollback',str(backup))

if __name__=='__main__':
    try:main()
    except Exception as e:print('ERROR:',e,file=sys.stderr);sys.exit(1)

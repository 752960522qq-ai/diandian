"""Alternative low-ready pistol run: original RifleRun and source pistol mounting.
Candidate C must already exist. No body/arm track recomposition or retiming.
"""
from pathlib import Path
import json,shutil,copy
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'work/weapon_v6_two'
for folder in ['diandian-classic-motion-lab','zhigeng-motion-lab']:
 src=out/'candidate_c'/folder;dst=out/'candidate_d'/folder
 if dst.exists():shutil.rmtree(dst)
 shutil.copytree(src,dst,symlinks=True)
 p=dst/'assets/weapon_attachment.json';cfg=json.loads(p.read_text());original=json.loads((out/'baseline'/folder/'assets/weapon_attachment.json').read_text())
 for wid in ['qsz92','type54','type64']:
  cfg['weapons'][wid]['animation_overrides'].pop('RifleRun',None)
  cfg['weapons'][wid]['motion_source_notes']['RifleRun']='Unmodified original RifleRun clip and timing, original QSZ92 RifleRun hand-to-gun calibration for each pistol. No time compression or reconstructed body tracks.'
  for cid,char in cfg['characters'].items():
   m=char['mounts'][wid];m['motions']['RifleRun']=copy.deepcopy(original['characters'][cid]['mounts']['qsz92']['motions']['RifleRun']);m['motions'].pop('SourcePistolRun',None)
 p.write_text(json.dumps(cfg,indent=2,ensure_ascii=False)+'\n')
 p=dst/'app.js';s=p.read_text().replace("import { installSourcePistolRun } from './source-pistol-motion.js';\n",'').replace('  installSourcePistolRun(model);\n','');p.write_text(s)
print('candidate_d: original low-ready RifleRun; no new/composed animation clip')

"""Apply a reviewed candidate to the two sites. Does not change any GLB.
Run only after the parent review approves the named candidate.
"""
from pathlib import Path
import shutil,argparse
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--candidate',required=True,choices=['candidate_c','candidate_d']);a=p.parse_args()
files=['app.js','weapon-attachment.js','index.html','source-pistol-motion.js','assets/weapon_attachment.json','assets/weapon_catalog.json']
if a.candidate=='candidate_d':files.remove('source-pistol-motion.js')
for folder in ['diandian-classic-motion-lab','zhigeng-motion-lab']:
 src=ROOT/'work/weapon_v6_two'/a.candidate/folder;dst=ROOT/'web/motion-labs'/folder
 for name in files:
  target=dst/name
  shutil.copyfile(src/name,target)
 print('Applied',a.candidate,'to',folder)

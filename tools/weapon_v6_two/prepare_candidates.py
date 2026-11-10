"""Create isolated, baseline-first review sites. Does not touch production sites."""
from pathlib import Path
import json,copy,os
ROOT=Path(__file__).resolve().parents[2]
BASE=Path(os.environ.get('WEAPON_V6_BASELINE_DIR',str(ROOT.parent/'character_adapt_baseline'))).resolve()
OUT=ROOT/'work/weapon_v6_two'
META=json.loads((ROOT/'assets/weapons/refined_v2_attachment.json').read_text())['weapons']
for kind in ['baseline','candidate_a']:
 for folder in ['diandian-classic-motion-lab','zhigeng-motion-lab']:
  src=BASE/'web/motion-labs'/folder; dst=OUT/kind/folder;dst.mkdir(parents=True,exist_ok=True)
  for f in src.iterdir():
   if f.name=='assets':continue
   p=dst/f.name
   if p.exists() or p.is_symlink():p.unlink() if not p.is_dir() or p.is_symlink() else None
   p.symlink_to(f)
  assets=dst/'assets';assets.mkdir(exist_ok=True)
  for f in (src/'assets').iterdir():
   if f.name in ['weapon_attachment.json','weapons','weapon_catalog.json']:continue
   p=assets/f.name
   if not p.exists():p.symlink_to(f)
  weapons=assets/'weapons';weapons.mkdir(exist_ok=True)
  cfg=json.loads((src/'assets/weapon_attachment.json').read_text());cat=json.loads((src/'assets/weapon_catalog.json').read_text())
  if kind=='candidate_a':
   cfg['legacy_weapon_aliases']={'winchester1897':'m870'}
   old=copy.deepcopy(cfg)
   for wid,ref in [('qsz92','qsz92'),('type54','type54'),('type64','type54'),('m870','winchester1897')]:
    w=copy.deepcopy(old['weapons'][ref]);w['display_name']={'qsz92':'QSZ92','type54':'54式','type64':'64式','m870':'M870'}[wid]
    w['path']=f'res://assets/weapons/{wid}.glb'
    # All rig anchors and poses remain the source configuration. Keep geometry
    # measurements separate so metadata cannot silently drive wholesale re-posing.
    w['refined_geometry']=copy.deepcopy(META[wid])
    w['visual_registration_translation_m']=[round(a-b,9) for a,b in zip(w['right_grip'],META[wid]['right_grip'])]
    w['adaptation_policy']='Source body, wrist, finger, clip and timing retained; rigid visual registration only.'
    if wid=='m870':w['pump_node_names']=META[wid]['pump_node_names']
    cfg['weapons'][wid]=w
    for cid,c in cfg['characters'].items():c['mounts'][wid]=copy.deepcopy(old['characters'][cid]['mounts'][ref])
   del cfg['weapons']['winchester1897']
   for c in cfg['characters'].values():del c['mounts']['winchester1897']
   for name in ['weapon-attachment.js','app.js','index.html']:
    p=dst/name;p.unlink();s=(src/name).read_text()
    s=s.replace('winchester1897','m870')
    if name=='weapon-attachment.js':
     s=s.replace("root.add(weaponScenes.get(id).clone(true));", "const visual = new THREE.Group();\n      visual.name = 'RefinedVisualRegistration_' + id;\n      visual.position.fromArray(config.weapons[id].visual_registration_translation_m || [0,0,0]);\n      visual.add(weaponScenes.get(id).clone(true));\n      root.add(visual);")
     s=s.replace("if (object.name.replaceAll('_', ' ') === 'm 97 add1')", "if (config.weapons.m870?.pump_node_names?.includes(object.name))")
     s=s.replace("  setWeapon(id) {", "  setWeapon(id) {\n    if (id === 'winchester1897') id = 'm870';")
     s=s.replace("(id === 'type97hawk' ? this.type97PumpParts : this.pumpParts)", "(id === 'type97hawk' ? this.type97PumpParts : id === 'm870' ? this.pumpParts : [])")
    elif name=='index.html':
     s=s.replace('disabled>M1897','disabled>M870').replace('<button data-weapon="type54" disabled>54式</button>','<button data-weapon="type54" disabled>54式</button><button data-weapon="type64" disabled>64式</button>')
    p.write_text(s)
  for id in cfg['weapons']:
   path=(ROOT/'assets/weapons'/f'{id}.glb') if kind=='candidate_a' and id in ['qsz92','type54','type64','m870'] else (src/'assets/weapons'/f'{id}.glb')
   p=weapons/f'{id}.glb'
   if p.exists() or p.is_symlink():p.unlink()
   p.symlink_to(path)
  (assets/'weapon_attachment.json').write_text(json.dumps(cfg,indent=2,ensure_ascii=False)+'\n')
  (assets/'weapon_catalog.json').write_text(json.dumps(cat,indent=2,ensure_ascii=False)+'\n')
print(OUT)

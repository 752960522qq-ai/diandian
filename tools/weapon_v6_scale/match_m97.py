#!/usr/bin/env python3
"""Uniform scene-wrapper scale only; preserve original source, BIN and pump hierarchy."""
import copy,hashlib,json,struct
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'web/motion-labs/verification_weapon_v6_scale'
TARGET=0.9992400407791138
SITES=('diandian-classic','zhigeng','linxu','resistance')
def decode(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0]
 return json.loads(b[20:20+n]),b[20+n:]
def encode(j,tail):
 payload=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();payload+=b' '*((-len(payload))%4)
 return struct.pack('<III',0x46546c67,2,20+len(payload)+len(tail))+struct.pack('<II',len(payload),0x4e4f534a)+payload+tail
def digest(b):return hashlib.sha256(b).hexdigest()
def main():
 cfgpath=ROOT/'assets/weapons/refined_v2_attachment.json';cfg=json.loads(cfgpath.read_text());before=copy.deepcopy(cfg)
 entry=cfg['weapons']['m870'];
 if 'width_adjustment' in entry:raise SystemExit('Historical exact-M97 stage superseded. Final user target is 1 m; use thin_m870_body.py.')
 src=ROOT/'assets/weapons/source/refined_v2'/entry['source']['file'];source_bytes=src.read_bytes()
 assert digest(source_bytes)==entry['source']['sha256']
 game=ROOT/'assets/weapons/m870.glb';j,tail=decode(game);source_j,source_tail=decode(src)
 assert tail==source_tail,'BIN chunk must remain unchanged from refined source'
 if abs(entry['length_m']-TARGET)<1e-12:
  print('Already at M97 length; no writes.');return
 ratio=TARGET/entry['length_m'];assert .999<ratio<1,'Unexpected original size; re-audit before scaling'
 pivot=np.array(entry['right_grip']);roots=j['scenes'][j.get('scene',0)]['nodes'];assert len(roots)==1
 root=j['nodes'][roots[0]];assert root['name']=='m870_GameNormalized'
 before_nodes=copy.deepcopy(j['nodes']);before_sha=digest(game.read_bytes())
 root['scale']=[s*ratio for s in root['scale']]
 root['translation']=(pivot+ratio*(np.array(root['translation'])-pivot)).tolist()
 data=encode(j,tail);game.write_bytes(data)
 for key in ['right_grip','right_palm_surface','trigger','muzzle','left_grip','butt_contact']:
  entry[key]=(pivot+ratio*(np.array(entry[key])-pivot)).tolist()
 entry['length_m']=TARGET
 entry['game_dimensions_m']=[n*ratio for n in entry['game_dimensions_m']]
 entry['normalization']['scale']*=ratio
 entry['normalization']['translation']=root['translation']
 entry['pump_travel_m']*=ratio
 entry['pump_travel_local_units']=entry['pump_travel_m']/entry['normalization']['scale']
 entry['game_sha256']=digest(data)
 entry['length_match']={'reference':'81d5a485 diandian-classic/zhigeng winchester1897.glb, full hierarchy axial extent','reference_axial_world_length_m':TARGET,'uniform_ratio_from_v5':ratio,'scale_pivot_game_m':pivot.tolist(),'runtime_mount_model_scale':1,'character_wrapper_scale_applies_to_weapon':False,'source_geometry_and_binary_unchanged':True}
 assert all(cfg['weapons'][k]==before['weapons'][k] for k in cfg['weapons'] if k!='m870')
 assert all(n==before_nodes[i] for i,n in enumerate(j['nodes']) if i!=roots[0])
 cfgpath.write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n')
 for site in SITES:(ROOT/f'web/motion-labs/{site}-motion-lab/assets/weapons/m870.glb').write_bytes(data)
 assert src.read_bytes()==source_bytes
 pump=[n for n in j['nodes'] if n.get('name')=='Pump_visual'];static=[n for n in j['nodes'] if n.get('name')=='Static_visual'];assert len(pump)==1 and len(static)==1
 report={'target_length_m':TARGET,'uniform_scale_ratio':ratio,'scale_pivot':pivot.tolist(),'before_game_sha256':before_sha,'after_game_sha256':digest(data),'source_sha256':digest(source_bytes),'source_preserved':True,'bin_chunk_unchanged':tail==decode(game)[1]==source_tail,'all_nodes_except_normalization_root_unchanged':True,'pump_and_static_nodes_preserved':True,'source_animation_preserved': [a.get('name') for a in source_j.get('animations',[])],'game_autoplay_animation_count':len(j.get('animations',[])),'game_sites_same_sha256':{s:digest((ROOT/f'web/motion-labs/{s}-motion-lab/assets/weapons/m870.glb').read_bytes()) for s in SITES},'final_m870_metadata':entry,'site_attachment_update_delegated':True}
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'scale_application.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()

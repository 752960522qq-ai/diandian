"""Check V7's narrow new-weapon binary changes against the verified V6 pack."""
import json,struct,hashlib,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def glb(p):
 b=p.read_bytes();length=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+length]),b[28+length:]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
result={'passed':True,'characters':{},'scope':'Only Arm/ForeArm/Hand quaternion output bytes may differ. All body/head/neck/shoulder/leg tracks, frame-time inputs, node rest transforms and animation identities are checked independently.'}
for cid in ['linxu','military','vest']:
 before=ROOT/f'assets/characters/weapon_update_v6/{cid}/motions.glb';after=ROOT/f'assets/characters/weapon_update_v7/{cid}/motions.glb'
 a,ab=glb(before);b,bb=glb(after);allowed=bytearray(len(ab));failures=[];changed=[]
 if len(ab)!=len(bb):failures.append('Binary length changed')
 for key in ['nodes','scenes','accessors','bufferViews','buffers']:
  if a.get(key)!=b.get(key):failures.append(key+' changed')
 if len(a['animations'])!=len(b['animations']):failures.append('Clip count changed')
 for old,new in zip(a['animations'],b['animations']):
  for k in ['name','channels','samplers']:
   if old[k]!=new[k]:failures.append(old['name']+': '+k+' changed')
  for channel in old['channels']:
   s=old['samplers'][channel['sampler']];ac=a['accessors'][s['output']];v=a['bufferViews'][ac['bufferView']];offset=v.get('byteOffset',0)+ac.get('byteOffset',0);count=ac['count']*{'VEC3':3,'VEC4':4,'SCALAR':1}[ac['type']]*4
   name=a['nodes'][channel['target']['node']]['name'];permitted=channel['target']['path']=='rotation' and re.search('Arm|ForeArm|Hand',name)
   if permitted:allowed[offset:offset+count]=b'\1'*count
   if ab[offset:offset+count]!=bb[offset:offset+count]:
    changed.append({'clip':old['name'],'bone':name,'property':channel['target']['path']})
    if not permitted:failures.append(old['name']+': forbidden track '+name)
 outside=sum(x!=y and not allow for x,y,allow in zip(ab,bb,allowed))
 if outside:failures.append(f'{outside} changed bytes outside approved outputs')
 row={'base_sha256':sha(before),'v7_sha256':sha(after),'clips':len(b['animations']),'changed_tracks':changed,'forbidden_changed_bytes':outside,'failures':failures,'passed':not failures}
 result['characters'][cid]=row;result['passed']&=row['passed']
out=ROOT/'web/motion-labs/verification_weapon_v7/pack-scope.json';out.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'characters':{k:{'clips':v['clips'],'changed_tracks':len(v['changed_tracks']),'failures':v['failures']}for k,v in result['characters'].items()}}));raise SystemExit(0 if result['passed'] else 1)

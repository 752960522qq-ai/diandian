"""blender -b --python tools/blender/save_emplacements_r44.py"""
import copy
import json
from pathlib import Path
import struct
import math
import bpy

ROOT=Path(__file__).resolve().parents[2]
PACK=ROOT/'assets/animations/emplacements_r44'
WORK=ROOT/'work/emplacements-r44'

def read_glb(path):
 data=path.read_bytes();size=struct.unpack_from('<I',data,12)[0]
 return json.loads(data[20:20+size]),data[28+size:]

def merge_character(character,folder):
 model,body=read_glb(ROOT/f'web/motion-labs/{folder}/assets/{character}_fixed.glb')
 library,binary=read_glb(PACK/character/'uploaded_motions.glb')
 body+=b'\0'*(-len(body)%4)
 vo=len(model['bufferViews']);ao=len(model['accessors'])
 for view in library['bufferViews']:
  view=copy.deepcopy(view);view['byteOffset']=view.get('byteOffset',0)+len(body);model['bufferViews'].append(view)
 for accessor in library['accessors']:
  accessor=copy.deepcopy(accessor);accessor['bufferView']+=vo;model['accessors'].append(accessor)
 nodes={n['name']:i for i,n in enumerate(model['nodes']) if 'name'in n}
 model['animations']=copy.deepcopy(library['animations'])
 for action in model['animations']:
  for sampler in action['samplers']:sampler['input']+=ao;sampler['output']+=ao
  for channel in action['channels']:channel['target']['node']=nodes[library['nodes'][channel['target']['node']]['name']]
 binary=body+binary;model['buffers']=[{'byteLength':len(binary)}]
 document=json.dumps(model,separators=(',',':')).encode();document+=b' '*(-len(document)%4);binary+=b'\0'*(-len(binary)%4)
 data=struct.pack('<III',0x46546C67,2,28+len(document)+len(binary))+struct.pack('<I4s',len(document),b'JSON')+document+struct.pack('<I4s',len(binary),b'BIN\0')+binary
 path=WORK/f'{character}-qjz89-editable.glb';path.write_bytes(data);return path

def configure_actions(armature):
 for action in bpy.data.actions:
  action.name=action.name.removesuffix('_'+armature.name);action.use_fake_user=True
  assert all(math.isfinite(v) for curve in action.fcurves for key in curve.keyframe_points for v in key.co)
 for track in armature.animation_data.nla_tracks:track.mute=True

def empty(name):
 obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);return obj

WORK.mkdir(parents=True,exist_ok=True)
for character,folder in [('diandian','diandian-classic-motion-lab'),('zhigeng','zhigeng-motion-lab')]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 scene=bpy.context.scene;scene.render.fps=60;scene.unit_settings.system='METRIC'
 bpy.ops.import_scene.gltf(filepath=str(merge_character(character,folder)))
 arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');configure_actions(arm)
 authoring=json.loads((PACK/character/'authoring.json').read_text())
 roots=[o for o in bpy.data.objects if o.parent is None];wrapper=empty('Character_Metres')
 for obj in roots:obj.parent=wrapper
 p=authoring['wrapper']['position'];wrapper.location=(p[0],-p[2],p[1]);wrapper.scale=authoring['wrapper']['scale']
 existing=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/weapons/qjz89.glb'))
 roots=[o for o in bpy.data.objects if o not in existing and o.parent is None];mount=empty('QJZ89_Fixed_Standing_Mount')
 for obj in roots:obj.parent=mount
 # Follow the right shoulder position while keeping the gun orientation fixed.
 p=authoring['mount']['shoulder_offset_weapon_m'];b=authoring['weapon']['butt_contact']
 offset=(-(p[0]-b[0]),p[1]-b[1],-(p[2]-b[2]))
 mount.location=(offset[0],-offset[2],offset[1]);mount.rotation_euler.z=math.pi
 constraint=mount.constraints.new('COPY_LOCATION');constraint.name='Stock_to_right_shoulder'
 constraint.target=arm;constraint.subtarget='mixamorig:RightArm';constraint.use_offset=True
 constraint.target_space='WORLD';constraint.owner_space='WORLD'
 mount['gun_body_length_mm']=1640;mount['placement']='Floating; no ground or tripod height solve requested.'
 for key in ['right_grip','left_grip','butt_contact','muzzle']:
  marker=empty(key);marker.parent=mount;v=authoring['weapon'][key];marker.location=(v[0],-v[2],v[1]);marker.empty_display_type='SPHERE';marker.empty_display_size=.012
 arm.animation_data.action=bpy.data.actions['QJZ89Idle'];scene.frame_start=0;scene.frame_end=round(arm.animation_data.action.frame_range[1]);scene.frame_set(0)
 arm['source_poses']='RocketIdle / RocketAimLevel, both hands fitted to shoulder-braced QJZ89.'
 bpy.ops.file.pack_all();bpy.context.view_layer.objects.active=arm
 bpy.ops.wm.save_as_mainfile(filepath=str(PACK/character/'motions.blend'),compress=True)
 print('BLENDER_R44_CHARACTER',character,[a.name for a in bpy.data.actions],flush=True)

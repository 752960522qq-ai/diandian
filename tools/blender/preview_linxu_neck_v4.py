"""Real GLB before/after neck, identical cameras and V3 clip phases."""
import bpy,math,sys,json,struct,copy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'work/linxu-neck-v4'
variant=sys.argv[-1] if sys.argv[-1] in ['before','after'] else 'after'
# Merge by node index: V4 preserves every original node and curated channels.
def read_glb(path):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+n]),raw[28+n:]
g,blob=read_glb(ROOT/('assets/characters/linxu_motion/character.glb' if variant=='before' else 'assets/characters/linxu_motion_v3/character.glb'))
mg,mb=read_glb(ROOT/'assets/characters/linxu_motion_v3/motions.glb');ao=len(g['accessors']);vo=len(g['bufferViews'])
for v in mg['bufferViews']:v['byteOffset']=v.get('byteOffset',0)+len(blob)
for a in mg['accessors']:a['bufferView']+=vo
g['bufferViews']+=mg['bufferViews'];g['accessors']+=mg['accessors'];g['animations']=[a for a in mg['animations'] if a['name'] in ['Idle','Walk','Run','HeadStress']]
for a in g['animations']:
 for sampler in a['samplers']:sampler['input']+=ao;sampler['output']+=ao
blob+=mb;g['buffers']=[{'byteLength':len(blob)}];j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\0'*((-len(blob))%4)
OUT.mkdir(parents=True,exist_ok=True)
(OUT/f'{variant}-animated.glb').write_bytes(struct.pack('<III',0x46546C67,2,28+len(j)+len(blob))+struct.pack('<II',len(j),0x4E4F534A)+j+struct.pack('<II',len(blob),0x004E4942)+blob)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/f'{variant}-animated.glb'))
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');arm.animation_data_clear();arm.animation_data_create();actions=list(bpy.data.actions)
scene=bpy.context.scene;scene.render.fps=30
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=.34;scene.camera=camera
for p,power,size in [((-1,-2,3),140,2),((2,-1,1.8),100,2),((0,2,2),140,2)]:
 bpy.ops.object.light_add(type='AREA',location=p);light=bpy.context.object;light.data.energy=power;light.data.size=size;light.rotation_euler=(Vector((0,0,.85))-light.location).to_track_quat('-Z','Y').to_euler()
scene.world=bpy.data.worlds.new('NeckReview');scene.world.color=(.22,.22,.22)
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=False
scene.render.resolution_x=600;scene.render.resolution_y=650;scene.render.resolution_percentage=100
for name in ['Idle','Walk','Run','HeadStress']:
 action=next(a for a in actions if a.name==name or a.name.startswith(name+'_'));arm.animation_data.action=action
 frame=action.frame_range[0]+.25*(action.frame_range[1]-action.frame_range[0]);scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
 for view,location in [('front',(0,-2,.88)),('quarter',(.9,-2,.88)),('side',(2,0,.88))]:
  camera.location=location;camera.rotation_euler=(Vector((0,0,.865))-camera.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=str(OUT/f'{variant}-{name}-{view}.png');bpy.ops.render.render(write_still=True)

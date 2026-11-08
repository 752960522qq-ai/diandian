"""Sample the three uploaded Linxu replacements in glTF world coordinates.
Run: blender --background --threads 2 --python tools/blender/sample_linxu_fbx_v2.py
"""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Matrix
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/characters/linxu_motion_v2'
conversion=Matrix.Rotation(-math.pi/2,4,'X')
report={}
for clip, filename in [('Idle','Orc Idle.fbx'),('Walk','Standard Walk.fbx'),('Run','Running.fbx')]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 path=OUT/'sources'/filename
 bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
 armatures=[o for o in bpy.data.objects if o.type=='ARMATURE']
 assert len(armatures)==1, (filename,len(armatures))
 arm=armatures[0]; action=arm.animation_data.action; scene=bpy.context.scene
 fps=scene.render.fps/scene.render.fps_base
 def q(matrix):
  value=matrix.to_quaternion(); return [value.x,value.y,value.z,value.w]
 def key(name):
  if name.startswith('mixamorig:'):return name
  if name.startswith('mixamorig'):return 'mixamorig:'+name[len('mixamorig'):]
  return name
 rest={key(n):{'p':list(conversion@arm.matrix_world@b.head_local),'q':q(conversion@arm.matrix_world@b.matrix_local),'parent':key(b.parent.name) if b.parent else None} for n,b in arm.data.bones.items()}
 hips=next(b for b in arm.pose.bones if key(b.name)=='mixamorig:Hips')
 start,end=map(float,action.frame_range)
 count=round((end-start)*2);frames=[]
 for i in range(count+1):
  frame=start+(end-start)*i/count
  scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
  frames.append({'q':{key(n):q(conversion@arm.matrix_world@b.matrix) for n,b in arm.pose.bones.items()},'hips':list(conversion@arm.matrix_world@hips.head)})
 entry={'clip':clip,'source':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'duration':(end-start)/fps,'fps':fps,'sample_fps':fps*2,'source_frame_range':[start,end],'rest':rest,'frames':frames}
 (OUT/(clip.lower()+'-samples.json')).write_text(json.dumps(entry,separators=(',',':'))+'\n')
 report[clip]={k:entry[k] for k in ['source','sha256','duration','fps','source_frame_range']}
 report[clip].update({'samples':len(frames),'sample_fps':fps*2,'bones':len(rest),'armature':arm.name,'action':action.name,'meshes':sum(o.type=='MESH' for o in bpy.data.objects),'hips_first':frames[0]['hips'],'hips_last':frames[-1]['hips'],'hips_endpoint_delta':[frames[-1]['hips'][k]-frames[0]['hips'][k]for k in range(3)]})
(OUT/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

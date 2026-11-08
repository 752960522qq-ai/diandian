"""Sample uploaded male Idle/Walking FBXs in glTF world coordinates.
blender -b -t 2 --python tools/blender/sample_resistance_male_r46.py
"""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/animations/resistance_r46';OUT.mkdir(parents=True,exist_ok=True)
conversion=Matrix.Rotation(-math.pi/2,4,'X')
report={}
for clip,filename in [('Idle','male_Idle.fbx'),('Walk','male_Walking.fbx')]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 path=OUT/'sources'/filename
 bpy.ops.import_scene.fbx(filepath=str(path),automatic_bone_orientation=False)
 arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');action=arm.animation_data.action;scene=bpy.context.scene;fps=scene.render.fps/scene.render.fps_base
 def q(matrix):
  value=matrix.to_quaternion();return [value.x,value.y,value.z,value.w]
 rest={n:{'p':list(conversion@arm.matrix_world@b.head_local),'q':q(conversion@arm.matrix_world@b.matrix_local),'parent':b.parent.name if b.parent else None} for n,b in arm.data.bones.items()}
 start,end=map(float,action.frame_range);count=round(end-start);frames=[]
 for i in range(count+1):
  scene.frame_set(round(start+i));bpy.context.view_layer.update()
  frames.append({'q':{n:q(conversion@arm.matrix_world@b.matrix) for n,b in arm.pose.bones.items()},'hips':list(conversion@arm.matrix_world@arm.pose.bones['mixamorig:Hips'].head)})
 entry={'clip':clip,'source':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'duration':(end-start)/fps,'fps':fps,'source_frame_range':[start,end],'rest':rest,'frames':frames}
 (OUT/(clip.lower()+'-samples.json')).write_text(json.dumps(entry,separators=(',',':'))+'\n')
 report[clip]={k:entry[k] for k in ['source','sha256','duration','fps','source_frame_range']};report[clip]['bones']=len(rest)
(OUT/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

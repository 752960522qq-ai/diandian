import bpy,json,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2];O=R/'web/motion-labs/verification_weapon_v6_shoulder';rows=json.loads((O/'runtime-validation-input.json').read_text());out=[]
for name in sorted(set(r['name']for r in rows)):
 bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=240;bpy.ops.import_scene.gltf(filepath=str(O/'baked'/(name+'.glb')));a=next(o for o in bpy.data.objects if o.type=='ARMATURE')
 for row in [r for r in rows if r['name']==name]:
  f=row['t']*240;sc.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();errors={}
  for n,p in row['bones'].items():
   actual=a.matrix_world@a.pose.bones['mixamorig:'+n].head;expect=Vector((p[0],-p[2],p[1]));errors[n]=(actual-expect).length
  out.append({'name':name,'time':row['t'],'errorsM':errors,'maxErrorM':max(errors.values())})
(O/'blender-runtime-pose-validation.json').write_text(json.dumps({'fpsSetBeforeImport':True,'rows':out,'maxErrorM':max(r['maxErrorM']for r in out)},indent=2));print('POSE_MAX_ERROR',max(r['maxErrorM']for r in out))

import bpy,json,math
from pathlib import Path
from mathutils import Vector
O=Path(__file__).resolve().parents[2]/'web/motion-labs/verification_weapon_v6_shoulder';rows=json.loads((O/'skin-check-input.json').read_text());out=[]
for mode in ['before','after']:
 bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene;sc.render.fps=240;bpy.ops.import_scene.gltf(filepath=str(O/'baked'/(mode+'.glb')))
 for row in [r for r in rows if r['mode']==mode]:
  f=row['t']*240;sc.frame_set(math.floor(f),subframe=f%1);bpy.context.view_layer.update();o=bpy.data.objects['Linxu_Body_Head'];eo=o.evaluated_get(bpy.context.evaluated_depsgraph_get());em=eo.to_mesh();errors=[]
  for v in row['vertices']:
   actual=eo.matrix_world@em.vertices[v['i']].co;expect=Vector((v['p'][0],-v['p'][2],v['p'][1]));errors.append((actual-expect).length)
  out.append({'mode':mode,'time':row['t'],'phase':row['phase'],'vertices':len(errors),'maxErrorM':max(errors),'meanErrorM':sum(errors)/len(errors),'preserveVolume':next(m.use_deform_preserve_volume for m in o.modifiers if m.type=='ARMATURE')});eo.to_mesh_clear()
(O/'blender-actual-skin-validation.json').write_text(json.dumps({'rows':out,'maxErrorM':max(r['maxErrorM']for r in out)},indent=2));print('ACTUAL_SKIN_MAX_ERROR',max(r['maxErrorM']for r in out))

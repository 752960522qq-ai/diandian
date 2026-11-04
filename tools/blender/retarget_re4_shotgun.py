"""Retarget the uploaded RE4 22-node skeleton to the retained character rig.
No rest bones, meshes, skin weights or existing clips are modified.
"""
import bpy, math, json, struct, argparse, sys
from pathlib import Path
from mathutils import Matrix,Vector,Quaternion
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir',default='/workspace/work/shotgun/source')
parser.add_argument('--sites-root',default='/workspace/work/sites')
parser.add_argument('--report-dir',default='/workspace/work/shotgun')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT=Path(args.report_dir); ROOT.mkdir(parents=True,exist_ok=True); SRC=Path(args.source_dir); SITES=Path(args.sites_root)
S={'Hips':'Bone_02_Hips','Spine':'Bone_09_SpineBase','Spine2':'Bone_10_Chest','Neck':'Bone_17_Neck','Head':'Bone_18_Head'}
for side,sign,ids in [('Right','NegativeX',[3,4,5,11,12,13]),('Left','PositiveX',[6,7,8,14,15,16])]:
 for part,i,label in zip(['UpLeg','Leg','Foot','Arm','ForeArm','Hand'],ids,['Leg','Knee','Foot','Arm','Elbow','Hand']): S[side+part]=f'Bone_{i:02d}_{label}{sign}'
def wp(a,n,posed=False):return a.matrix_world@(a.pose.bones[n].head if posed else a.data.bones[n].head_local)
def wq(a,n,posed=False):return (a.matrix_world@(a.pose.bones[n].matrix if posed else a.data.bones[n].matrix_local)).to_quaternion()
def sample_source():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 clips={};src_rest=None;rest_pos=None
 for kind in ['Aim','Fire','Pump','Reload','FullFireCycle_REFERENCE']:
  old=set(bpy.data.objects);oa=set(bpy.data.actions)
  bpy.ops.import_scene.fbx(filepath=str(SRC/f'RE4_Shotgun_{kind}.fbx'),automatic_bone_orientation=False)
  added=set(bpy.data.objects)-old;a=next(o for o in added if o.type=='ARMATURE')
  if src_rest is None:
   src_rest={n:wq(a,n) for n in a.data.bones.keys()};rest_pos={n:wp(a,n) for n in a.data.bones.keys()}
  for act in set(bpy.data.actions)-oa:
   label=act.name.split('|')[-1];a.animation_data.action=act
   for tr in a.animation_data.nla_tracks:tr.mute=True
   start,end=map(int,act.frame_range);frames=[]
   for f in range(start,end+1):
    bpy.context.scene.frame_set(f);bpy.context.view_layer.update()
    frames.append({'q':{n:wq(a,n,True) for n in a.data.bones.keys()},'p':{n:wp(a,n,True) for n in a.data.bones.keys()}})
   clips[label]={'frames':frames,'source_file':f'RE4_Shotgun_{kind}.fbx','frame_range':[start,end]}
  for ob in added:bpy.data.objects.remove(ob,do_unlink=True)
  for ac in set(bpy.data.actions)-oa:bpy.data.actions.remove(ac)
 return clips,src_rest,rest_pos
CLIPS,SR,SP=sample_source()
BARREL=Vector((-1,0,0)); GUNSRC=Matrix(((0,0,1),(1,0,0),(0,1,0))).to_quaternion() # columns Y,Z,X
up=CLIPS['Aim_Up_SourceFull']['frames'][0];down=CLIPS['Aim_Down_SourceFull']['frames'][0]
def pitch(q):
 d=q@BARREL;return math.degrees(math.atan2(d.z,math.hypot(d.x,d.y)))
lo,hi=0.,1.
for _ in range(50):
 w=(lo+hi)/2;p=pitch(down['q'][S['RightHand']].slerp(up['q'][S['RightHand']],w))
 if p>0:hi=w
 else:lo=w
LEVEL=(lo+hi)/2
print('PITCH_LIMITS',pitch(down['q'][S['RightHand']]),pitch(up['q'][S['RightHand']]),'LEVEL_WEIGHT',LEVEL,flush=True)
def blend_frame(d,u,w):return {'q':{n:d['q'][n].slerp(u['q'][n],w) for n in d['q']},'p':{n:d['p'][n].lerp(u['p'][n],w) for n in d['p']}}
def source_sequence(prefix,side):
 if prefix=='Aim':key=f'Aim_{side}_SourceFull'
 elif prefix=='Fire':key=f'Fire_{side}_FromShot_Src0_7'
 elif prefix=='Pump':key=f'Pump_{side}_FromShot_Src7_29'
 elif prefix=='Cycle':key=f'FullFireCycle_{side}_SourceFull'
 return CLIPS[key]
def frames_for(prefix,side):
 if side!='Level':return source_sequence(prefix,side)['frames']
 u=source_sequence(prefix,'Up')['frames'];d=source_sequence(prefix,'Down')['frames'];count=max(len(u),len(d));return [blend_frame(d[min(i,len(d)-1)],u[min(i,len(u)-1)],LEVEL) for i in range(count)]
def xyzw(q):return [q.x,q.y,q.z,q.w]
def convert_gltf_point(p):return [p.x,p.z,-p.y]
def convert_gltf_q(q):return xyzw(Quaternion((1,0,0),-math.pi/2)@q)
def export_character(cid):
 path=SITES/cid/'dist/assets'/f'{cid}_fixed.glb'
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.fps=30;scene.render.fps_base=1
 bpy.ops.import_scene.gltf(filepath=str(path));a=next(o for o in bpy.data.objects if o.type=='ARMATURE');a.animation_data_create()
 for tr in a.animation_data.nla_tracks:tr.mute=True
 # The uploaded source has no articulated fingers; retain the existing character's grasp.
 base=next(x for x in bpy.data.actions if x.name.startswith('RifleAimingIdle'))
 a.animation_data.action=base;scene.frame_set(0);bpy.context.view_layer.update()
 fingers={b.name:b.rotation_quaternion.copy() for b in a.pose.bones if 'Hand' in b.name and any(d in b.name for d in ['Thumb','Index','Middle','Ring','Pinky'])}
 a.animation_data.action=None
 for ac in list(bpy.data.actions):bpy.data.actions.remove(ac)
 for tr in list(a.animation_data.nla_tracks):a.animation_data.nla_tracks.remove(tr)
 T={k:'mixamorig:'+k for k in S};T.update({p:'mixamorig:'+p for p in ['Spine1','LeftShoulder','RightShoulder']})
 TR={n:wq(a,n) for n in a.data.bones.keys()};TP={n:wp(a,n) for n in a.data.bones.keys()}
 align=Quaternion();cal={n:Quaternion() for n in T}
 for side in ['Left','Right']:
  for part,child in [('UpLeg','Leg'),('Leg','Foot'),('Arm','ForeArm'),('ForeArm','Hand')]:
   t=(TP[T[side+child]]-TP[T[side+part]]).normalized();s=(SP[S[side+child]]-SP[S[side+part]]).normalized();cal[side+part]=t.rotation_difference(s)
  cal[side+'Hand']=cal[side+'ForeArm'].copy()
 ratio=((TP[T['LeftLeg']]-TP[T['LeftUpLeg']]).length+(TP[T['LeftFoot']]-TP[T['LeftLeg']]).length)/((SP[S['LeftLeg']]-SP[S['LeftUpLeg']]).length+(SP[S['LeftFoot']]-SP[S['LeftLeg']]).length)
 LR={n:(a.data.bones[n].parent.matrix_local.inverted()@a.data.bones[n].matrix_local).to_quaternion() if a.data.bones[n].parent else a.data.bones[n].matrix_local.to_quaternion() for n in a.data.bones.keys()}
 armQ=a.matrix_world.to_quaternion();rootInv=(a.matrix_world.to_3x3()@a.data.bones[T['Hips']].matrix_local.to_3x3()).inverted()
 C=SR[S['RightHand']].inverted()@cal['RightHand']@TR[T['RightHand']];handGun=C.inverted()@GUNSRC
 report={'character':cid,'source_bones':22,'mapped_body_bones':len(T),'fps':30,'leg_length_ratio':ratio,'aim_pitch_min_deg':pitch(down['q'][S['RightHand']]),'aim_pitch_max_deg':pitch(up['q'][S['RightHand']]),'level_up_weight':LEVEL,'gun_axis_source':'Right hand local -X, up local +Z','quaternion_xyzw':xyzw(handGun),'fingers':'Existing RifleAimingIdle grip retained because source has no finger joints.','clips':{},'poses':{}}
 for prefix in ['Aim','Fire','Pump','Cycle']:
  for side in ['Up','Down','Level']:
   frames=frames_for(prefix,side)
   # Keep the uploaded endpoint motion; UI may hold a sampled pose when adjusting pitch.
   make_action(a,scene,T,TR,TP,LR,cal,ratio,rootInv,armQ,fingers,frames,f'Shotgun{prefix}{side}',report)
 make_action(a,scene,T,TR,TP,LR,cal,ratio,rootInv,armQ,fingers,CLIPS['Reload_SourceFull']['frames'],'ShotgunReload',report)
 # Export animation-only; the site's existing model supplies meshes, skin, facial rig and hair.
 a.animation_data.action=None
 for p in a.pose.bones:p.matrix_basis=Matrix.Identity(4)
 bpy.ops.object.select_all(action='DESELECT');a.select_set(True);bpy.context.view_layer.objects.active=a
 out=path.parent/'re4_shotgun_animations.glb'
 bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_anim_single_armature=True,export_skins=True,export_materials='NONE',export_extras=True)
 # Canonical public action names (Blender may append the armature name).
 raw=out.read_bytes();jlen=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+jlen]);
 for ac in g.get('animations',[]):
  ac['name']=ac['name'].split('_Armature')[0]
 jb=json.dumps(g,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);rest=raw[20+jlen:];out.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(jb)+len(rest))+struct.pack('<I4s',len(jb),b'JSON')+jb+rest)
 (path.parent/'re4_shotgun_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('EXPORTED',cid,out.stat().st_size,flush=True)
 return report

def make_action(a,scene,T,TR,TP,LR,cal,ratio,rootInv,armQ,fingers,frames,name,report):
 ac=bpy.data.actions.new(name);ac.use_fake_user=True;a.animation_data.action=ac
 for p in a.pose.bones:p.matrix_basis=Matrix.Identity(4);p.rotation_mode='QUATERNION'
 prev={};foot_min=1e9; firstpose=None
 for f,sf in enumerate(frames):
  desired={}
  for part,n in T.items():
   if part in ['LeftShoulder','RightShoulder']:sq=sf['q'][S['Spine2']];sr=SR[S['Spine2']]
   elif part=='Spine1':sq=sf['q'][S['Spine']].slerp(sf['q'][S['Spine2']],.5);sr=SR[S['Spine']].slerp(SR[S['Spine2']],.5)
   else:sq=sf['q'][S[part]];sr=SR[S[part]]
   desired[n]=sq@sr.inverted()@cal[part]@TR[n]
  for part,n in T.items():
   pb=a.pose.bones[n];parent=desired.get(pb.parent.name,armQ) if pb.parent else armQ
   q=(LR[n].inverted()@parent.inverted()@desired[n]).normalized()
   if n in prev and q.dot(prev[n])<0:q.negate()
   prev[n]=q.copy();pb.rotation_quaternion=q;pb.keyframe_insert('rotation_quaternion',frame=f,group=n)
  hips=a.pose.bones[T['Hips']];delta=(sf['p'][S['Hips']]-SP[S['Hips']])*ratio;hips.location=rootInv@delta;hips.keyframe_insert('location',frame=f,group=hips.name)
  for n,q in fingers.items():a.pose.bones[n].rotation_quaternion=q;a.pose.bones[n].keyframe_insert('rotation_quaternion',frame=f,group=n)
  scene.frame_set(f);bpy.context.view_layer.update()
  foot_min=min(foot_min,*[wp(a,T[side+'Foot'],True).z for side in ['Left','Right']])
  if f==0:
   firstpose={part:{'world_position_blender':list(wp(a,T[part],True)),'world_position_gltf':convert_gltf_point(wp(a,T[part],True)),'world_quaternion_gltf':convert_gltf_q(wq(a,T[part],True))} for part in ['RightHand','LeftHand','RightArm','LeftArm','Hips']}
 for fc in ac.fcurves:
  for k in fc.keyframe_points:k.interpolation='LINEAR'
 report['clips'][name]={'samples':len(frames),'duration_seconds':(len(frames)-1)/30,'foot_joint_min_height_native':foot_min,'loop':False if any(p in name for p in ['Fire','Pump','Reload','Cycle']) else True}
 if name.startswith('ShotgunAim'):report['poses'][name]=firstpose

reports={cid:export_character(cid) for cid in ['diandian','zhigeng']}
(ROOT/'retarget_report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))

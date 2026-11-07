"""Retarget the supplied RE4 w07 upper body without changing character meshes.

Run with Blender 4.3 Python/bpy. --sites-root contains diandian/dist and
zhigeng/dist. Source FBXs are the 13 w07 files supplied by the user.
Only upper-body rotation channels are retained; no hips/root/leg channels.
"""
import argparse, json, math, struct, sys, hashlib
from pathlib import Path
import bpy
from mathutils import Matrix, Vector, Quaternion

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir', required=True)
parser.add_argument('--sites-root', required=True)
parser.add_argument('--output-dir', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:])
SRC, SITES, OUT = map(Path, (args.source_dir, args.sites_root, args.output_dir))
S = {'Hips':'Bone_02_Hips', 'Spine':'Bone_09_SpineBase', 'Spine2':'Bone_10_Chest', 'Neck':'Bone_17_Neck', 'Head':'Bone_18_Head'}
for side, sign, ids in [('Right','NegativeX',[11,12,13]),('Left','PositiveX',[14,15,16])]:
    for part, i, label in zip(['Arm','ForeArm','Hand'], ids, ['Arm','Elbow','Hand']):
        S[side+part] = f'Bone_{i:02d}_{label}{sign}'
NAMES = {'000':'Idle','001':'Walk','002':'Run','006':'AimUp','007':'FireUp','008':'AimDown','009':'FireDown','010':'RaiseUp','011':'RaiseDown','012':'RaiseInfiniteUp','013':'RaiseInfiniteDown','014':'Discard','015':'Draw'}
def wq(a,n,posed=False): return (a.matrix_world @ (a.pose.bones[n].matrix if posed else a.data.bones[n].matrix_local)).to_quaternion()
def wp(a,n): return a.matrix_world @ a.data.bones[n].head_local
def xyzw(q): return [q.x,q.y,q.z,q.w]

bpy.ops.wm.read_factory_settings(use_empty=True)
CLIPS, SOURCES, SR, SP = {}, {}, None, None
for code, name in NAMES.items():
    path = SRC / f'w07_{code}.fbx'
    before, acts = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(path.resolve()), automatic_bone_orientation=False)
    added = set(bpy.data.objects) - before
    a = next(o for o in added if o.type == 'ARMATURE')
    if SR is None:
        SR = {n:wq(a,n) for n in a.data.bones.keys()}
        SP = {n:wp(a,n) for n in a.data.bones.keys()}
    act = a.animation_data.action
    for tr in a.animation_data.nla_tracks: tr.mute = True
    start,end = map(int,act.frame_range)
    frames = []
    for f in range(start,end+1):
        bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
        frames.append({n:wq(a,n,True) for n in S.values()})
    CLIPS[name] = frames
    SOURCES[name] = {'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'action':act.name,'frames':[start,end],'duration':(end-start)/30}
    for ob in added: bpy.data.objects.remove(ob,do_unlink=True)
    for ac in set(bpy.data.actions)-acts: bpy.data.actions.remove(ac)

# Source right-hand local -X is the muzzle direction, +Z is weapon up.
GUNSRC = Matrix(((0,0,1),(1,0,0),(0,1,0))).to_quaternion()
def pitch(q):
    d=q@Vector((-1,0,0)); return math.degrees(math.atan2(d.z,math.hypot(d.x,d.y)))
lo,hi=0.,1.
for _ in range(45):
    mid=(lo+hi)/2
    if pitch(CLIPS['AimDown'][0][S['RightHand']].slerp(CLIPS['AimUp'][0][S['RightHand']],mid))>0: hi=mid
    else: lo=mid
level=(lo+hi)/2
def at(frames, t):
    f=t*(len(frames)-1);i=min(int(f),len(frames)-1);j=min(i+1,len(frames)-1)
    return {n:frames[i][n].slerp(frames[j][n], f-i) for n in S.values()}
for prefix in ['Aim','Fire','Raise','RaiseInfinite']:
    up,down=CLIPS[prefix+'Up'],CLIPS[prefix+'Down']; count=max(len(up),len(down))
    CLIPS[prefix+'Level']=[]
    for i in range(count):
        u,d=at(up,i/(count-1)),at(down,i/(count-1))
        CLIPS[prefix+'Level'].append({n:d[n].slerp(u[n],level) for n in S.values()})

for cid in ['diandian','zhigeng']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene;scene.render.fps=30
    bpy.ops.import_scene.gltf(filepath=str((SITES/cid/'dist/assets'/f'{cid}_fixed.glb').resolve()))
    a=next(o for o in bpy.data.objects if o.type=='ARMATURE'); a.animation_data_create()
    for tr in a.animation_data.nla_tracks:tr.mute=True
    a.animation_data.action=next(ac for ac in bpy.data.actions if ac.name.startswith('RifleAimingIdle'))
    scene.frame_set(0);bpy.context.view_layer.update()
    fingers={p.name:p.rotation_quaternion.copy() for p in a.pose.bones if 'Hand' in p.name and any(d in p.name for d in ['Thumb','Index','Middle','Ring','Pinky'])}
    a.animation_data.action=None
    for ac in list(bpy.data.actions):bpy.data.actions.remove(ac)
    for tr in list(a.animation_data.nla_tracks):a.animation_data.nla_tracks.remove(tr)
    T={k:'mixamorig:'+k for k in S}
    T.update({k:'mixamorig:'+k for k in ['Spine1','LeftShoulder','RightShoulder']})
    TR={n:wq(a,n) for n in a.data.bones.keys()}; TP={n:wp(a,n) for n in a.data.bones.keys()}
    cal={k:Quaternion() for k in T}
    for side in ['Left','Right']:
        for part,child in [('Arm','ForeArm'),('ForeArm','Hand')]:
            t=(TP[T[side+child]]-TP[T[side+part]]).normalized()
            s=(SP[S[side+child]]-SP[S[side+part]]).normalized()
            cal[side+part]=t.rotation_difference(s)
        cal[side+'Hand']=cal[side+'ForeArm'].copy()
    LR={n:(b.parent.matrix_local.inverted()@b.matrix_local).to_quaternion() if b.parent else b.matrix_local.to_quaternion() for n,b in a.data.bones.items()}
    C=SR[S['RightHand']].inverted()@cal['RightHand']@TR[T['RightHand']]
    report={'character':cid,'fps':30,'source_clips':SOURCES,'source_count':13,'derived_level_count':4,'level_blend_weight':level,'source_pitch_degrees':[pitch(CLIPS['AimDown'][0][S['RightHand']]),pitch(CLIPS['AimUp'][0][S['RightHand']])],'hand_to_weapon_xyzw':xyzw(C.inverted()@GUNSRC),'upper_only':True,'root_and_legs':'Excluded. Runtime composition supplies original rifle clips.','clips':{}}
    upper=set(T.values())-{T['Hips']}
    armQ=a.matrix_world.to_quaternion()
    for name,frames in CLIPS.items():
        ac=bpy.data.actions.new('RocketUpper'+name);ac.use_fake_user=True;a.animation_data.action=ac
        for pb in a.pose.bones:pb.matrix_basis=Matrix.Identity(4);pb.rotation_mode='QUATERNION'
        prev={}
        for f,sf in enumerate(frames):
            desired={}
            for part,n in T.items():
                if part in ['LeftShoulder','RightShoulder']:sq,sr=sf[S['Spine2']],SR[S['Spine2']]
                elif part=='Spine1':sq,sr=sf[S['Spine']].slerp(sf[S['Spine2']],.5),SR[S['Spine']].slerp(SR[S['Spine2']],.5)
                else:sq,sr=sf[S[part]],SR[S[part]]
                desired[n]=sq@sr.inverted()@cal[part]@TR[n]
            for n in upper|{T['Hips']}:
                pb=a.pose.bones[n]
                parent=desired.get(pb.parent.name,armQ) if pb.parent else armQ
                q=(LR[n].inverted()@parent.inverted()@desired[n]).normalized()
                if n in prev and q.dot(prev[n])<0:q.negate()
                prev[n]=q.copy();pb.rotation_quaternion=q;pb.keyframe_insert('rotation_quaternion',frame=f,group=n)
            for n,q in fingers.items():
                pb=a.pose.bones[n];pb.rotation_quaternion=q;pb.keyframe_insert('rotation_quaternion',frame=f,group=n)
        for fc in ac.fcurves:
            for k in fc.keyframe_points:k.interpolation='LINEAR'
        report['clips'][ac.name]={'samples':len(frames),'duration':(len(frames)-1)/30}
    a.animation_data.action=None
    for pb in a.pose.bones:pb.matrix_basis=Matrix.Identity(4)
    bpy.ops.object.select_all(action='DESELECT');a.select_set(True);bpy.context.view_layer.objects.active=a
    dest=OUT/cid;dest.mkdir(parents=True,exist_ok=True);path=dest/'re4_rocket_upper.glb'
    bpy.ops.export_scene.gltf(filepath=str(path.resolve()),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_anim_single_armature=True,export_skins=True,export_materials='NONE',export_extras=True)
    b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n])
    valid=upper|set(fingers)
    binary=b[28+n:]
    def read_float_accessor(index):
        ac=g['accessors'][index];v=g['bufferViews'][ac['bufferView']]
        count=ac['count']*({'SCALAR':1,'VEC4':4}[ac['type']])
        return list(struct.unpack_from('<'+'f'*count,binary,v.get('byteOffset',0)+ac.get('byteOffset',0)))
    for anim in g['animations']:
        anim['name']=anim['name'].split('_Armature')[0]
        hc=next(ch for ch in anim['channels'] if g['nodes'][ch['target']['node']].get('name')==T['Hips'] and ch['target']['path']=='rotation')
        hs=anim['samplers'][hc['sampler']]
        anim['extras']={'reference_hips':{'times':read_float_accessor(hs['input']),'quaternions':read_float_accessor(hs['output'])},'note':'Reference only, never applied to pelvis. Used to preserve upper-body orientation when mixing rifle hips.'}
        anim['channels']=[ch for ch in anim['channels'] if g['nodes'][ch['target']['node']].get('name') in valid and ch['target']['path']=='rotation']
        assert anim['channels'],anim['name']
        report['clips'][anim['name']]['upper_rotation_channels']=len(anim['channels'])
    # Remove now-unreferenced lower-body/facial buffers from Blender's forced
    # sampling export. No vertex payload is present in this animation-only file.
    binary=b[28+n:]; packed=bytearray(); accessors=[]; views=[]; remap={}
    def copy_accessor(index):
        if index in remap:return remap[index]
        old=g['accessors'][index]; view=g['bufferViews'][old['bufferView']]
        assert 'sparse' not in old
        start=view.get('byteOffset',0); size=view['byteLength']
        packed.extend(b'\0'*((-len(packed))%4));offset=len(packed);packed.extend(binary[start:start+size])
        nv={**view,'buffer':0,'byteOffset':offset};views.append(nv)
        accessors.append({**old,'bufferView':len(views)-1});remap[index]=len(accessors)-1
        return remap[index]
    for anim in g['animations']:
        samplers=[]
        for ch in anim['channels']:
            old=anim['samplers'][ch['sampler']]
            samplers.append({**old,'input':copy_accessor(old['input']),'output':copy_accessor(old['output'])})
            ch['sampler']=len(samplers)-1
        anim['samplers']=samplers
    assert not g.get('meshes')
    g.pop('skins',None)
    packed.extend(b'\0'*((-len(packed))%4));g['buffers']=[{'byteLength':len(packed)}];g['bufferViews']=views;g['accessors']=accessors
    jb=json.dumps(g,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);rest=struct.pack('<I4s',len(packed),b'BIN\0')+packed
    path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(jb)+len(rest))+struct.pack('<I4s',len(jb),b'JSON')+jb+rest)
    (dest/'retarget_report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('EXPORTED',cid,len(g['animations']),path.stat().st_size,flush=True)

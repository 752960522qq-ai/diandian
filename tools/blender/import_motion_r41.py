"""Bake the November upload onto the existing two character rigs (Blender 4.3).

Run from the repository root: blender -b --python tools/blender/import_motion_r41.py
Only new animation libraries are exported; existing models and clips stay intact.
"""
import bpy
import json
import math
import struct
import sys
import numpy as np
from pathlib import Path
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / 'assets/animations/motion_lab_r41'
sys.path.insert(0, str(Path(__file__).parent))
from retarget_uploaded_motion import _point, _side_frame, _palm_frame, _leg_length

# Looping travel is displayed in place; death and mantle keep their trajectory.
DEFINITIONS = [
    ('Dying', '倒地死亡', 'Dying1.fbx', False, 'trajectory'),
    ('FlyingBackDeath', '后飞死亡', 'Flying Back Death.fbx', False, 'trajectory'),
    ('PistolShooting', '手枪射击', 'pistol Shooting.fbx', False, 'stationary'),
    ('SittingTalking', '二郎腿交谈', '二郎腿Sitting Talking.fbx', False, 'stationary'),
    ('SittingCrossLegged', '二郎腿坐姿', '二郎腿Sitting.fbx', True, 'stationary'),
    ('ClimbingLadder', '攀爬梯子', 'Climbing Ladder.fbx', True, 'climb_in_place'),
    ('HangToCrouch', '悬挂翻上蹲伏', 'Braced Hang To Crouch.fbx', False, 'trajectory'),
    ('WalkingBackwards', '倒退行走', 'Walking Backwards.fbx', True, 'in_place'),

]

def world_q(arm, name, posed=False):
    matrix = arm.pose.bones[name].matrix if posed else arm.data.bones[name].matrix_local
    return (arm.matrix_world @ matrix).to_quaternion()

def ground_death(target, action):
    """Lift the pelvis only where the actual deformed body would enter floor."""
    scene=bpy.context.scene;target.animation_data.action=action
    meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==target for m in o.modifiers)]
    count=round(action.frame_range[1]);minimum=[]
    for frame in range(count+1):
        scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get();height=math.inf
        for obj in meshes:
            evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
            points=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',points)
            matrix=np.array(evaluated.matrix_world)
            height=min(height,float(np.min(points.reshape(-1,3)@matrix[2,:3]+matrix[2,3])))
            evaluated.to_mesh_clear()
        minimum.append(height)
    raw=[max(0,-value+.001) for value in minimum]
    # A short upper envelope anticipates and settles contact without allowing
    # the smoothing step to put the head or fingers below the ground again.
    lift=[max(raw[j]-.005*abs(i-j) for j in range(max(0,i-3),min(count+1,i+4))) for i in range(count+1)]
    hips=target.pose.bones['mixamorig:Hips'];inverse=(target.matrix_world.to_3x3()@hips.bone.matrix_local.to_3x3()).inverted()
    for curve in action.fcurves:
        if curve.data_path!=hips.path_from_id('location'):continue
        for key in curve.keyframe_points:
            delta=(inverse@Vector((0,0,lift[round(key.co.x)])))[curve.array_index]
            key.co.y+=delta;key.handle_left.y+=delta;key.handle_right.y+=delta
    return {'method':'Evaluated skinned body and hair; per-frame pelvis lift, 3-frame contact envelope','sampled_frames':count+1,'minimum_before_native_m':min(minimum),'minimum_after_native_m':min(v+d for v,d in zip(minimum,lift)),'max_lift_native_m':max(lift)},lift

def source_data():
    result = {}
    paths = {Path(e['path']).name: ROOT / e['path'] for e in json.loads((PACK/'sources.json').read_text())}
    for name, label, filename, loop, policy in DEFINITIONS:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(paths[filename]), automatic_bone_orientation=False)
        arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
        scene = bpy.context.scene
        fps = scene.render.fps / scene.render.fps_base
        action = arm.animation_data.action
        first, last = map(float, action.frame_range)
        count = round((last-first)/fps*30)
        names = [b.name for b in arm.data.bones]
        rest = {n: world_q(arm,n) for n in names}
        points = {n: _point(arm,n) for n in names}
        frames = []
        for i in range(count+1):
            frame = first+i/30*fps
            scene.frame_set(math.floor(frame), subframe=frame%1)
            frames.append({'q':{n:world_q(arm,n,True) for n in names}, 'p':_point(arm,'mixamorig:Hips',True)})
        result[name] = dict(rest=rest, points=points, frames=frames,
            side=_side_frame(arm), palms={s:_palm_frame(arm,s) for s in ['Left','Right']}, leg=_leg_length(arm),
            fps=fps, source_frame_range=[first,last], filename=filename, label=label, loop=loop, policy=policy)
        print('SAMPLED',name,count+1,flush=True)
    return result

def prune_library(path):
    """Keep only body rotations + pelvis translations, and discard unused bytes."""
    raw=path.read_bytes(); length=struct.unpack_from('<I',raw,12)[0]
    gltf=json.loads(raw[20:20+length]); binary=raw[28+length:]
    accessors=[]; views=[]; blob=bytearray(); mapping={}
    def copy_accessor(old):
        if old in mapping:return mapping[old]
        accessor=dict(gltf['accessors'][old]); view=gltf['bufferViews'][accessor['bufferView']]
        while len(blob)%4:blob.append(0)
        offset=len(blob); start=view.get('byteOffset',0)
        blob.extend(binary[start:start+view['byteLength']])
        new_view={**view,'buffer':0,'byteOffset':offset};views.append(new_view)
        accessor['bufferView']=len(views)-1;accessors.append(accessor)
        mapping[old]=len(accessors)-1;return mapping[old]
    for animation in gltf['animations']:
        animation['name']=next(n for n,*_ in DEFINITIONS if animation['name']==n or animation['name'].startswith(n+'_'))
        samplers=[];channels=[]
        for channel in animation['channels']:
            target=channel['target'];name=gltf['nodes'][target['node']].get('name','')
            if not name.startswith('mixamorig:'):continue
            if target['path']!='rotation' and not (name=='mixamorig:Hips' and target['path']=='translation'):continue
            sampler=animation['samplers'][channel['sampler']]
            samplers.append({**sampler,'input':copy_accessor(sampler['input']),'output':copy_accessor(sampler['output'])})
            channels.append({**channel,'sampler':len(samplers)-1})
        animation['channels']=channels;animation['samplers']=samplers
    # This library exports no meshes. Remove the unused skin, whose accessor
    # would otherwise refer to discarded inverse-bind data.
    assert not any('mesh' in node for node in gltf['nodes'])
    gltf.pop('skins',None)
    for node in gltf['nodes']:node.pop('skin',None)
    gltf['accessors']=accessors;gltf['bufferViews']=views;gltf['buffers']=[{'byteLength':len(blob)}]
    data=json.dumps(gltf,separators=(',',':')).encode();data+=b' '*(-len(data)%4);blob+=b'\0'*(-len(blob)%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(data)+len(blob))+struct.pack('<I4s',len(data),b'JSON')+data+struct.pack('<I4s',len(blob),b'BIN\0')+blob)

def bake_character(cid, sources):
    folder='diandian-classic-motion-lab' if cid=='diandian' else 'zhigeng-motion-lab'
    source=ROOT/'web/motion-labs'/folder/'assets'/f'{cid}_fixed.glb'
    out=PACK/cid;out.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene=bpy.context.scene;scene.render.fps=30;scene.render.fps_base=1
    target=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    target.animation_data_clear();target.animation_data_create()
    for act in list(bpy.data.actions):bpy.data.actions.remove(act)
    for bone in target.pose.bones:bone.matrix_basis=Matrix.Identity(4);bone.rotation_mode='QUATERNION'
    bpy.context.view_layer.update()
    names=[b.name for b in target.data.bones if b.name.startswith('mixamorig:')]
    rest={n:world_q(target,n) for n in names}
    local={n:(target.data.bones[n].parent.matrix_local.inverted()@target.data.bones[n].matrix_local).to_quaternion() if target.data.bones[n].parent else target.data.bones[n].matrix_local.to_quaternion() for n in names}
    hips=target.pose.bones['mixamorig:Hips']
    inverse=(target.matrix_world.to_3x3()@hips.bone.matrix_local.to_3x3()).inverted()
    # Rest-sole samples provide a single floor offset per clip. No per-frame foot
    # flattening: jumps, crossed legs and the source's heel lift remain animated.
    soles=[]
    for obj in bpy.data.objects:
        if obj.type!='MESH' or not any(m.type=='ARMATURE' and m.object==target for m in obj.modifiers):continue
        zs=[(obj.matrix_world@v.co).z for v in obj.data.vertices]
        if not zs:continue
        bottom=min(zs)
        if bottom>.12:continue
        ids=[i for i,z in enumerate(zs) if z<bottom+.018]
        soles.append((obj,ids))
    reports={}
    for name,label,filename,loop,policy in DEFINITIONS:
        src=sources[name];alignment=_side_frame(target)@src['side'].inverted();ratio=_leg_length(target)/src['leg']
        calibration={n:Quaternion() for n in names}
        endpoints={'mixamorig:Neck':'mixamorig:Head'}
        for side in ['Left','Right']:
            prefix='mixamorig:'+side
            for a,b in [('Shoulder','Arm'),('Arm','ForeArm'),('ForeArm','Hand'),('UpLeg','Leg'),('Leg','Foot')]:endpoints[prefix+a]=prefix+b
            for finger in ['Thumb','Index','Middle','Ring','Pinky']:
                for joint in [1,2,3]:endpoints[prefix+'Hand'+finger+str(joint)]=prefix+'Hand'+finger+str(joint+1)
            calibration[prefix+'Hand']=alignment@src['palms'][side]@_palm_frame(target,side).inverted()
        for n,e in endpoints.items():
            a=(_point(target,e)-_point(target,n)).normalized();b=alignment@(src['points'][e]-src['points'][n]).normalized();calibration[n]=a.rotation_difference(b)
        frames=src['frames'];count=len(frames)-1;first=frames[0]['p'];travel=frames[-1]['p']-first
        action=bpy.data.actions.new(name);action.use_fake_user=True;target.animation_data.action=action
        for bone in target.pose.bones:bone.matrix_basis=Matrix.Identity(4)
        rotations={n:[] for n in names};positions=[]
        for i,frame in enumerate(frames):
            desired={}
            for n in names:
                desired[n]=alignment@(frame['q'][n]@src['rest'][n].inverted())@alignment.inverted()@calibration[n]@rest[n]
                parent=desired[target.pose.bones[n].parent.name] if target.pose.bones[n].parent else target.matrix_world.to_quaternion()
                q=(local[n].inverted()@parent.inverted()@desired[n]).normalized()
                if 'Hand' in n and n.endswith('4'):q=Quaternion()
                if rotations[n] and q.dot(rotations[n][-1])<0:q.negate()
                rotations[n].append(q)
            # Retain the absolute crouch / seated height relative to source rest.
            p=frame['p']-src['points']['mixamorig:Hips']
            p.x=frame['p'].x-first.x;p.y=frame['p'].y-first.y
            if policy=='in_place':p.x-=travel.x*i/count;p.y-=travel.y*i/count
            if policy=='climb_in_place':p=frame['p']-first-travel*(i/count)
            positions.append(alignment@p*ratio)
        # Close only intended loops, blending the endpoint residual over the last
        # 0.12 seconds. One-shot falls, jumps, transitions and turns are untouched.
        seam=max(math.degrees(rotations[n][0].rotation_difference(rotations[n][-1]).angle) for n in names)
        if loop:
            span=min(4,count)
            for i in range(count-span,count+1):
                u=(i-(count-span))/span;w=u*u*(3-2*u)
                for n in names:rotations[n][i]=rotations[n][i].slerp(rotations[n][0],w)
                positions[i]=positions[i].lerp(positions[0],w)
        for i in range(count+1):
            for n in names:
                pb=target.pose.bones[n];pb.rotation_quaternion=rotations[n][i];pb.keyframe_insert('rotation_quaternion',frame=i,group=n)
            hips.location=inverse@positions[i];hips.keyframe_insert('location',frame=i,group=hips.name)
        for curve in action.fcurves:
            for key in curve.keyframe_points:key.interpolation='LINEAR'
        # Sample the evaluated sole surface rather than the ankle joint.
        sample_indices=sorted(set([0,count]+list(range(0,count+1,max(1,count//32)))))
        floor_min=math.inf
        for i in sample_indices:
            scene.frame_set(i);deps=bpy.context.evaluated_depsgraph_get()
            for obj,ids in soles:
                evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
                floor_min=min(floor_min,min((evaluated.matrix_world@mesh.vertices[j].co).z for j in ids));evaluated.to_mesh_clear()
        # A mantle must start above the ground and finish on its raised ledge.
        # Its initial hanging height is retained, while other clips sit on floor.
        offset=-floor_min if policy!='trajectory' or name in ['Dying','FlyingBackDeath'] else 0
        correction=inverse@Vector((0,0,offset))
        for curve in action.fcurves:
            if curve.data_path==hips.path_from_id('location'):
                for key in curve.keyframe_points:key.co.y+=correction[curve.array_index];key.handle_left.y+=correction[curve.array_index];key.handle_right.y+=correction[curve.array_index]
        action['source_file']=filename;action['root_policy']=policy;action['loop']=loop
        reports[name]={'label':label,'source':filename,'source_fps':src['fps'],'source_frame_range':src['source_frame_range'],'samples':count+1,'duration':count/30,'mapped_bones':len(names),'leg_ratio':ratio,'loop':loop,'root_policy':policy,'source_root_travel_m':list(travel),'target_root_travel_m':list(alignment@travel*ratio),'floor_offset_native_m':offset,'source_loop_seam_degrees':seam if loop else None}
        if name in ['Dying','FlyingBackDeath']:
            reports[name]['ground_contact'],_=ground_death(target,action)
        print('BAKED',cid,name,count+1,round(offset,4),flush=True)
    target.animation_data.action=None
    for bone in target.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    scene.frame_start=0;scene.frame_end=max(round(a.frame_range[1]) for a in bpy.data.actions)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'motions.blend'),compress=True)
    bpy.ops.object.select_all(action='DESELECT');target.select_set(True);bpy.context.view_layer.objects.active=target
    path=out/'uploaded_motions.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_anim_single_armature=True,export_skins=True,export_materials='NONE',export_extras=True)
    prune_library(path)
    (out/'retarget_report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
    import shutil
    shutil.copy2(path,source.parent/'uploaded_motions.glb')
    print('EXPORTED',cid,path.stat().st_size,flush=True)
    return reports

if __name__=='__main__':
    sources=source_data()
    reports={cid:bake_character(cid,sources) for cid in ['diandian','zhigeng']}
    catalog=[{'name':n,'label':l,'source':f,'loop':loop,'root_policy':p,'category':'pistol' if n.startswith('Pistol') else 'general','duration':reports['diandian'][n]['duration']} for n,l,f,loop,p in DEFINITIONS]
    (PACK/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')

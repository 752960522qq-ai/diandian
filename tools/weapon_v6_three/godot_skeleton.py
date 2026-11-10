#!/usr/bin/env python3
"""Isolated native Godot bone-track remapping and playback QA; no production changes."""
import pathlib,tempfile,subprocess,os,json,hashlib,datetime,struct,math,bisect
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'web/motion-labs/verification_weapon_v6_three/godot_skeleton';out.mkdir(parents=True,exist_ok=True)
inputs=[]
for cid,folder in [('linxu','linxu-motion-lab'),('military','resistance-motion-lab'),('vest','resistance-motion-lab')]:
 d=root/'web/motion-labs'/folder/'assets'
 character=d/f'{cid}_fixed.glb' if cid in ['diandian','zhigeng'] else d/'characters'/cid/'character.glb'
 anim=d/'refined_equipped/equipped_motions.glb' if cid in ['diandian','zhigeng'] else root/'assets/characters/weapon_update_v6'/cid/'equipped_motions.glb'
 inputs.append({'cid':cid,'character':str(character),'animations':str(anim)})
paths=[pathlib.Path(i[k]) for i in inputs for k in ['character','animations']]
fp=lambda p:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size_bytes':p.stat().st_size}
before={str(p):fp(p) for p in paths};started=datetime.datetime.now(datetime.timezone.utc).isoformat()
script=r'''extends SceneTree
func find_kind(node: Node, kind: String) -> Node:
 if node.is_class(kind):
  return node
 for child in node.get_children():
  var found = find_kind(child, kind)
  if found != null:
   return found
 return null
func load_gltf(file: String) -> Node:
 var doc = GLTFDocument.new()
 var state = GLTFState.new()
 if doc.append_from_file(file, state) != OK:
  return null
 return doc.generate_scene(state, 240)
func finite_vec(v: Vector3) -> bool:
 return is_finite(v.x) and is_finite(v.y) and is_finite(v.z)
func finite_quat(v: Quaternion) -> bool:
 return is_finite(v.x) and is_finite(v.y) and is_finite(v.z) and is_finite(v.w)
func _initialize() -> void:
 call_deferred("run_test")
func run_test() -> void:
 var inputs = JSON.parse_string(FileAccess.get_file_as_string("res://inputs.json"))
 var report = {"passed":true,"import_bake_fps":240,"engine":Engine.get_version_info(),"phases":[0.0,0.25,0.5,0.75,0.99999],"characters":[]}
 for item in inputs:
  var character = load_gltf(item.character)
  var pack = load_gltf(item.animations)
  var row = {"cid":item.cid,"passed":true,"animations":[],"mapping_failures":[],"independent_samples":[],"max_playback_error":0.0,"bone_count":0}
  report.characters.append(row)
  if character == null or pack == null:
   row.passed=false
   report.passed=false
   continue
  root.add_child(character)
  var skeleton = find_kind(character,"Skeleton3D") as Skeleton3D
  var source_player = find_kind(pack,"AnimationPlayer") as AnimationPlayer
  if skeleton == null or source_player == null:
   row.passed=false
   report.passed=false
   character.free()
   pack.free()
   continue
  row.bone_count=skeleton.get_bone_count()
  var names = {}
  for bone in range(skeleton.get_bone_count()):
   names[skeleton.get_bone_name(bone)]=bone
  row.bone_names=names.keys()
  var player = AnimationPlayer.new()
  player.name="IsolatedSkeletonPlaybackQA"
  character.add_child(player)
  player.root_node=NodePath("..")
  player.callback_mode_process=AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
  var library=AnimationLibrary.new()
  player.add_animation_library("qa",library)
  var skeleton_path=character.get_path_to(skeleton)
  for anim_name in source_player.get_animation_list():
   var source=source_player.get_animation(anim_name)
   var mapped=source.duplicate(true) as Animation
   var ar={"name":str(anim_name),"tracks":source.get_track_count(),"mapped_tracks":0,"samples":0,"max_error":0.0,"max_change_from_rest":0.0,"failures":[]}
   row.animations.append(ar)
   var bone_ids=[]
   for track in range(mapped.get_track_count()):
    var old_path=mapped.track_get_path(track)
    var leaf=String(old_path.get_name(old_path.get_name_count()-1))
    var bone=skeleton.find_bone(leaf)
    if bone < 0:
     ar.failures.append({"track":track,"path":str(old_path),"reason":"No exact matching Skeleton3D bone name"})
     bone_ids.append(-1)
     continue
    var typ=mapped.track_get_type(track)
    if typ not in [Animation.TYPE_POSITION_3D,Animation.TYPE_ROTATION_3D,Animation.TYPE_SCALE_3D]:
     ar.failures.append({"track":track,"reason":"Unsupported non-transform track","type":typ})
    mapped.track_set_path(track,NodePath(str(skeleton_path)+":"+skeleton.get_bone_name(bone)))
    bone_ids.append(bone)
    ar.mapped_tracks+=1
   if not ar.failures.is_empty():
    row.mapping_failures.append({"animation":str(anim_name),"failures":ar.failures})
    row.passed=false
    report.passed=false
    continue
   mapped.loop_mode=Animation.LOOP_NONE
   library.add_animation(anim_name,mapped)
   for phase in report.phases:
    skeleton.reset_bone_poses()
    player.play("qa/"+str(anim_name))
    var time=source.length*phase
    player.seek(time,true)
    player.advance(0)
    skeleton.force_update_all_bone_transforms()
    for track in range(mapped.get_track_count()):
     var bone=bone_ids[track]
     var typ=source.track_get_type(track)
     var error=0.0
     if typ==Animation.TYPE_POSITION_3D:
      var expected=source.position_track_interpolate(track,time)
      var actual=skeleton.get_bone_pose_position(bone)
      if not finite_vec(actual):
       error=INF
      else:
       error=actual.distance_to(expected)
     elif typ==Animation.TYPE_ROTATION_3D:
      var expected=source.rotation_track_interpolate(track,time)
      var actual=skeleton.get_bone_pose_rotation(bone)
      if not finite_quat(actual):
       error=INF
      else:
       error=min((Vector4(actual.x,actual.y,actual.z,actual.w)-Vector4(expected.x,expected.y,expected.z,expected.w)).length(),(Vector4(actual.x,actual.y,actual.z,actual.w)+Vector4(expected.x,expected.y,expected.z,expected.w)).length())
     elif typ==Animation.TYPE_SCALE_3D:
      var expected=source.scale_track_interpolate(track,time)
      var actual=skeleton.get_bone_pose_scale(bone)
      if not finite_vec(actual):
       error=INF
      else:
       error=actual.distance_to(expected)
     var bn=skeleton.get_bone_name(bone)
     if phase in [0.25,0.5,0.75] and (bn.ends_with("Hips") or bn.ends_with("RightHand") or bn.ends_with("LeftHand")):
      var value: Array=[]
      var property=""
      if typ==Animation.TYPE_ROTATION_3D:
       var q=skeleton.get_bone_pose_rotation(bone)
       value=[q.x,q.y,q.z,q.w]
       property="rotation"
      elif typ==Animation.TYPE_POSITION_3D:
       var v=skeleton.get_bone_pose_position(bone)
       value=[v.x,v.y,v.z]
       property="translation"
      elif typ==Animation.TYPE_SCALE_3D:
       var v=skeleton.get_bone_pose_scale(bone)
       value=[v.x,v.y,v.z]
       property="scale"
      row.independent_samples.append({"animation":str(anim_name),"bone":str(bn),"property":property,"time":time,"actual":value})
     ar.max_error=max(ar.max_error,error)
     if error > 0.0001:
      ar.failures.append({"track":track,"bone":skeleton.get_bone_name(bone),"phase":phase,"error":error})
    for bone in range(skeleton.get_bone_count()):
     var pose=skeleton.get_bone_pose(bone)
     var global_pose=skeleton.get_bone_global_pose(bone)
     if not pose.is_finite() or not global_pose.is_finite():
      ar.failures.append({"bone":bone,"phase":phase,"reason":"Nonfinite local/global skeleton pose"})
     ar.max_change_from_rest=max(ar.max_change_from_rest,(pose.origin-skeleton.get_bone_rest(bone).origin).length(),(pose.basis.x-skeleton.get_bone_rest(bone).basis.x).length(),(pose.basis.y-skeleton.get_bone_rest(bone).basis.y).length(),(pose.basis.z-skeleton.get_bone_rest(bone).basis.z).length())
    ar.samples+=1
   player.stop()
   row.max_playback_error=max(row.max_playback_error,ar.max_error)
   if not ar.failures.is_empty() or ar.max_change_from_rest<=0.000001:
    row.passed=false
    report.passed=false
  character.free()
  pack.free()
 FileAccess.open("res://report.json",FileAccess.WRITE).store_string(JSON.stringify(report,"  "))
 quit(0 if report.passed else 1)
'''
def read_raw_glb(file):
 data=pathlib.Path(file).read_bytes();n=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+n]);blob=data[28+n:]
 def accessor(index):
  a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
  assert a['componentType']==5126 and not a.get('sparse'), 'Unsupported raw accessor'
  stride=v.get('byteStride',count*4);start=v.get('byteOffset',0)+a.get('byteOffset',0)
  return [list(struct.unpack_from('<'+'f'*count,blob,start+i*stride)) for i in range(a['count'])]
 result={}
 for anim in g['animations']:
  channels={}
  for c in anim['channels']:
   sampler=anim['samplers'][c['sampler']];assert sampler.get('interpolation','LINEAR')=='LINEAR','Unsupported raw interpolation'
   name=g['nodes'][c['target']['node']]['name'].replace(':','_')
   channels[(name,c['target']['path'])]=([x[0] for x in accessor(sampler['input'])],accessor(sampler['output']))
  result[anim['name']]=channels
 return result

def interpolate(times,values,t,rotation):
 i=max(0,min(len(times)-1,bisect.bisect_right(times,t)-1));j=min(i+1,len(times)-1)
 w=0 if i==j else max(0,min(1,(t-times[i])/(times[j]-times[i])))
 a=values[i];b=values[j]
 if rotation:
  def norm(v):
   n=math.sqrt(sum(x*x for x in v));return [x/n for x in v]
  a=norm(a);b=norm(b);dot=sum(x*y for x,y in zip(a,b))
  if dot<0:b=[-x for x in b];dot=-dot
  if dot<0.9995:
   theta=math.acos(min(1,dot));left=math.sin((1-w)*theta)/math.sin(theta);right=math.sin(w*theta)/math.sin(theta)
   return [left*x+right*y for x,y in zip(a,b)]
  return norm([(1-w)*x+w*y for x,y in zip(a,b)])
 return [(1-w)*x+w*y for x,y in zip(a,b)]

with tempfile.TemporaryDirectory(prefix='weapon-skeleton-qa-') as tmp:
 t=pathlib.Path(tmp);(t/'project.godot').write_text('[application]\nconfig/name="Isolated skeleton QA"\n[rendering]\nrenderer/rendering_method="gl_compatibility"\n')
 (t/'test.gd').write_text(script);(t/'inputs.json').write_text(json.dumps(inputs))
 proc=subprocess.run(['/usr/local/bin/godot','--headless','--path',tmp,'--script','test.gd'],capture_output=True,text=True,timeout=180,env=dict(os.environ,HOME=tmp,XDG_DATA_HOME=tmp+'/data',XDG_CONFIG_HOME=tmp+'/config',XDG_CACHE_HOME=tmp+'/cache'))
 (out/'stdout.log').write_text(proc.stdout);(out/'stderr.log').write_text(proc.stderr)
 if not (t/'report.json').exists():print(proc.stdout,proc.stderr);raise SystemExit(proc.returncode or 1)
 r=json.loads((t/'report.json').read_text());r['started_at_utc']=started;r['completed_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();r['inputs']=[{'path':str(p.relative_to(root)),**before[str(p)],'unchanged_during_test':before[str(p)]==fp(p)} for p in paths]
 for c,item in zip(r['characters'],inputs):
  raw=read_raw_glb(item['animations']);errors=[];maximum=0
  for sample in c['independent_samples']:
   track=raw.get(sample['animation'],{}).get((sample['bone'],sample['property']))
   if track is None:errors.append({'sample':sample,'reason':'No exact source GLTF channel'});continue
   expected=interpolate(*track,sample['time'],sample['property']=='rotation');actual=sample['actual']
   error=math.sqrt(sum((a-b)**2 for a,b in zip(actual,expected)))
   if sample['property']=='rotation':error=min(error,math.sqrt(sum((a+b)**2 for a,b in zip(actual,expected))))
   maximum=max(maximum,error)
   if error>0.0001:errors.append({'sample':sample,'expected':expected,'error':error})
  c['independent_gltf_comparison']={'samples':len(c['independent_samples']),'max_error':maximum,'tolerance':0.0001,'failures':errors,'passed':not errors and bool(c['independent_samples'])}
  if not c['independent_gltf_comparison']['passed']:r['passed']=False
 r['scope']='Isolated native Godot exact-name bone-track remapping and AnimationPlayer seek/advance playback. Native imported-track interpolation comparison plus independent raw GLTF accessor interpolation for Hips/LeftHand/RightHand at 25/50/75 percent of every clip (linear vectors and quaternion slerp). Not production-controller or visual acceptance. No game/controller integration is performed.'
 r['process_exit_code']=proc.returncode;r['passed']=r['passed'] and proc.returncode==0 and 'ERROR:' not in proc.stderr and all(i['unchanged_during_test'] for i in r['inputs'])
 (out/'summary.json').write_text(json.dumps(r,indent=2,ensure_ascii=False)+'\n');print(json.dumps({'passed':r['passed'],'characters':[{k:c[k] for k in ['cid','passed','bone_count','max_playback_error']} for c in r['characters']],'report':str(out/'summary.json')}));raise SystemExit(0 if r['passed'] else 1)

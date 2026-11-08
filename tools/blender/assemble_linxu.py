"""Assemble the three user GLBs; retain the body bind pose and transplant Diandian's facial rig.
Run: blender -b -t 6 --python tools/blender/assemble_linxu.py
"""
import bpy,bmesh,math,json,hashlib,numpy as np
from pathlib import Path
from collections import defaultdict
from mathutils import Vector,Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/characters/linxu';WORK=ROOT/'work/linxu';WORK.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene;sc.render.fps=30
REPORT={'revision':1,'blender':bpy.app.version_string,'head_uniform_scale':.13,'head_translation':[0,.008,.865],'hair_uniform_scale':.14,'hair_translation':[0,.009,.878]}
HSHIFT=Vector(REPORT['head_translation']);DORIGIN=Vector((.0012,.0773,.875));SCALE=.13/.125

def load(path):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));obs=[o for o in set(bpy.data.objects)-before if not (o.type=='MESH' and len(o.data.vertices)<100)];
 for o in obs:
  if o.type=='ARMATURE':o.animation_data_clear();o.data.pose_position='REST'
 return obs

def apply(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

def bounds(o):
 return [[min(v.co[i] for v in o.data.vertices) for i in range(3)],[max(v.co[i] for v in o.data.vertices) for i in range(3)]]

def comps(bm):
 seen=set();ret=[]
 for v in bm.verts:
  if v in seen:continue
  stack=[v];seen.add(v);c=[]
  while stack:
   q=stack.pop();c.append(q)
   for e in q.link_edges:
    z=e.other_vert(q)
    if z not in seen:seen.add(z);stack.append(z)
  ret.append(c)
 return ret

def ordered_loop(edges):
 adj=defaultdict(list)
 for e in edges:
  a,b=e.verts;adj[a].append(b);adj[b].append(a)
 assert all(len(n)==2 for n in adj.values()),'Non-manifold neck boundary'
 start=min(adj,key=lambda v:math.atan2(v.co.y-.02,v.co.x));order=[start];prev=None;cur=start
 while True:
  nxt=next(v for v in adj[cur] if v!=prev)
  if nxt==start:break
  order.append(nxt);prev,cur=cur,nxt
  assert len(order)<=len(adj)
 assert len(order)==len(adj),'Multiple neck loops'
 # consistent counterclockwise in XY
 area=sum(a.co.x*b.co.y-b.co.x*a.co.y for a,b in zip(order,order[1:]+order[:1]))
 if area<0:order.reverse()
 return order

def image_sample(mesh,vertex):
 loops=[l for p in mesh.data.polygons for l in p.loop_indices if mesh.data.loops[l].vertex_index==vertex]
 if not loops:return (.5,.3,.2)
 uv=mesh.data.uv_layers.active.data[loops[0]].uv
 image=next(n.image for n in mesh.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
 key=image.name
 if key not in PIXELS:PIXELS[key]=np.array(image.pixels[:],dtype=float).reshape(image.size[1],image.size[0],4)
 a=PIXELS[key];return a[min(a.shape[0]-1,max(0,int(uv.y*a.shape[0]))),min(a.shape[1]-1,max(0,int(uv.x*a.shape[1])))][:3]
PIXELS={}
body_obs=load(OUT/'source/linxu body.glb');arm=next(o for o in body_obs if o.type=='ARMATURE');body=next(o for o in body_obs if o.type=='MESH');arm.name='Linxu_Rig';body.name='Linxu_Body';apply(body)
body_bones={b.name:[list(r) for r in b.matrix_local] for b in arm.data.bones}
head=next(o for o in load(OUT/'source/linxu head.glb.glb') if o.type=='MESH');head.name='Linxu_HighPrecisionHead';apply(head)
for v in head.data.vertices:v.co=v.co*.13+HSHIFT
hair=next(o for o in load(OUT/'source/linxu hair.glb') if o.type=='MESH');hair.name='Linxu_Hair';apply(hair)
for v in hair.data.vertices:v.co=v.co*.14+Vector(REPORT['hair_translation'])
REPORT['source_head_vertices']=len(head.data.vertices);REPORT['head_bounds']=bounds(head)
# Find the independent skin component; retain clothing and hands without cutting the collar.
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
cc=comps(bm);skin=max((c for c in cc if max(v.co.z for v in c)>.99),key=len)
oldparts=[v for c in cc if c is not skin and min(v.co.z for v in c)>.875 for v in c]
bmesh.ops.delete(bm,geom=oldparts,context='VERTS')
edges=set(e for v in skin for e in v.link_edges);faces=set(f for v in skin for f in v.link_faces)
cut=.854
bmesh.ops.bisect_plane(bm,geom=list(skin)+list(edges)+list(faces),dist=1e-8,plane_co=(0,0,cut),plane_no=(0,0,1),clear_outer=True)
lower=ordered_loop([e for e in bm.edges if e.is_boundary and all(abs(v.co.z-cut)<1e-6 for v in e.verts)])
bm.verts.index_update();lower_ids=[v.index for v in lower];bm.to_mesh(body.data);bm.free();body.data.update()
REPORT['neck_lower_ring']=len(lower_ids);REPORT['old_head_removed']=True
# Open a socket strictly underneath the cranium, behind the original chin.
bm=bmesh.new();bm.from_mesh(head.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-5);bm.normal_update()
def socket(f):
 p=f.calc_center_median();return (p.x/.024)**2+((p.y-.026)/.024)**2<1 and p.z<.925 and f.normal.z<.15
REPORT['head_original_boundary_edges']=sum(e.is_boundary for e in bm.edges)
pre_boundary=set(e for e in bm.edges if e.is_boundary)
removed=[f for f in bm.faces if socket(f)];bmesh.ops.delete(bm,geom=removed,context='FACES');bm.verts.ensure_lookup_table();bm.normal_update()
# Remove single-vertex pinches at the rasterized socket boundary.
for _ in range(12):
 bad=[v for v in bm.verts if sum(e.is_boundary and e not in pre_boundary for e in v.link_edges)>2]
 if not bad:break
 extra=list(set(f for v in bad for f in v.link_faces));bmesh.ops.delete(bm,geom=extra,context='FACES')
print('SOCKET_BOUNDARY',REPORT['head_original_boundary_edges'],sum(e.is_boundary for e in bm.edges))
(WORK/'socket-boundary.json').write_text(json.dumps([{'old':e in pre_boundary,'a':list(e.verts[0].co),'b':list(e.verts[1].co)} for e in bm.edges if e.is_boundary]))
# The uploaded head has an open underside already. Include that existing
# socket boundary, while keeping separate mouth/eye scan boundaries untouched.
socket_edges=set(e for e in bm.edges if e.is_boundary and e not in pre_boundary)
socket_vertices=set(v for e in socket_edges for v in e.verts)
for _ in range(1000):
 extra=set(e for v in socket_vertices for e in v.link_edges if e.is_boundary)-socket_edges
 if not extra:break
 socket_edges.update(extra);socket_vertices.update(v for e in extra for v in e.verts)
edge_parts=[];remaining=set(socket_edges)
while remaining:
 part={remaining.pop()};vs=set(v for e in part for v in e.verts)
 while True:
  extra=set(e for v in vs for e in v.link_edges if e in remaining)
  if not extra:break
  remaining.difference_update(extra);part.update(extra);vs.update(v for e in extra for v in e.verts)
 edge_parts.append(part)
main=max(edge_parts,key=len)
for part in edge_parts:
 if part is not main:bmesh.ops.holes_fill(bm,edges=list(part),sides=0)
upper=ordered_loop(list(main));bm.verts.index_update();upper_ids=[v.index for v in upper];bm.to_mesh(head.data);bm.free();head.data.update();REPORT['neck_upper_ring']=len(upper_ids)
# Import facial donor and fit bone positions to the new surface without distorting the head.
donor_obs=load(ROOT/'assets/characters/diandian_classic/diandian_classic_fixed.glb');da=next(o for o in donor_obs if o.type=='ARMATURE');dm=next(o for o in donor_obs if o.type=='MESH' and len(o.data.vertices)>30000)
face_names={b.name for b in da.data.bones if b.name.startswith('XQ_') or b.name=='DD_Jaw_CTRL'}
head.data.calc_loop_triangles();newbvh=BVHTree.FromPolygons([v.co for v in head.data.vertices],[t.vertices[:] for t in head.data.loop_triangles],all_triangles=True)
def coarse(p):return (p-DORIGIN)*SCALE+HSHIFT
# Retain anatomical axes; relocate surface controls to Linxu's own facial surface.
def fit(p,name):
 q=coarse(p)
 if name=='DD_Jaw_CTRL':return q
 hit=newbvh.find_nearest(q)
 return hit[0] if hit and hit[0] is not None and hit[3]<.025 else q
bone_rows=[]
for b in da.data.bones:
 if b.name not in face_names:continue
 p=da.matrix_world@b.head_local;t=da.matrix_world@b.tail_local;h=fit(p,b.name);tail=h+(t-p)*SCALE
 name='LX_Jaw_CTRL' if b.name=='DD_Jaw_CTRL' else b.name;parent=b.parent.name if b.parent else 'mixamorig:Head';parent='LX_Jaw_CTRL' if parent=='DD_Jaw_CTRL' else parent
 zaxis=arm.matrix_world.to_quaternion().inverted()@da.matrix_world.to_quaternion()@b.matrix_local.to_quaternion()@Vector((0,0,1))
 bone_rows.append((name,parent,arm.matrix_world.inverted()@h,arm.matrix_world.inverted()@tail,zaxis))
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
for name,parent,h,t,zaxis in bone_rows:
 b=arm.data.edit_bones.new(name);b.head=h;b.tail=t;b.align_roll(zaxis);b.use_deform=True
for name,parent,h,t,zaxis in bone_rows:arm.data.edit_bones[name].parent=arm.data.edit_bones.get(parent,arm.data.edit_bones['mixamorig:Head'])
bpy.ops.object.mode_set(mode='OBJECT')
# Smoothly transfer donor head influences, excluding torso and neck groups.
valid=face_names|{'mixamorig:Head'};donor_points=[];donor_weights=[]
for v in dm.data.vertices:
 p=dm.matrix_world@v.co
 weights={dm.vertex_groups[g.group].name:g.weight for g in v.groups if dm.vertex_groups[g.group].name in valid and g.weight>0}
 if p.z<.8748 or sum(weights.values())<.95:continue
 donor_points.append(coarse(p));donor_weights.append(weights)
kd=KDTree(len(donor_points))
for i,p in enumerate(donor_points):kd.insert(p,i)
kd.balance()
for name in sorted(valid):head.vertex_groups.new(name='LX_Jaw_CTRL' if name=='DD_Jaw_CTRL' else name)
for v in head.data.vertices:
 found=kd.find_n(v.co,4);acc=defaultdict(float)
 for _,idx,d in found:
  factor=1/max(d,.00015)**2
  for name,w in donor_weights[idx].items():acc['LX_Jaw_CTRL' if name=='DD_Jaw_CTRL' else name]+=w*factor
 ranked=sorted(acc.items(),key=lambda x:x[1],reverse=True)[:4];total=sum(w for _,w in ranked)
 for name,w in ranked:head.vertex_groups[name].add([v.index],w/total,'REPLACE')
head.parent=arm;head.matrix_parent_inverse=arm.matrix_world.inverted();mod=head.modifiers.new('Linxu_FacialSkin','ARMATURE');mod.object=arm
hair.vertex_groups.new(name='mixamorig:Head').add(list(range(len(hair.data.vertices))),1,'REPLACE');hair.parent=arm;hair.matrix_parent_inverse=arm.matrix_world.inverted();mod=hair.modifiers.new('Linxu_HairSkin','ARMATURE');mod.object=arm
# Fit the supplied hair around the unchanged head surface. Spread displacement
# over neighboring vertices to preserve strand volumes and remove sharp folds.
original=[v.co.copy() for v in hair.data.vertices];adj=[set() for _ in original]
for e in hair.data.edges:
 a,b=e.vertices;adj[a].add(b);adj[b].add(a)
displacement=[Vector((0,0,0)) for _ in original];penetrations=[]
for i,p in enumerate(original):
 hit=newbvh.find_nearest(p)
 if hit and hit[0] is not None:
  signed=(p-hit[0]).dot(hit[1])
  if signed<.0008:
   displacement[i]=hit[1]*(.0008-signed)
   if signed<-.0001:penetrations.append(-signed)
for _ in range(8):
 displacement=[d*.55+sum((displacement[j] for j in adj[i]),Vector())*(.45/len(adj[i])) if adj[i] else d for i,d in enumerate(displacement)]
for i,v in enumerate(hair.data.vertices):
 v.co=original[i]+displacement[i]
 for _ in range(3):
  hit=newbvh.find_nearest(v.co)
  if not hit or hit[0] is None:break
  signed=(v.co-hit[0]).dot(hit[1])
  if signed>=.0008:break
  v.co+=hit[1]*(.00082-signed)
hair.data.update()
REPORT['hair_fit']={'source_vertices_inside_head':len(penetrations),'source_max_penetration_native_m':max(penetrations,default=0),'max_hair_vertex_correction_native_m':max((v.co-original[i]).length for i,v in enumerate(hair.data.vertices)),'strand_clearance_native_m':.0008}
# A close-fitting root cap fills gaps between separate locks without changing
# the source head. It sits below the fitted locks and follows Head rigidly.
head.data.calc_loop_triangles();selected=[]
for tri in head.data.loop_triangles:
 p=sum((head.data.vertices[i].co for i in tri.vertices),Vector())/3
 rear=max(0,min(1,(p.y-.005)/.04));side=max(0,min(1,(abs(p.x)-.024)/.025))
 line=.959-.05*rear-.012*side
 if p.z>line:selected.append(tri.vertices[:])
used=sorted(set(i for t in selected for i in t));remap={v:i for i,v in enumerate(used)}
cap_mesh=bpy.data.meshes.new('Linxu_HairRoots');cap_mesh.from_pydata([head.data.vertices[i].co+head.data.vertices[i].normal*.00025 for i in used],[],[[remap[i] for i in tri] for tri in selected]);cap_mesh.update()
cap=bpy.data.objects.new('Linxu_HairRoots',cap_mesh);sc.collection.objects.link(cap)
uv=cap_mesh.uv_layers.new(name='UVMap')
for poly in cap_mesh.polygons:
 coords=[]
 for li in poly.loop_indices:
  p=cap_mesh.vertices[cap_mesh.loops[li].vertex_index].co;coords.append(((math.atan2(p.y-.008,p.x)/(2*math.pi))%1,(p.z-.89)/.12))
 if max(p[0] for p in coords)-min(p[0] for p in coords)>.5:coords=[(u+1 if u<.5 else u,v) for u,v in coords]
 for li,p in zip(poly.loop_indices,coords):uv.data[li].uv=p
 poly.use_smooth=True
rng=np.random.default_rng(48);w=h=512;noise=rng.random((h,w))*.06;streak=rng.random(w)*.035
rgb=np.array([.115,.082,.060])[None,None,:]*(.85+noise[:,:,None]+streak[None,:,None]);pixels=np.ones((h,w,4));pixels[:,:,:3]=rgb
im=bpy.data.images.new('Linxu_HairRoots_Color',width=w,height=h);im.pixels[:]=pixels.reshape(-1).tolist();im.pack();mat=bpy.data.materials.new('Linxu_HairRoots_Material');mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.88;cap_mesh.materials.append(mat)
cap.vertex_groups.new(name='mixamorig:Head').add(list(range(len(cap_mesh.vertices))),1,'REPLACE');cap.parent=arm;cap.matrix_parent_inverse=arm.matrix_world.inverted()
for obj,region in [(hair,0),(cap,1)]:
 attr=obj.data.attributes.new('linxu_hair_part','INT','POINT')
 for item in attr.data:item.value=region
bpy.ops.object.select_all(action='DESELECT');hair.select_set(True);cap.select_set(True);bpy.context.view_layer.objects.active=hair;bpy.ops.object.join()
REPORT['hair_root_cap_vertices']=len(used)

REPORT['facial_bones']=len(face_names);REPORT['body_bones']=len(body_bones);REPORT['donor_head_samples']=len(donor_points)
# Build a continuous interpolated neck, with shared geometric seam vertices after joining.
low=[body.data.vertices[i].co.copy() for i in lower_ids];up=[head.data.vertices[i].co.copy() for i in upper_ids]
# Rotate each boundary to the left-back quadrant so the texture seam is hidden.
def rotate_ring(points,ids):
 i=min(range(len(points)),key=lambda i:math.atan2(points[i].y-.026,points[i].x));return points[i:]+points[:i],ids[i:]+ids[:i]
low,lower_ids=rotate_ring(low,lower_ids);up,upper_ids=rotate_ring(up,upper_ids)
def params(ps):
 lengths=[(ps[(i+1)%len(ps)]-p).length for i,p in enumerate(ps)];total=sum(lengths);ret=[0]
 for d in lengths:ret.append(ret[-1]+d/total)
 return ret
lp=params(low);up_p=params(up)
def interp(ps,par,u):
 j=next((i for i in range(len(ps)) if par[i+1]>=u),len(ps)-1);t=(u-par[j])/max(par[j+1]-par[j],1e-12);return ps[j].lerp(ps[(j+1)%len(ps)],t)
n=len(up);rings=10;verts=low[:];indices=[list(range(len(low)))];uvs=[]
for r in range(1,rings+1):
 t=r/rings;ease=t*t*(3-2*t);ids=[]
 for j,p in enumerate(up):
  ids.append(len(verts));a=interp(low,lp,up_p[j]);q=a.lerp(p,ease);q.z=a.z+(p.z-a.z)*t;verts.append(q)
 indices.append(ids)
faces=[];faceuv=[]
# zipper original lower ring and first resampled ring, each original edge used once.
a=b=0
while a<len(low) or b<n:
 an=lp[a+1] if a<len(low) else 2;bn=up_p[b+1] if b<n else 2
 if an<bn:
  faces.append((indices[0][a%len(low)],indices[0][(a+1)%len(low)],indices[1][b%n]));faceuv.append(((lp[a],0),(lp[a+1],0),(up_p[b],1/rings)));a+=1
 else:
  faces.append((indices[0][a%len(low)],indices[1][(b+1)%n],indices[1][b%n]));faceuv.append(((lp[a],0),(up_p[b+1],1/rings),(up_p[b],1/rings)));b+=1
for r in range(1,rings):
 for j in range(n):
  k=(j+1)%n;faces.append((indices[r][j],indices[r][k],indices[r+1][k],indices[r+1][j]));faceuv.append(((up_p[j],r/rings),(up_p[j+1],r/rings),(up_p[j+1],(r+1)/rings),(up_p[j],(r+1)/rings)))
mesh=bpy.data.meshes.new('Linxu_NeckTransition');mesh.from_pydata(verts,[],faces);mesh.update();bridge=bpy.data.objects.new('Linxu_NeckTransition',mesh);sc.collection.objects.link(bridge)
uv=mesh.uv_layers.new(name='UVMap')
for p,coords in zip(mesh.polygons,faceuv):
 for li,v in zip(p.loop_indices,coords):uv.data[li].uv=v
# Sample both original textures around the seam, preserving their local colors.
low_colors=[Vector(image_sample(body,i)) for i in lower_ids];up_colors=[Vector(image_sample(head,i)) for i in upper_ids]
w,h=512,128;pixels=[]
for yy in range(h):
 t=yy/(h-1);s=t*t*(3-2*t)
 for xx in range(w):
  u=xx/(w-1);c=interp(low_colors,lp,u).lerp(interp(up_colors,up_p,u),s);pixels.extend((*c,1))
im=bpy.data.images.new('Linxu_Neck_ColorBlend',width=w,height=h);im.pixels[:]=pixels;im.pack();mat=bpy.data.materials.new('Linxu_Neck_Skin');mat.use_nodes=True;nt=mat.node_tree;tex=nt.nodes.new('ShaderNodeTexImage');tex.image=im;nt.links.new(tex.outputs['Color'],nt.nodes.get('Principled BSDF').inputs['Base Color']);nt.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.73;mesh.materials.append(mat)
for name in set(g.name for g in body.vertex_groups)|set(g.name for g in head.vertex_groups):bridge.vertex_groups.new(name=name)
def weights(obj,i):return {obj.vertex_groups[g.group].name:g.weight for g in obj.data.vertices[i].groups}
def low_weight(u):
 j=next((i for i in range(len(low)) if lp[i+1]>=u),len(low)-1);t=(u-lp[j])/max(lp[j+1]-lp[j],1e-12);out=defaultdict(float)
 for vi,f in [(lower_ids[j],1-t),(lower_ids[(j+1)%len(low)],t)]:
  for name,v in weights(body,vi).items():out[name]+=v*f
 return out
for j,idx in enumerate(indices[0]):
 for name,v in weights(body,lower_ids[j]).items():bridge.vertex_groups[name].add([idx],v,'REPLACE')
for r in range(1,rings+1):
 t=r/rings;s=t*t*(3-2*t)
 for j,idx in enumerate(indices[r]):
  acc=defaultdict(float)
  for name,v in low_weight(up_p[j]).items():acc[name]+=v*(1-s)
  for name,v in weights(head,upper_ids[j]).items():acc[name]+=v*s
  best=sorted(acc.items(),key=lambda x:-x[1])[:4];total=sum(v for _,v in best)
  for name,v in best:bridge.vertex_groups[name].add([idx],v/total,'REPLACE')
bridge.parent=arm;bridge.matrix_parent_inverse=arm.matrix_world.inverted();mod=bridge.modifiers.new('Linxu_NeckSkin','ARMATURE');mod.object=arm
# Region tags retained in the Blender project for verification.
for obj,region in [(body,0),(head,1),(bridge,2)]:
 attribute=obj.data.attributes.new('linxu_region','INT','POINT')
 for item in attribute.data:item.value=region
REPORT['neck_seam_positions']=[list(p) for p in low+up]
# Join body, neck and head. Only exact seam duplicates are welded.
bpy.ops.object.select_all(action='DESELECT')
for o in [body,head,bridge]:o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body.name='Linxu_Body_HighPrecisionHead'
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free();body.data.update()
for p in body.data.polygons:p.use_smooth=True
for o in donor_obs:bpy.data.objects.remove(o,do_unlink=True)
# Pack original textures and expose facial collections with a usable jaw control.
for im in bpy.data.images:
 if im.size[0]>0 and not im.packed_file:
  try:im.pack()
  except:pass
arm.data.pose_position='POSE';arm['facial_rig_source']='Diandian classic / 246 XQ bones + jaw; fitted to Linxu';arm['native_height_units']='about 1 metre; uniform placement scale only'
facecol=arm.data.collections.new('Face • transferred and fitted');bodycol=arm.data.collections.new('Body • original bind pose')
for b in arm.data.bones:(facecol if b.name.startswith('XQ_') or b.name=='LX_Jaw_CTRL' else bodycol).assign(b)
REPORT['body_rest_matrix_max_difference']=max(abs(v-body_bones[name][i][j]) for name in body_bones for i,row in enumerate(arm.data.bones[name].matrix_local) for j,v in enumerate(row))
REPORT['final_body_vertices']=len(body.data.vertices);REPORT['final_hair_vertices']=len(hair.data.vertices)
# The user requested neutral character assembly first; no facial clips are authored.
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
arm.animation_data_clear()
for pb in arm.pose.bones:pb.rotation_mode='QUATERNION';pb.matrix_basis=Matrix.Identity(4)
sc.frame_set(1);bpy.context.view_layer.update()
for o in bpy.data.objects:
 if o.type=='MESH' and o not in [body,hair]:o.hide_render=True
bpy.ops.object.select_all(action='DESELECT')
for o in [arm,body,hair]:o.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'linxu_assembled.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'linxu_assembled.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_all_influences=False)
(OUT/'assembly_report.json').write_text(json.dumps(REPORT,indent=2)+'\n');print('LINXU_REPORT',json.dumps(REPORT))

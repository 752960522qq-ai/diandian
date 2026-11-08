// Preserve uploaded geometry/rigs while adding a project-scale root transform.
import fs from 'node:fs';
import * as T from 'three';
import {decode,encode,read} from '../qa/validate_pf89.mjs';

const definitions=[
 {id:'qjz89',source:'assets/weapons/source/qjz89_source.glb',output:'assets/weapons/qjz89.glb',scale:1.64/(.488740473985672+.4929514527320862),origin:[.283,.330,0],kind:'fixed_machine_gun',dimensionsPolicy:'User-specified gun-body length: 1640 mm from muzzle to stock; exclude the rear tripod foot, preserve uploaded proportions.',anchors:{right_grip:[.308,.307,-.012],left_grip:[.399,.422,.002],trigger:[.256,.342,0],muzzle:[-.4929514527320862,.401,0],stock_top:[.399,.422,.002],butt_contact:[.488740473985672,.381,.001]}},
 {id:'type59d',source:'assets/vehicles/type59d/source/59d_rigged_v3.glb',output:'assets/vehicles/type59d/type59d.glb',scale:9.2/.9990422166883945,origin:[0,.003820999595981839,0],kind:'unmanned_tank',dimensionsPolicy:'User-specified total length including the cannon: 9200 mm. Preserve uploaded proportions and all rig animations.',anchors:{}}
];
for(const definition of definitions){
 const {g,bin}=decode(definition.source),rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-Math.PI/2);
 if(definition.id==='qjz89') {
  // Swing the floating rear support outward at its upper joint so it clears
  // the standing operator's thigh. Keep the original source file untouched.
  const source=await read(definition.source);source.scene.updateMatrixWorld(true);
  const leg=source.scene.getObjectByName('Base2_tripo_part_1'),pivot=new T.Vector3(.145,.29,0);
  const matrix=new T.Matrix4().makeTranslation(...pivot.toArray()).multiply(new T.Matrix4().makeRotationY(T.MathUtils.degToRad(42))).multiply(new T.Matrix4().makeTranslation(...pivot.clone().negate().toArray())).multiply(leg.matrixWorld);
  matrix.premultiply(leg.parent.matrixWorld.clone().invert());
  const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();matrix.decompose(p,q,s);
  const node=g.nodes.find(n=>n.name==='Base2_tripo_part_1');delete node.matrix;Object.assign(node,{translation:p.toArray(),rotation:q.toArray(),scale:s.toArray()});
  definition.rear_support={sourceNode:node.name,outward_degrees:42,pivot_source:pivot.toArray(),purpose:'Clear the standing operator; ground placement remains deferred.'};
 }
 const translation=new T.Vector3(...definition.origin).multiplyScalar(-definition.scale).applyQuaternion(rotation);
 const scene=g.scenes[g.scene||0],root=g.nodes.length;
 g.nodes.push({name:definition.id+'_ProjectRoot',children:scene.nodes,translation:translation.toArray(),rotation:rotation.toArray(),scale:[definition.scale,definition.scale,definition.scale]});scene.nodes=[root];
 const anchors=Object.fromEntries(Object.entries(definition.anchors).map(([key,v])=>[key,new T.Vector3(...v).multiplyScalar(definition.scale).applyQuaternion(rotation).add(translation).toArray()]));
 g.asset.extras={...g.asset.extras,project_asset_id:definition.id,role:definition.kind,normalization:definition.dimensionsPolicy,driver_required:false};
 fs.writeFileSync(definition.output,encode(g,bin));
 const report={...definition,rotation:rotation.toArray(),translation:translation.toArray(),anchors,sourceAnimations:g.animations?.map(a=>a.name)||[]};
 fs.writeFileSync(definition.output.replace('.glb','_report.json'),JSON.stringify(report,null,2)+'\n');
 const destinations=definition.id==='qjz89'
  ? ['diandian-classic-motion-lab','zhigeng-motion-lab'].map(folder=>`web/motion-labs/${folder}/assets/weapons/qjz89.glb`)
  : ['web/motion-labs/type59d-motion-lab/assets/type59d.glb'];
 for(const target of destinations){fs.mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});fs.copyFileSync(definition.output,target);}
 console.log('PREPARED',definition.id,JSON.stringify(anchors));
}

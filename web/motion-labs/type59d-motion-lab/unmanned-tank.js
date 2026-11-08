import * as THREE from 'three';

export const tankMotions=[
 {name:'TankIdle',label:'无人待机',duration:5,loop:true,clips:[]},
 {name:'TankTurretAim',label:'炮塔瞄准',duration:5,loop:true,clips:['Turret_Aim_Demo']},
 {name:'TankRecoil',label:'主炮后坐',duration:1,loop:false,clips:['Gun_Recoil']},
 {name:'TankMGAim',label:'车载机枪瞄准',duration:5,loop:true,clips:['MG_Aim_Demo']},
 {name:'TankTracks',label:'履带与车轮',duration:10,loop:true,clips:['Track_L_Cycle','Track_R_Cycle','Wheels_Forward_Loop']}
];

export class UnmannedTank {
 constructor(gltf,scene) {
  this.root=gltf.scene;this.root.name='Unmanned59D';this.root.visible=false;
  this.root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  scene.add(this.root);this.root.updateMatrixWorld(true);
  this.bounds=new THREE.Box3().setFromObject(this.root,true);
  this.mixer=new THREE.AnimationMixer(this.root);
  this.actions=new Map(gltf.animations.map(clip=>[clip.name,this.mixer.clipAction(clip)]));
  this.bones=[];this.root.traverse(o=>{if(o.isBone)this.bones.push(o);});
  this.setMotion('TankIdle');
 }
 setMotion(name) {
  this.motion=tankMotions.find(m=>m.name===name);if(!this.motion)throw Error('Unknown tank motion '+name);
  this.mixer.stopAllAction();
  this.active=this.motion.clips.map(name=>{const a=this.actions.get(name);if(!a)throw Error('Missing 59D animation '+name);a.reset().setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();return a;});
  this.evaluate(0);
 }
 evaluate(time) {
  this.time=time;
  for(const action of this.active){const d=action.getClip().duration;action.paused=false;action.enabled=true;action.time=this.motion.loop&&time< this.motion.duration ? time%d : Math.min(time,d);}
  this.mixer.update(0);this.root.updateMatrixWorld(true);
 }
 getState() {
  return {visible:this.root.visible,role:'unmanned',driverRequired:false,motion:this.motion.name,time:this.time,sourceClips:this.active.map(a=>a.getClip().name),boneCount:this.bones.length,bounds:{min:this.bounds.min.toArray(),max:this.bounds.max.toArray()}};
 }
}

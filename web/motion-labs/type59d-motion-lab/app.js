import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { UnmannedTank, tankMotions } from './unmanned-tank.js';

const $ = selector => document.querySelector(selector);
const state = {ready:false, playing:false, speed:1, time:0, motion:'TankIdle', angle:'front', error:null};
const stage=$('#stage'), scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas:$('#viewport'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const camera=new THREE.PerspectiveCamera(35,1,.1,180);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=55;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xf2f5ff,0x6d6967,2.5));
const key=new THREE.DirectionalLight(0xfff4e9,3.1);key.position.set(-8,14,-9);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:45});
key.shadow.bias=-.0001;key.shadow.normalBias=.025;scene.add(key);
const fill=new THREE.DirectionalLight(0xaec7ff,1);fill.position.set(10,6,8);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:0x55515c,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.015;ground.receiveShadow=true;scene.add(ground);
const ring=new THREE.Mesh(new THREE.RingGeometry(5.2,5.215,128),new THREE.MeshBasicMaterial({color:0xe0b3a0,transparent:true,opacity:.25,side:THREE.DoubleSide}));
ring.rotation.x=-Math.PI/2;ring.position.y=.002;scene.add(ring);
let tank;
const motion=()=>tankMotions.find(m=>m.name===state.motion);
function frameCamera(){
  if(!tank)return;
  const target=tank.bounds.getCenter(new THREE.Vector3()),size=tank.bounds.getSize(new THREE.Vector3());
  const span=Math.max(size.y,Math.max(size.x,size.z)/camera.aspect);
  const distance=span/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))+Math.max(size.x,size.z)*.4;
  const direction=state.angle==='side'?new THREE.Vector3(1,.3,0):state.angle==='back'?new THREE.Vector3(.8,.4,1):new THREE.Vector3(1,.4,-.8);
  controls.target.copy(target);camera.position.copy(target).addScaledVector(direction.normalize(),distance);controls.update();
}
function resize(){renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();frameCamera();}
new ResizeObserver(resize).observe(stage);resize();
function updateTimeline(){
  const duration=motion().duration;
  $('#timeline').max=duration;$('#timeline').value=state.time;
  $('#timeline').style.setProperty('--progress',`${state.time/duration*100}%`);
  $('#time-readout').textContent=`${state.time.toFixed(2)} / ${duration.toFixed(2)} s`;
}
function setPlaying(playing){
  if(playing&&state.time>=motion().duration&&!motion().loop){state.time=0;tank?.setMotion(state.motion);}
  state.playing=playing;
  $('#play-toggle').setAttribute('aria-label',playing?'暂停播放':'播放动作');
  $('#play-icon').innerHTML=playing?'<path d="M7 5h3v14H7zm7 0h3v14h-3z"/>':'<path d="m8 4 12 8-12 8z"/>';
}
function setMotion(name){
  if(!state.ready||!tankMotions.some(m=>m.name===name))return;
  state.motion=name;state.time=0;tank.setMotion(name);setPlaying(name!=='TankIdle');
  $('#current-motion').textContent=motion().label;$('#loop-label').textContent=motion().loop?'循环':'单次';
  for(const button of document.querySelectorAll('[data-motion]')){const active=button.dataset.motion===name;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);}
  updateTimeline();
}
for(const entry of tankMotions){const button=document.createElement('button');button.textContent=entry.label;button.dataset.motion=entry.name;button.disabled=true;button.type='button';button.addEventListener('click',()=>setMotion(entry.name));$('#motion-buttons').append(button);}
$('#play-toggle').addEventListener('click',()=>setPlaying(!state.playing));
$('#timeline').addEventListener('input',event=>{state.time=Number(event.target.value);tank?.evaluate(state.time);updateTimeline();});
$('#speed').addEventListener('input',event=>{state.speed=Number(event.target.value);$('#speed-label').textContent=`${state.speed.toFixed(2)}×`;});
$('#reset-camera').addEventListener('click',frameCamera);
for(const button of document.querySelectorAll('[data-angle]'))button.addEventListener('click',()=>{state.angle=button.dataset.angle;for(const b of document.querySelectorAll('[data-angle]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);}frameCamera();});
$('#retry').addEventListener('click',()=>location.reload());
addEventListener('keydown',event=>{if(event.code==='Space'&&state.ready&&!['BUTTON','INPUT','A'].includes(document.activeElement.tagName)){event.preventDefault();setPlaying(!state.playing);}});
const clock=new THREE.Clock();
function render(){requestAnimationFrame(render);const dt=Math.min(clock.getDelta(),.05);
  if(state.ready){if(state.playing){const next=state.time+dt*state.speed;state.time=motion().loop?next%motion().duration:Math.min(next,motion().duration);if(!motion().loop&&next>=motion().duration)setPlaying(false);}tank.evaluate(state.time);updateTimeline();}
  controls.update();renderer.render(scene,camera);
}
render();
new GLTFLoader().loadAsync('./assets/type59d.glb?v=r44',event=>{
  const ratio=event.total?event.loaded/event.total:Math.min(.95,event.loaded/24000000);
  $('#loading-progress').style.width=`${ratio*100}%`;$('#loading-detail').textContent=`正在载入坦克与机械动作 · ${Math.round(ratio*100)}%`;
}).then(gltf=>{
  tank=new UnmannedTank(gltf,scene);tank.root.visible=true;state.ready=true;
  document.querySelectorAll('[data-motion],#timeline,#play-toggle').forEach(button=>button.disabled=false);
  setMotion('TankIdle');frameCamera();$('#loading').classList.add('hidden');
}).catch(error=>{state.error=error.message;console.error(error);$('#loading-title').textContent='坦克暂时未能载入';$('#loading-detail').textContent='请重新载入后重试';$('.loading-orbit').hidden=true;$('#retry').hidden=false;});
window.tankLab={getState:()=>({...state,...tank?.getState()}),setMotion,setPlaying,seek(time){state.time=THREE.MathUtils.clamp(time,0,motion().duration);tank?.evaluate(state.time);updateTimeline();},getTank:()=>tank,scene,camera,renderer,controls,frameCamera};

import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {prepareRig,unarmed,armed,oneShots} from './rig.js?v=linxu-v2';
import {createMotionContext} from './uploaded-motion.js';
const $=s=>document.querySelector(s), stage=$('#stage');
const motionBounds=new Map();
const dynamicMotions=new Set(['Dying','FlyingBackDeath','ClimbingLadder','HangToCrouch']);
const state={ready:false,character:'linxu',weapon:'none',motion:'Idle',time:0,playing:true,speed:1,skeleton:false,compareRun:false,error:null};
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,100);
const renderer=new THREE.WebGLRenderer({canvas:$('#viewport'),antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.5;controls.maxDistance=8;controls.maxPolarAngle=Math.PI*.85;
scene.add(new THREE.HemisphereLight(0xe2efef,0x686657,2));
for(const [color,power,pos] of [[0xffedce,3,[3,5,4]],[0xc1e2ee,2,[-3,2,2]],[0xcaddab,3,[1,3,-3]]]){
 const light=new THREE.DirectionalLight(color,power);light.position.set(...pos);scene.add(light);
 if(pos[0]===3){light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-3,right:3,top:4,bottom:-2});light.shadow.normalBias=.003;}
}
const floor=new THREE.Mesh(new THREE.CircleGeometry(20,96),new THREE.MeshStandardMaterial({color:0x303d37,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(20,80,0x657568,0x46574c);grid.position.y=.001;grid.material.transparent=true;grid.material.opacity=.2;scene.add(grid);
const ring=new THREE.Mesh(new THREE.RingGeometry(.6,.604,96),new THREE.MeshBasicMaterial({color:0xd8b77e,side:THREE.DoubleSide,transparent:true,opacity:.4}));ring.rotation.x=-Math.PI/2;ring.position.y=.002;scene.add(ring);
function resize(){renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(stage);resize();
function view(kind='front',close=false){
 const distance=innerWidth<760?5.3:4.65;let d=close?1.75:distance;const target=new THREE.Vector3(0,close?1.32:.65,0);
 const box=motionBounds.get(state.character+':'+state.motion);
 if(box&&!close){const size=box.getSize(new THREE.Vector3());box.getCenter(target);target.y-=size.y*.15;d=Math.max(distance,size.length()*1.8,size.x/(2*Math.tan(THREE.MathUtils.degToRad(16))*camera.aspect)*1.2);}
 controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(...(kind==='side'?[d,0,0]:kind==='back'?[0,0,-d]:[.28,0,d])));controls.update();
}view();
const loader=new GLTFLoader(),models=new Map(),weapons=new Map();let cfg,model,request=0;
const items=()=>state.weapon==='none'?unarmed:state.weapon==='type97hawk'?[...armed,['ShotgunPump','拉泵上膛']]:armed;
const duration=()=>model?.duration(state.motion,state.weapon)||0;
const hasRunComparison=()=>['Run','RifleRun'].includes(state.motion)&&model?.actions.has(state.motion+'_Before');
const motionTitles={Idle:'ORC IDLE',Walk:'STANDARD WALK',Run:'RUNNING'};
function showMotions(){const list=items();$('#count').textContent=list.length+' 个动作';$('#motions').replaceChildren(...list.map(([name,label],i)=>{const b=document.createElement('button');b.dataset.motion=name;b.innerHTML=`<small>${String(i+1).padStart(2,'0')}</small><span>${label}</span>`;b.onclick=()=>selectMotion(name);return b;}));}
function sync(){for(const b of document.querySelectorAll('[data-motion]')){const active=b.dataset.motion===state.motion;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);b.disabled=!state.ready;}for(const b of document.querySelectorAll('[data-character]')){const active=b.dataset.character===state.character;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);}
 $('#run-comparison').hidden=!hasRunComparison();$('#compare-run').setAttribute('aria-pressed',state.compareRun);$('#compare-run').textContent=state.compareRun?'查看适配效果':'对比原始跑步';$('#run-version').textContent=state.compareRun?'正在查看：原始姿势':'正在查看：适配效果';
 $('#motion-label').textContent=items().find(m=>m[0]===state.motion)?.[1]||state.motion;$('#motion-en').textContent=motionTitles[state.motion]||state.motion.replace(/([a-z])([A-Z])/g,'$1 $2').toUpperCase();$('#character-label').textContent='林叙';$('#equipment-label').textContent=state.weapon==='none'?'无装备':cfg.weapons[state.weapon].display_name;$('#weapon').value=state.weapon;$('#play').textContent=state.playing?'暂停':'播放';$('#play').setAttribute('aria-label',state.playing?'暂停':'播放');}
function pose(){if(!state.ready)return;model.pose(state.motion,state.time,state.weapon,state.compareRun);model.context.setMotion(state.motion);model.skeleton.visible=state.skeleton;$('#seek').value=state.time/Math.max(.001,duration());$('#time').textContent=state.time.toFixed(2)+' / '+duration().toFixed(2);}
function selectMotion(name){if(!state.ready||!items().some(m=>m[0]===name))return;const reframe=dynamicMotions.has(state.motion)||dynamicMotions.has(name);state.motion=name;state.compareRun=false;state.time=0;state.playing=true;sync();pose();if(reframe)view();}
function selectWeapon(id){if(!state.ready||!(id==='none'||cfg.weapons[id]))return;state.weapon=id;showMotions();selectMotion(id==='none'?'Idle':'RifleIdle');}
async function selectCharacter(cid){const ticket=++request;state.ready=false;$('#loading').hidden=false;sync();try{
  if(!models.has(cid)){const [g,p]=await Promise.all([loader.loadAsync(`./assets/characters/${cid}/character.glb`),loader.loadAsync(`./assets/characters/${cid}/motions.glb?v=linxu-v2`)]);const m=prepareRig(g,p,cid,cfg,weapons,scene);
  for(const name of dynamicMotions){const box=new THREE.Box3();for(let i=0;i<=16;i++){m.pose(name,m.duration(name,'none')*i/16,'none');for(const b of new Set(m.bones.values()))box.expandByPoint(b.getWorldPosition(new THREE.Vector3()));}motionBounds.set(cid+':'+name,box.expandByScalar(.12));}
  m.wrapper.visible=false;m.context=createMotionContext(m,scene);m.skeleton=new THREE.SkeletonHelper(m.root);m.skeleton.material.depthTest=false;m.skeleton.material.transparent=true;m.skeleton.material.opacity=.65;m.skeleton.visible=false;scene.add(m.skeleton);models.set(cid,m);}
  if(ticket!==request)return;
  for(const m of models.values()){m.attachment.beforeAnimation();m.wrapper.visible=false;for(const w of m.attachment.weapons.values())w.visible=false;m.context.setMotion('');m.skeleton.visible=false;}
  model=models.get(cid);model.wrapper.visible=true;state.character=cid;state.ready=true;state.time=0;$('#loading').hidden=true;showMotions();sync();pose();
 }catch(e){state.error=String(e);$('#loading h2').textContent='角色加载失败';$('#loading p').textContent='请刷新页面重试。'+e.message;console.error(e);}}
for(const b of document.querySelectorAll('[data-character]'))b.onclick=()=>selectCharacter(b.dataset.character);
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>view(b.dataset.view);
$('#compare-run').onclick=()=>{if(!hasRunComparison())return;state.compareRun=!state.compareRun;sync();pose();};
$('#closeup').onclick=()=>view('front',true);$('#weapon').onchange=e=>selectWeapon(e.target.value);
$('#play').onclick=()=>{if(state.time>=duration())state.time=0;state.playing=!state.playing;sync();};$('#speed').onchange=e=>state.speed=+e.target.value;
$('#seek').oninput=e=>{state.playing=false;state.time=+e.target.value*duration();sync();pose();};$('#skeleton').onclick=()=>{state.skeleton=!state.skeleton;$('#skeleton').setAttribute('aria-pressed',state.skeleton);pose();};
let previous=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(state.ready&&state.playing){state.time+=dt*state.speed;const d=duration();if(state.time>=d){if(oneShots.has(state.motion)||(state.weapon==='type97hawk'&&state.motion==='FiringRifle')){state.time=d;state.playing=false;sync();}else state.time%=Math.max(d,.001);}pose();}controls.update();renderer.render(scene,camera);}requestAnimationFrame(frame);
window.linxuLab={state,models,scene,camera,controls,selectCharacter,selectWeapon,selectMotion,pose,view,snapshot:()=>({...state,duration:duration(),grip:model?.attachment.getState(),clips:[...(model?.actions.keys()||[])]})};
try{cfg=await fetch('./assets/weapon_attachment.json?v=linxu-v2').then(r=>{if(!r.ok)throw Error(r.status);return r.json();});await Promise.all(Object.keys(cfg.weapons).map(async id=>weapons.set(id,(await loader.loadAsync(`./assets/weapons/${id}.glb`)).scene)));await selectCharacter('linxu');}catch(e){state.error=String(e);$('#loading h2').textContent='加载失败';$('#loading p').textContent='请刷新页面重试。'+e.message;console.error(e);}

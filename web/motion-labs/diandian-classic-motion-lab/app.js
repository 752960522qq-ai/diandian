import * as THREE from 'three';
import {fixedGunMotions, fixedGunMotionNames, installFixedGunMotions} from './fixed-machine-gun.js?v=natural-weapons-v6';
import { uploadedMotions, uploadedMotionNames, measureUploadedMotions, createMotionContext } from './uploaded-motion.js?v=natural-weapons-v6';
import { selectableMotions } from './motion-catalog.js?v=pf89-r40';
import { installRocketMotions, rocketMotions, rocketLabels } from './rocket-motion.js?v=pf89-r40';
import { installType97Motions } from './type97-motion.js?v=grip-r31';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { WeaponAttachment } from './weapon-attachment.js?v=contact-r49';

const $ = (selector) => document.querySelector(selector);
const motionLabels = {};
const motionOptions = {};
const motionIcons = {"Idle": "<svg viewBox=\"0 0 32 32\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"16\" cy=\"5.5\" r=\"2.5\"/><path d=\"M16 11v9m-5-7 5-2 5 2M13 29l3-9 3 9M11 13v7m10-7v7\"/></svg>", "Walk": "<svg viewBox=\"0 0 32 32\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"18\" cy=\"5.5\" r=\"2.5\"/><path d=\"m17 11-3 9 7 7m-7-7-4 8m6-14 5 4 4-1m-9-5-6 4-2 5\"/></svg>", "Run": "<svg viewBox=\"0 0 32 32\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"21\" cy=\"5.5\" r=\"2.5\"/><path d=\"m18 11-6 9 8 3-2 6m-6-9-5 7H3m12-12 7 3 5-5m-9-2-7-2-3 5\"/></svg>", "HeadStress": "<svg viewBox=\"0 0 32 32\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 8a5 5 0 0 1 10 0v5a5 5 0 0 1-10 0zM10 28v-3a7 7 0 0 1 14 0v3M5 8v9m0 0-3-3m3 3 3-3M28 17V8m0 0-3 3m3-3 3 3\"/></svg>"};
const state = { ready: false, playing: true, speed: 1, motion: 'Idle', motionFilter: 'new', weapon: 'qbz95', lastRifleWeapon: 'qbz95', lastPistolWeapon: 'qsz92', version: 'fixed', framing: 'full', angle: 'front', time: 0, duration: 0, aimPitch: 0, skeleton: false, faceValues: {}, metadata: null, error: null };
const models = new Map();
const stage = $('#stage');
const canvas = $('#viewport');
const renderer = (() => {
  try { return new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (error) {
    $('#loading-title').textContent = '当前浏览器无法显示三维画面';
    $('#loading-detail').textContent = '请使用支持三维加速的浏览器打开此页面。';
    $('.loading-orbit').style.display = 'none';
    throw error;
  }
})();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
camera.position.set(0, .94, 3.8);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, .92, 0);
controls.enableDamping = true;
controls.dampingFactor = .075;
controls.minDistance = .22;
controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * .92;
controls.screenSpacePanning = true;
scene.add(new THREE.HemisphereLight(0xdce7ff, 0x42404a, 1.45));
const key = new THREE.DirectionalLight(0xfff3e5, 3.5);
key.position.set(2.6, 4.7, 4.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -2.5;
key.shadow.camera.right = 2.5;
key.shadow.camera.top = 3;
key.shadow.camera.bottom = -1;
key.shadow.normalBias = .002;
key.shadow.bias = -.00005;
scene.add(key);
const fill = new THREE.DirectionalLight(0xc5d7ff, 1.5);
fill.position.set(-3, 2, 2);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffbc9a, 2.2);
rim.position.set(1, 2.8, -3);
scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 100), new THREE.MeshStandardMaterial({ color: 0x2a313e, roughness: .95, metalness: 0 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(20, 80, 0x535a68, 0x3f4654);
grid.position.y = .0005;
grid.material.transparent = true;
grid.material.opacity = .2;
scene.add(grid);
const ring = new THREE.Mesh(new THREE.RingGeometry(.53, .536, 100), new THREE.MeshBasicMaterial({ color: 0xe0b3a0, transparent: true, opacity: .22, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = .001;
scene.add(ring);

let normalization;
let cameraTransition;
let scrubbing = false;
let metadata;
let weaponConfig;
const clock = new THREE.Clock();
const loader = new GLTFLoader();
const progress = $('#loading-progress');
const loading = $('#loading');

function resize() {
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

const shotgunMotions = [
  {name: 'ShotgunAimUp', label: '上瞄极限', loop: true, shotgun_only: true, pitch_only: true},
  {name: 'ShotgunAimLevel', label: '平视瞄准', loop: true, shotgun_only: true, pitch_only: true},
  {name: 'ShotgunAimDown', label: '下瞄极限', loop: true, shotgun_only: true, pitch_only: true},
  {name: 'ShotgunPump', label: '霰弹枪拉泵', loop: false, shotgun_only: true}
];
const usesPitchAim = () => !uploadedMotionNames.has(state.motion) && isShotgun() && !weaponConfig?.weapons[state.weapon]?.hybrid_upper_actions;
const isShotgun = () => weaponConfig?.weapons[state.weapon]?.type === 'shotgun';
function optionsFor(name) {
  const options = motionOptions[name] || {};
  if (state.weapon === 'pf89' && name === 'FiringRifle') return {...options, loop:false};
  // Recoil and pumping are separate one-shot clips, never loop either segment.
  return isShotgun() && name === 'FiringRifle' ? {...options, loop: false} : options;
}
function shotgunGroup(name) {
  if (!usesPitchAim()) return null;
  if (name === 'RifleAimingIdle' || name.startsWith('ShotgunAim')) return 'ShotgunAim';
  if (name === 'FiringRifle') return 'ShotgunFire';
  if (name === 'ShotgunPump') return 'ShotgunPump';
  return null;
}
function updateAimControl() {
  $('#shotgun-aim-controls').hidden = !usesPitchAim();
  $('#aim-pitch').value = state.aimPitch;
  $('#aim-pitch').style.setProperty('--progress', `${(state.aimPitch + 1) * 50}%`);
  const calibration = weaponConfig?.weapons.m870?.re4_shotgun;
  const min = calibration?.aim_pitch_min_deg, max = calibration?.aim_pitch_max_deg;
  const degrees = state.aimPitch < 0 ? -state.aimPitch * min : state.aimPitch * max;
  const label = state.aimPitch === 0 ? '平视 0°' : Math.abs(state.aimPitch) === 1 && Number.isFinite(degrees) ? `${state.aimPitch > 0 ? '上仰' : '下俯'} ${Math.abs(degrees).toFixed(1)}°` : `${state.aimPitch > 0 ? '上仰' : '下俯'} ${Math.round(Math.abs(state.aimPitch) * 100)}%`;
  $('#aim-pitch-label').textContent = label;
  $('#aim-pitch').setAttribute('aria-valuetext', label);
  $('#aim-min-label').textContent = Number.isFinite(min) ? `下瞄极限 ${min.toFixed(1)}°` : '下瞄极限';
  $('#aim-max-label').textContent = Number.isFinite(max) ? `上瞄极限 +${max.toFixed(1)}°` : '上瞄极限';
}
function setAimPitch(value) {
  const pitch = Number(value);
  if (!Number.isFinite(pitch)) return;
  state.aimPitch = THREE.MathUtils.clamp(pitch, -1, 1);
  updateAimControl();
  if (!state.ready || !usesPitchAim()) return;
  if (!shotgunGroup(state.motion) || state.motion.startsWith('ShotgunAim')) {
    const time = state.time, playing = state.playing;
    setMotion('RifleAimingIdle');
    state.time = Math.min(time, state.duration);
    setPlaying(playing);
  } else {
    for (const model of models.values()) setModelAction(model, state.motion);
  }
  updateTimeline();
}

function setMotionControls(info) {
  const buttons = selectableMotions(info.motions, shotgunMotions, rocketMotions, uploadedMotions, fixedGunMotions).map(motion => {
    motionLabels[motion.name] = motion.label;
    motionOptions[motion.name] = motion;
    const button = document.createElement('button');
    button.className = 'motion-button';
    button.dataset.motion = motion.name;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = motionIcons[motion.name] || motionIcons.Idle;
    const label = document.createElement('span');
    label.textContent = motion.label;
    const caption = document.createElement('small');
    caption.textContent = (motion.source_action || motion.name).replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
    button.dataset.caption = caption.textContent;
    button.append(label, caption);
    button.disabled = true;
    return button;
  });
  $('#motion-buttons').replaceChildren(...buttons);
  $('#motion-count').textContent = `${buttons.length} 个动作`;
}

function updateComparisonAvailability() {
  $('[data-version="before"]').disabled = !actionFor(models.get('before'), state.motion);
}

function resolveClip(clips, name) {
  return clips.find(c => c.name === name) || clips.find(c => c.name.toLowerCase() === name.toLowerCase()) || clips.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
}

function prepareModel(gltf, version) {
  const wrapper = new THREE.Group();
  const box = new THREE.Box3().setFromObject(gltf.scene);
  if (!normalization) {
    const height = box.max.y - box.min.y;
    const authored = gltf.parser.json.asset.extras?.preview_normalization;
    normalization = authored
      ? {scale:authored.scale,center:new THREE.Vector3(...authored.center),floor:authored.floor}
      : {scale:1.75/height,center:box.getCenter(new THREE.Vector3()),floor:box.min.y};
  }
  const { scale, center, floor: floorY } = normalization;
  wrapper.scale.setScalar(scale);
  wrapper.position.set(-center.x * scale, -floorY * scale, -center.z * scale);
  wrapper.add(gltf.scene);
  wrapper.visible = version === state.version;
  scene.add(wrapper);
  let head;
  const bones = new Map();
  const morphMeshes = [];
  gltf.scene.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.morphTargetDictionary) morphMeshes.push(object);
    }
    if (object.isBone) {
      const originalName = object.userData.name || object.name;
      bones.set(object.name, object);
      bones.set(originalName, object);
      if (originalName === 'mixamorig:Head' || originalName === 'Head' || /:Head$/.test(originalName)) head = object;
    }
  });
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const actions = new Map();
  for (const name of Object.keys(motionLabels)) {
    const clip = resolveClip(gltf.animations, name);
    if (clip) actions.set(name, mixer.clipAction(clip));
  }
  const skeleton = new THREE.SkeletonHelper(gltf.scene);
  skeleton.visible = state.skeleton && version === state.version;
  skeleton.material.depthTest = false;
  skeleton.material.transparent = true;
  skeleton.material.opacity = .6;
  skeleton.renderOrder = 10;
  scene.add(skeleton);
  const model = { wrapper, root: gltf.scene, bones, head, mixer, actions, skeleton, morphMeshes, faceRest: new Map() };
  models.set(version, model);
  setModelAction(model, state.motion);
  return model;
}

function actionFor(model, name) {
  if (!model) return;
  if (fixedGunMotionNames.has(name)) return state.weapon === 'qjz89' && model === models.get('fixed') ? model.actions.get(name) : undefined;
  if (state.weapon === 'qjz89' && !uploadedMotionNames.has(name)) return undefined;
  if (uploadedMotionNames.has(name)) return model === models.get('fixed') ? model.actions.get(name) : undefined;
  let weapon = state.weapon;
  const type = weaponConfig?.weapons[weapon]?.type;
  if (motionOptions[name]?.rocket_only && type !== 'rocket') return;
  if (type === 'rocket' && (model !== models.get('fixed') || (!rocketLabels[name] && !motionOptions[name]?.rocket_only))) return;
  if (motionOptions[name]?.shotgun_only && type !== 'shotgun') return;
  if (motionOptions[name]?.pitch_only && !usesPitchAim()) return;
  if (name === 'ShotgunPump') return model.actions.get(weaponConfig?.weapons[weapon]?.animation_overrides?.[name] || 'ShotgunPumpLevel');
  if (['PistolIdle', 'PistolAimingIdle', 'PistolWalk', 'PistolShooting'].includes(name) && type && type !== 'pistol') weapon = state.lastPistolWeapon;
  if (['RifleIdle', 'RifleWalk', 'RifleAimingIdle', 'FiringRifle', 'RifleRun', 'Reloading'].includes(name) && type === 'pistol' && !weaponConfig.weapons[weapon].compatible_motions?.includes(name)) weapon = state.lastRifleWeapon;
  const mapped = weaponConfig?.weapons[weapon]?.animation_overrides?.[name];
  return model.actions.get(mapped) || model.actions.get(name);
}

function playbackPlan(model, name) {
  const group = model === models.get('fixed') && shotgunGroup(name);
  if (group) {
    const amount = Math.abs(state.aimPitch);
    const endpoint = state.aimPitch < 0 ? 'Down' : 'Up';
    return [
      {action: model.actions.get(group + 'Level'), weight: 1 - amount},
      {action: model.actions.get(group + endpoint), weight: amount}
    ].filter(item => item.action && item.weight > 0);
  }
  const action = actionFor(model, name);
  return action ? [{action, weight: 1}] : [];
}
function durationFor(model, name) {
  const group = model === models.get('fixed') && shotgunGroup(name);
  if (group) return Math.max(...['Level', 'Up', 'Down'].map(endpoint => model.actions.get(group + endpoint)?.getClip().duration || 0));
  return actionFor(model, name)?.getClip().duration || 0;
}
function setModelAction(model, name) {
  model.weaponAttachment?.beforeAnimation();
  model.mixer.stopAllAction();
  model.activeActions = playbackPlan(model, name);
  for (const {action, weight} of model.activeActions) {
    const loop = optionsFor(name).loop !== false;
    action.reset().setEffectiveWeight(weight).setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.play();
  }
}
function evaluateModel(model) {
  model.weaponAttachment?.beforeAnimation();
  for (const {action} of model.activeActions || []) {
    action.time = state.duration ? state.time / state.duration * action.getClip().duration : 0;
  }
  model.mixer.update(0);
}
function activeClips() {
  return (models.get('fixed')?.activeActions || []).map(({action, weight}) => ({name: action.getClip().name, weight}));
}

function setActive(selector, valueKey, value) {
  document.querySelectorAll(selector).forEach(button => {
    const active = button.dataset[valueKey] === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}


function displayMotionLabel(name) {
  const label = motionLabels[name] || name;
  if (state.weapon === 'pf89') return rocketLabels[name] || label;
  if (state.weapon === 'hanyang88' && ['RifleIdle', 'RifleWalk'].includes(name)) return name === 'RifleIdle' ? '汉阳造待机' : '汉阳造行走';
  const type = weaponConfig?.weapons[state.weapon]?.type;
  if (type === 'shotgun' && name === 'RifleAimingIdle') return '霰弹枪瞄准';
  if (type === 'shotgun' && name === 'Reloading') return '霰弹枪装填';
  if (type === 'shotgun') return label.replace('步枪', '霰弹枪').replace('持枪行走', '霰弹枪行走');
  return type === 'smg' ? label.replace('步枪', '冲锋枪') : label;
}

function refreshMotionLabels() {
  document.querySelectorAll('[data-motion]').forEach(button => {
    const label = button.querySelector('span');
    if (label) label.textContent = displayMotionLabel(button.dataset.motion);
    const captions = {RifleAimingIdle: '可调俯仰 · 动态混合', ShotgunAimUp: '俯仰上限 · 原始端点', ShotgunAimDown: '俯仰下限 · 原始端点', ShotgunAimLevel: '水平 0° · 独立姿态', ShotgunPump: '单次 · 拉泵及复位', FiringRifle: '单次 · 后坐力', Reloading: '完整装填'};
    const caption = button.querySelector('small');
    if (caption) caption.textContent = isShotgun() && (!weaponConfig.weapons[state.weapon].hybrid_upper_actions || ['FiringRifle','ShotgunPump'].includes(button.dataset.motion)) && captions[button.dataset.motion] || button.dataset.caption;
    const added = uploadedMotionNames.has(button.dataset.motion);
    button.hidden = (state.motionFilter === 'new' && !added) || (state.motionFilter === 'existing' && added) || (!added && ((!!motionOptions[button.dataset.motion]?.shotgun_only && !isShotgun()) || (!!motionOptions[button.dataset.motion]?.pitch_only && !usesPitchAim()) || (!!motionOptions[button.dataset.motion]?.rocket_only && state.weapon !== 'pf89') || (state.weapon === 'pf89' && !rocketLabels[button.dataset.motion] && !motionOptions[button.dataset.motion]?.rocket_only)));
    button.hidden ||= (fixedGunMotionNames.has(button.dataset.motion) && state.weapon !== 'qjz89') || (state.weapon === 'qjz89' && !added && !fixedGunMotionNames.has(button.dataset.motion));
    if (fixedGunMotionNames.has(button.dataset.motion) && caption) caption.textContent = '右手握把 · 左手扶枪托';
    if (state.weapon === 'pf89' && !added && caption) caption.textContent = optionsFor(button.dataset.motion).loop === false ? '单次动作' : '循环播放';
    button.disabled = !actionFor(models.get('fixed'), button.dataset.motion);
  });
  $('#current-motion').textContent = displayMotionLabel(state.motion);
  $('#motion-count').textContent = `${[...document.querySelectorAll('[data-motion]')].filter(button => !button.hidden).length} 个动作`;
  updateAimControl();
}

function selectWeapon(id, switchMotion = true) {
  if (id === 'winchester1897') id = 'm870';
  if (state.version !== 'fixed') setVersion('fixed');
  state.weapon = id;
  if (switchMotion) { state.motionFilter = 'existing'; $('#motion-filter').value = state.motionFilter; }
  const isPistol = weaponConfig.weapons[id].type === 'pistol';
  if (isPistol) state.lastPistolWeapon = id; else if (id !== 'qjz89') state.lastRifleWeapon = id;
  models.get('fixed')?.weaponAttachment?.setWeapon(id);
  setActive('[data-weapon]', 'weapon', id);
  $('#weapon-label').textContent = weaponConfig.weapons[id].display_name + (id === 'qjz89' ? ' · 1640 mm' : id === 'qbu10' ? ' · 1150 mm' : '');
  refreshMotionLabels();
  if (switchMotion) setMotion(id === 'qjz89' ? 'QJZ89Idle' : isPistol ? 'PistolIdle' : 'RifleIdle');
  else if (state.ready) setMotion(motionOptions[state.motion]?.shotgun_only && !isShotgun() ? (isPistol ? 'PistolIdle' : 'RifleIdle') : state.motion);
  if (state.ready) frameCamera();
}

async function equipWeapons() {
  const config = await fetch('./assets/weapon_attachment.json?v=natural-weapons-v6').then(r => r.json());
  weaponConfig = config;
  const scenes = new Map(await Promise.all(Object.keys(config.weapons).map(async id => {
    const gltf = await loader.loadAsync('./assets/weapons/' + id + '.glb?v=natural-weapons-v6');
    return [id, gltf.scene];
  })));
  models.get('fixed').weaponAttachment = new WeaponAttachment(models.get('fixed'), config, 'diandian', scenes, scene);
  selectWeapon('qbz95', false);
  document.querySelectorAll('[data-weapon]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => selectWeapon(button.dataset.weapon));
  });
}

async function equipMotionPack() {
  const packs = await Promise.all(['motion_additions.glb', 'leon_pistol_animations.glb', 're4_shotgun_animations.glb', 're4_rocket_upper.glb', 'uploaded_motions.glb'].map(file => loader.loadAsync('./assets/' + file + '?v=natural-weapons-v6')));
  const model = models.get('fixed');
  for (const pack of packs) for (const clip of pack.animations) model.actions.set(clip.name, model.mixer.clipAction(clip));
  model.type97Composition = installType97Motions(model);
  model.rocketComposition = installRocketMotions(model);
  installFixedGunMotions(model);
  model.uploadedBounds = measureUploadedMotions(model);
  model.motionContext = createMotionContext(model, scene);
  setModelAction(model, state.motion);
}

function setMotion(name) {
  if (!actionFor(models.get('fixed'), name)) return;
  state.motion = name;
  if (name === 'ShotgunAimUp') state.aimPitch = 1;
  if (name === 'ShotgunAimDown') state.aimPitch = -1;
  if (name === 'ShotgunAimLevel') state.aimPitch = 0;
  updateAimControl();
  if (['PistolIdle', 'PistolAimingIdle', 'PistolWalk', 'PistolShooting'].includes(name) && weaponConfig.weapons[state.weapon].type !== 'pistol') selectWeapon(state.lastPistolWeapon, false);
  if (['RifleIdle','RifleWalk','RifleAimingIdle','FiringRifle','RifleRun','Reloading'].includes(name) && weaponConfig.weapons[state.weapon].type === 'pistol' && !weaponConfig.weapons[state.weapon].compatible_motions?.includes(name)) selectWeapon(state.lastRifleWeapon, false);
  if (state.version === 'before' && !actionFor(models.get('before'), name)) setVersion('fixed');
  updateComparisonAvailability();
  state.time = 0;
  for (const model of models.values()) setModelAction(model, name);
  state.duration = durationFor(models.get('fixed'), name);
  $('#current-motion').textContent = displayMotionLabel(name);
  $('.loop-badge').lastChild.textContent = optionsFor(name).pose_hold ? '静态待机' : optionsFor(name).loop !== false ? '循环' : '单次';
  setActive('[data-motion]', 'motion', name);
  setPlaying(true);
  updateTimeline();
  evaluateModel(models.get('fixed'));
  scene.updateMatrixWorld(true);
  models.get('fixed').motionContext?.setMotion(name);
  refreshMotionLabels();
  if (uploadedMotionNames.has(name)) frameCamera();
}

function setVersion(version) {
  if (!actionFor(models.get(version), state.motion)) return;
  state.version = version;
  for (const [key, model] of models) {
    model.wrapper.visible = key === version;
    model.skeleton.visible = key === version && state.skeleton;
  }
  $('#view-tag').textContent = version === 'fixed' ? '本次适配' : '上一版';
  setActive('[data-version]', 'version', version);
  $('#face-controls').style.opacity = version === 'fixed' ? '1' : '.45';
  $('#face-controls').querySelectorAll('input').forEach(input => { input.disabled = version !== 'fixed'; });
}

function headTarget() {
  const model = models.get(state.version) || models.get('fixed');
  if (model?.head) {
    const p = model.head.getWorldPosition(new THREE.Vector3());
    p.y += .09;
    return p;
  }
  return new THREE.Vector3(0, 1.56, 0);
}

function handTarget() {
  const side = state.framing === 'leftHand' ? 'Left' : 'Right';
  const model = models.get(state.version) || models.get('fixed');
  const wrist = model.bones.get('mixamorig:' + side + 'Hand');
  const middle = model.bones.get('mixamorig:' + side + 'HandMiddle2');
  return wrist.getWorldPosition(new THREE.Vector3()).lerp(middle.getWorldPosition(new THREE.Vector3()), .6);
}

function frameCamera(animate = true) {
  const head = state.framing === 'head';
  const feet = state.framing === 'feet';
  const hands = state.framing === 'leftHand' || state.framing === 'rightHand';
  // One fixed full-body framing covers both shotgun endpoints, so changing
  // pitch does not pull the view away from a manually orbited camera.
  const shotgunFull = state.framing === 'full' && isShotgun();
  let target = head ? headTarget() : new THREE.Vector3(0, shotgunFull ? 1.12 : .92, 0);
  if (feet) {
    const model = models.get(state.version) || models.get('fixed');
    const l = model.bones.get('mixamorig:LeftFoot') || model.bones.get('mixamorigLeftFoot');
    const r = model.bones.get('mixamorig:RightFoot') || model.bones.get('mixamorigRightFoot');
    target = l.getWorldPosition(new THREE.Vector3()).add(r.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);
    target.y = .17;
  }
  if (hands) target = handTarget();
  let distance = head ? .9 : feet ? 1.4 : hands ? .48 : shotgunFull ? 4.8 : state.weapon === 'qjz89' ? 5 : state.weapon === 'qbu10' ? 4.8 : 3.8;
  if (state.weapon === 'qjz89' && state.framing === 'full') target.z += .5;
  if (state.weapon === 'qbu10' && state.framing === 'full') target.z += .3;
  const addedBounds = models.get(state.version)?.uploadedBounds?.get(state.motion);
  if (state.framing === 'full' && addedBounds) {
    target = addedBounds.getCenter(new THREE.Vector3());
    const size = addedBounds.getSize(new THREE.Vector3());
    const width = state.angle === 'side' ? size.z : size.x;
    distance = Math.max(size.y, width / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) + Math.max(size.x, size.z) * .55;
    controls.maxDistance = 16;
  } else controls.maxDistance = 7;
  const direction = state.angle === 'side' ? new THREE.Vector3(1, .035, .04) : state.angle === 'back' ? new THREE.Vector3(0, .015, -1) : new THREE.Vector3(0, .015, 1);
  const position = target.clone().addScaledVector(direction.normalize(), distance);
  if (animate) cameraTransition = { fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), position, target, elapsed: 0, handOffset: hands ? position.clone().sub(target) : null };
  else { camera.position.copy(position); controls.target.copy(target); controls.update(); }
  $('#camera-hint').textContent = head ? '头部特写' : feet ? '脚部特写' : hands ? (state.framing === 'leftHand' ? '左手特写' : '右手特写') : '全身';
}

function updateTimeline() {
  const hold = optionsFor(state.motion).pose_hold === true;
  const fraction = !hold && state.duration ? state.time / state.duration : 0;
  $('#timeline').disabled = hold;
  $('#timeline').value = fraction;
  $('#timeline').style.setProperty('--progress', `${fraction * 100}%`);
  $('#time-readout').textContent = hold ? '静态姿态' : `${state.time.toFixed(2)} / ${state.duration.toFixed(2)} s`;
}

function applyFace(model) {
  if (state.version !== 'fixed' || !metadata?.face_controls) return;
  for (const [name, rest] of model.faceRest) model.bones.get(name).quaternion.copy(rest);
  for (const control of metadata.face_controls) {
    const amount = state.faceValues[control.id] || 0;
    if (control.type === 'morph') {
      for (const target of control.targets || []) {
        for (const mesh of model.morphMeshes) {
          const index = mesh.morphTargetDictionary[target.name];
          if (index !== undefined) mesh.morphTargetInfluences[index] = amount * (target.scale ?? 1);
        }
      }
    } else {
      for (const target of control.bones || []) {
        const bone = model.bones.get(target.name);
        if (bone) {
          const axis = new THREE.Vector3(...(Array.isArray(target.axis) ? target.axis : target.axis === 'y' ? [0, 1, 0] : target.axis === 'z' ? [0, 0, 1] : [1, 0, 0]));
          bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis.normalize(), (target.radians ?? .2) * amount));
        }
      }
    }
  }
}

function setFaceControls(info) {
  metadata = info;
  state.metadata = info;
  const fixed = models.get('fixed');
  const controls = info.face_controls || [];
  const host = $('#face-sliders');
  host.replaceChildren();
  for (const control of controls) {
    if (control.type !== 'morph') {
      for (const target of control.bones || []) {
        const bone = fixed.bones.get(target.name);
        if (bone) fixed.faceRest.set(target.name, bone.quaternion.clone());
      }
    }
    state.faceValues[control.id] = 0;
    const row = document.createElement('div');
    row.className = 'face-slider-row';
    const label = document.createElement('label');
    label.htmlFor = `face-${control.id}`;
    label.textContent = control.label;
    const input = document.createElement('input');
    input.id = label.htmlFor;
    input.type = 'range'; input.min = 0; input.max = 1; input.step = .01; input.value = 0;
    input.addEventListener('input', () => { state.faceValues[control.id] = Number(input.value); });
    row.append(label, input); host.append(row);
  }
  $('#face-controls').hidden = controls.length === 0;
}

function setPlaying(playing) {
  if (playing && state.ready && state.time >= state.duration && optionsFor(state.motion).loop === false) {
    setMotion(state.motion);
  }
  state.playing = playing;
  $('#play-toggle').setAttribute('aria-label', playing ? '暂停播放' : '播放动作');
  $('#play-icon').innerHTML = playing ? '<path d="M7 5h3v14H7zm7 0h3v14h-3z"/>' : '<path d="m8 4 12 8-12 8z"/>';
}

$('#motion-filter').addEventListener('change', event => { state.motionFilter = event.target.value; refreshMotionLabels(); });

$('#motion-buttons').addEventListener('click', event => {
  const button = event.target.closest('[data-motion]');
  if (button && !button.disabled) setMotion(button.dataset.motion);
});
document.querySelectorAll('[data-version]').forEach(button => button.addEventListener('click', () => setVersion(button.dataset.version)));
document.querySelectorAll('[data-framing]').forEach(button => button.addEventListener('click', () => {
  state.framing = button.dataset.framing; setActive('[data-framing]', 'framing', state.framing); frameCamera();
}));
document.querySelectorAll('[data-angle]').forEach(button => button.addEventListener('click', () => {
  state.angle = button.dataset.angle; setActive('[data-angle]', 'angle', state.angle); frameCamera();
}));
$('#aim-pitch').addEventListener('input', event => setAimPitch(event.target.value));
$('#aim-level').addEventListener('click', () => setMotion('ShotgunAimLevel'));
$('#play-toggle').addEventListener('click', () => setPlaying(!state.playing));
$('#reset-camera').addEventListener('click', () => frameCamera());
$('#speed').addEventListener('input', event => {
  state.speed = Number(event.target.value);
  $('#speed-label').textContent = `${state.speed.toFixed(2)}×`;
  event.target.style.setProperty('--progress', `${(state.speed - .25) / 1.25 * 100}%`);
});
$('#speed').style.setProperty('--progress', '60%');
$('#timeline').addEventListener('pointerdown', () => { scrubbing = true; });
window.addEventListener('pointerup', () => { scrubbing = false; });
$('#timeline').addEventListener('input', event => { state.time = Number(event.target.value) * state.duration; updateTimeline(); });
$('#skeleton').addEventListener('change', event => {
  state.skeleton = event.target.checked;
  for (const [version, model] of models) model.skeleton.visible = state.skeleton && state.version === version;
});
controls.addEventListener('start', () => { cameraTransition = null; });
window.addEventListener('keydown', event => {
  if (event.code === 'Space' && !['INPUT', 'BUTTON'].includes(document.activeElement.tagName)) { event.preventDefault(); setPlaying(!state.playing); }
});

function render() {
  requestAnimationFrame(render);
  const elapsedDelta = clock.getDelta();
  const delta = Math.min(elapsedDelta, .05);
  if (state.ready && state.playing && !scrubbing && state.duration) {
    const next = state.time + delta * state.speed;
    if (optionsFor(state.motion).loop !== false) state.time = next % state.duration;
    else {
      state.time = Math.min(next, state.duration);
      if (next >= state.duration) setPlaying(false);
    }
  }
  for (const model of models.values()) {
    evaluateModel(model);
  }
  const fixed = models.get('fixed');
  if (fixed) { applyFace(fixed); fixed.weaponAttachment?.update(state.motion, state.time, {aimPitch: state.aimPitch, activeClips: activeClips()}); }
  if (cameraTransition) {
    if (cameraTransition.handOffset) { cameraTransition.target.copy(handTarget()); cameraTransition.position.copy(cameraTransition.target).add(cameraTransition.handOffset); }
    cameraTransition.elapsed += elapsedDelta;
    const t = Math.min(cameraTransition.elapsed / .55, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.position, eased);
    controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.target, eased);
    if (t === 1) cameraTransition = null;
  }
  if (!cameraTransition && state.ready && (state.framing === 'leftHand' || state.framing === 'rightHand')) {
    const target = handTarget(); camera.position.add(target.clone().sub(controls.target)); controls.target.copy(target);
  }
  controls.update();
  renderer.render(scene, camera);
  if (state.ready) updateTimeline();
}
render();

async function load() {
  document.querySelectorAll('[data-motion], [data-version]').forEach(button => { button.disabled = true; });
  const info = await fetch('./assets/rig_info.json?v=clothing-r23').then(response => response.json());
  setMotionControls(info);
  const fixed = await loader.loadAsync('./assets/diandian_fixed.glb?v=hands-r44', event => {
    const ratio = event.total ? event.loaded / event.total : Math.min(.9, event.loaded / 15000000);
    progress.style.width = `${ratio * 95}%`;
    if (event.total) $('#loading-detail').textContent = `正在载入模型与动作 · ${Math.round(ratio * 100)}%`;
  });
  prepareModel(fixed, 'fixed');
  await equipWeapons();
  await equipMotionPack();
  state.ready = true;
  selectWeapon('qjz89');
  scene.updateMatrixWorld(true);
  frameCamera(false);
  for (const button of document.querySelectorAll('[data-motion]')) button.disabled = !actionFor(models.get('fixed'), button.dataset.motion);
  $('[data-version="fixed"]').disabled = false;
  progress.style.width = '100%';
  loading.classList.add('hidden');
  const before = await loader.loadAsync('./assets/diandian_before.glb?v=hands-r44');
  prepareModel(before, 'before');
  setFaceControls(info);
  updateComparisonAvailability();
}
load().catch(error => {
  state.error = error.message;
  console.error(error);
  if (!state.ready) {
    $('#loading-title').textContent = '模型暂时未能载入';
    $('#loading-detail').textContent = '请刷新页面重新打开';
    $('.loading-orbit').style.display = 'none';
  }
});

window.diandianLab = {
  getState: () => ({ ...state, availableMotions: Object.keys(motionLabels).filter(name => actionFor(models.get('fixed'), name)), loadedVersions: [...models.keys()], boneCount: new Set(models.get('fixed')?.bones.values() || []).size, faceControls: metadata?.face_controls || [] }),
  selectWeapon,
  getActiveClip: () => activeClips().sort((a, b) => b.weight - a.weight)[0]?.name,
  getActiveClips: () => activeClips(),
  setAimPitch,
  getWeaponState: () => models.get('fixed')?.weaponAttachment?.getState(),
  setMotion, setVersion, setPlaying,
  setFaceValue(id, value) { state.faceValues[id] = THREE.MathUtils.clamp(value, 0, 1); const input = document.getElementById(`face-${id}`); if (input) input.value = state.faceValues[id]; },
  setFaceControls,
  seek(seconds) { state.time = THREE.MathUtils.clamp(seconds, 0, state.duration); updateTimeline(); },
  renderer, scene, camera, models, controls
};

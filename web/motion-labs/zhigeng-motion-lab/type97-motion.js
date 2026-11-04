import * as THREE from 'three';

// Keep the complete assault-rifle performance and replace only the left arm.
// In particular, LeftUpLeg/LeftLeg, the torso and every right-hand digit stay AR.
export function isType97LeftTrack(track) {
  const parsed = THREE.PropertyBinding.parseTrackName(track.name);
  const name = (parsed.objectName === 'bones' ? parsed.objectIndex : parsed.nodeName) || '';
  const normalized = name.replace(/[^A-Za-z0-9]/g, '');
  return /^(?:mixamorig)?Left(?:Shoulder|Arm|ForeArm|Hand[A-Za-z0-9]*)$/.test(normalized);
}

function bindingKey(track) {
  const parsed = THREE.PropertyBinding.parseTrackName(track.name);
  const name = (parsed.objectName === 'bones' ? parsed.objectIndex : parsed.nodeName) || '';
  return `${name.replace(/[^A-Za-z0-9]/g, '')}.${parsed.propertyName}[${parsed.propertyIndex ?? ''}]`;
}

function leftTrackOnTimeline(track, sourceDuration, duration) {
  const scaled = track.clone();
  const ratio = duration / sourceDuration;
  // The shipped GLBs use linear quaternion and discrete constant transform
  // tracks. Scaling their key times preserves the exact source interpolation.
  if (!track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline) {
    scaled.times = new Float32Array(Array.from(track.times, t => t * ratio));
    return scaled;
  }
  // Future cubic imports need their tangents retimed. Sampling the source
  // interpolant avoids treating its tangent triplets as quaternion values.
  const count = Math.ceil(duration * 60);
  const size = track.getValueSize() / 3;
  const times = new Float32Array(count + 1);
  const values = new Float32Array((count + 1) * size);
  const interpolant = track.createInterpolant();
  for (let i = 0; i <= count; i++) {
    const t = duration * i / count;
    times[i] = t;
    values.set(interpolant.evaluate(t / ratio), i * size);
  }
  return new track.constructor(track.name, times, values, THREE.InterpolateLinear);
}

function composeLeftArm(name, base, shotgun, duration) {
  if (!(base?.duration > 0 && shotgun?.duration > 0 && duration > 0)) {
    throw new Error(`Cannot compose ${name}: required assault-rifle/shotgun clips are missing`);
  }
  const left = new Map(shotgun.tracks.filter(isType97LeftTrack).map(t => [bindingKey(t), t]));
  if (!left.size) throw new Error(`Cannot compose ${name}: shotgun clip has no left-arm tracks`);
  const tracks = base.tracks.map(track => {
    const replacement = isType97LeftTrack(track) ? left.get(bindingKey(track)) : null;
    if (!replacement) return track.clone();
    left.delete(bindingKey(track));
    const result = leftTrackOnTimeline(replacement, shotgun.duration, duration);
    result.name = track.name;
    return result;
  });
  for (const track of left.values()) tracks.push(leftTrackOnTimeline(track, shotgun.duration, duration));
  // Do not trim/resample AR tracks. Pumping evaluates the original aiming
  // performance at its real time (0–0.733s), rather than speeding up 3.1s.
  const clip = new THREE.AnimationClip(name, duration, tracks);
  clip.userData = {
    assaultRifleBase: base.name,
    leftArmSource: shotgun.name,
    leftArmTimeScale: shotgun.duration / duration,
    rightArmAndBodyPolicy: 'unaltered assault-rifle tracks at real elapsed time'
  };
  return clip;
}

export function installType97Motions(model) {
  const get = name => model.actions.get(name)?.getClip();
  const fireBase = get('FiringRifle');
  const fireLeft = get('ShotgunFireLevel');
  const pumpLeft = get('ShotgunPumpLevel');
  const clips = [
    composeLeftArm('Type97Fire', fireBase, fireLeft, fireBase?.duration),
    composeLeftArm('Type97Pump', get('RifleAimingIdle'), pumpLeft, pumpLeft?.duration)
  ];
  for (const clip of clips) model.actions.set(clip.name, model.mixer.clipAction(clip));
  return clips.map(clip => ({name: clip.name, duration: clip.duration, tracks: clip.tracks.length, leftArmTracks: clip.tracks.filter(isType97LeftTrack).length, ...clip.userData}));
}

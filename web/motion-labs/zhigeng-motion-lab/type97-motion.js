import * as THREE from 'three';

// Use the M1897 chest, shoulders and both arms for visible recoil and pumping.
// Hips/root and all leg tracks remain from the rifle clip at real elapsed time.
export function isType97UpperTrack(track) {
  const parsed = THREE.PropertyBinding.parseTrackName(track.name);
  const name = (parsed.objectName === 'bones' ? parsed.objectIndex : parsed.nodeName) || '';
  const normalized = name.replace(/[^A-Za-z0-9]/g, '');
  return /^(?:mixamorig)?(?:Spine[0-9]*|Neck[0-9]*|Head|(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand[A-Za-z0-9]*))$/.test(normalized);
}

function bindingKey(track) {
  const parsed = THREE.PropertyBinding.parseTrackName(track.name);
  const name = (parsed.objectName === 'bones' ? parsed.objectIndex : parsed.nodeName) || '';
  return `${name.replace(/[^A-Za-z0-9]/g, '')}.${parsed.propertyName}[${parsed.propertyIndex ?? ''}]`;
}

function upperTrackOnTimeline(track, sourceDuration, duration) {
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

export function composeUpperBody(name, base, shotgun, duration) {
  if (!(base?.duration > 0 && shotgun?.duration > 0 && duration > 0)) {
    throw new Error(`Cannot compose ${name}: required assault-rifle/shotgun clips are missing`);
  }
  const upper = new Map(shotgun.tracks.filter(isType97UpperTrack).map(t => [bindingKey(t), t]));
  if (!upper.size) throw new Error(`Cannot compose ${name}: shotgun clip has no upper-body tracks`);
  const tracks = base.tracks.map(track => {
    const replacement = isType97UpperTrack(track) ? upper.get(bindingKey(track)) : null;
    if (!replacement) return track.clone();
    upper.delete(bindingKey(track));
    const result = upperTrackOnTimeline(replacement, shotgun.duration, duration);
    result.name = track.name;
    return result;
  });
  for (const track of upper.values()) tracks.push(upperTrackOnTimeline(track, shotgun.duration, duration));
  // Do not trim/resample AR tracks. Pumping evaluates the original aiming
  // performance at its real time (0–0.733s), rather than speeding up 3.1s.
  const clip = new THREE.AnimationClip(name, duration, tracks);
  clip.userData = {
    assaultRifleBase: base.name,
    upperBodySource: shotgun.name,
    upperBodyTimeScale: shotgun.duration / duration,
    lowerBodyPolicy: 'unaltered assault-rifle hips and leg tracks at real elapsed time'
  };
  return clip;
}

export function installType97Motions(model) {
  const get = name => model.actions.get(name)?.getClip();
  const fireBase = get('FiringRifle');
  const fireUpper = get('ShotgunFireLevel');
  const pumpUpper = get('ShotgunPumpLevel');
  const clips = [
    composeUpperBody('Type97Fire', fireBase, fireUpper, fireUpper?.duration),
    composeUpperBody('Type97Pump', get('RifleAimingIdle'), pumpUpper, pumpUpper?.duration)
  ];
  for (const clip of clips) model.actions.set(clip.name, model.mixer.clipAction(clip));
  return clips.map(clip => ({name: clip.name, duration: clip.duration, tracks: clip.tracks.length, upperBodyTracks: clip.tracks.filter(isType97UpperTrack).length, ...clip.userData}));
}

import * as THREE from 'three';

/** Read an immutable quaternion track. Time is clip-local, in seconds. */
export function sampleReferenceQuaternion(track, time, result = new THREE.Quaternion()) {
  const { times, values } = track;
  if (times.length === 1 || time <= times[0]) return result.fromArray(values, 0).normalize();
  const last = times.length - 1;
  if (time >= times[last]) return result.fromArray(values, last * 4).normalize();
  let low = 0, high = last;
  while (high - low > 1) { const middle = (low + high) >> 1; if (times[middle] <= time) low = middle; else high = middle; }
  const end = new THREE.Quaternion().fromArray(values, high * 4).normalize();
  return result.fromArray(values, low * 4).normalize().slerp(end, (time - times[low]) / (times[high] - times[low])).normalize();
}

/** Sample immutable gun-local landmark positions (metres). */
export function sampleReferenceVector(track, time, result = new THREE.Vector3()) {
  const {times,values}=track, last=times.length-1;
  if(last===0||time<=times[0])return result.fromArray(values,0);
  if(time>=times[last])return result.fromArray(values,last*3);
  let low=0,high=last;
  while(high-low>1){const mid=(low+high)>>1;if(times[mid]<=time)low=mid;else high=mid;}
  return result.fromArray(values,low*3).lerp(new THREE.Vector3().fromArray(values,high*3),(time-times[low])/(times[high]-times[low]));
}

/** Apply the sampled reference to a per-frame merged mount, never to its saved config. */
export function applyReferenceGrip(mount, time) {
  const payload = mount.reference_grip;
  if (!payload) return mount;
  const fingers = { Right: {}, Left: {} };
  for (const [name, track] of Object.entries(payload.tracks)) {
    const value = sampleReferenceQuaternion(track, time).toArray();
    if (name === 'RightHand') mount.right_hand_quaternion_weapon = value;
    else if (name === 'LeftHand') mount.left_hand_quaternion_weapon = value;
    else fingers[name.includes('Right') ? 'Right' : 'Left'][name] = value;
  }
  mount.right_finger_local_quaternions = fingers.Right;
  mount.support_finger_local_quaternions = fingers.Left;
  const landmark=payload.left_middle_reference;
  if(landmark&&!mount.release_support_hand&&mount.left_grip){
    const desired=sampleReferenceVector(landmark.track,time);
    const offset=new THREE.Vector3().fromArray(mount.left_grip).sub(desired).multiplyScalar(mount.model_scale ?? 1)
      .applyQuaternion(new THREE.Quaternion().fromArray(mount.left_hand_quaternion_weapon).invert())
      .divideScalar(landmark.preview_scale)
      .add(new THREE.Vector3().fromArray(landmark.target_middle_native));
    mount.left_palm_offset_native=offset.toArray();
  }
  return mount;
}

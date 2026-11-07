// The inner left lapel is weighted partly to the upper arm. Its large axial
// rotation in low-ready clips pulls the neckline sideways. Keep the original
// skin outside that small torso region and restore it for every other action.
const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class ChestSkinningRelief {
  constructor(root, config) {
    this.entries = [];
    this.enabled = false;
    this.vertexCount = 0;
    if (!config) return;
    root.traverse(mesh => {
      if (!mesh.isSkinnedMesh || mesh.material?.name !== config.material) return;
      const geometry = mesh.geometry;
      const {position, skinIndex, skinWeight} = geometry.attributes;
      if (!position || !skinIndex || !skinWeight) return;
      const weights = skinWeight.clone(), joints = skinIndex.clone();
      const names = mesh.skeleton.bones.map(bone => bone.name.replace(/[^A-Za-z0-9]/g, ''));
      const spine = names.indexOf('mixamorigSpine2');
      if (spine < 0) return;
      let changed = 0;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const factor = smooth(...config.x.slice(0, 2), x) * (1 - smooth(...config.x.slice(2), x))
          * smooth(...config.y.slice(0, 2), y) * (1 - smooth(...config.y.slice(2), y))
          * smooth(...config.z, z);
        if (factor <= 1e-6) continue;
        const values = new Map();
        let moved = 0, torsoWeight = 0;
        for (let k = 0; k < 4; k++) {
          const index = skinIndex.array[i * 4 + k], weight = skinWeight.array[i * 4 + k];
          const cut = names[index] === 'mixamorigLeftArm' ? .95 : names[index] === 'mixamorigLeftShoulder' ? .7 : 0;
          const amount = weight * cut * factor;
          values.set(index, (values.get(index) || 0) + weight - amount);
          moved += amount;
          if (/^mixamorigSpine\d*$/.test(names[index])) torsoWeight += weight;
        }
        if (moved <= 1e-6) continue;
        if (torsoWeight > 1e-6) {
          for (const [index, weight] of values) {
            if (/^mixamorigSpine\d*$/.test(names[index])) values.set(index, weight + moved * weight / torsoWeight);
          }
        } else values.set(spine, (values.get(spine) || 0) + moved);
        const sorted = [...values].sort((a, b) => b[1] - a[1]).slice(0, 4);
        const sum = sorted.reduce((total, entry) => total + entry[1], 0);
        for (let k = 0; k < 4; k++) {
          joints.array[i * 4 + k] = sorted[k]?.[0] ?? 0;
          weights.array[i * 4 + k] = (sorted[k]?.[1] ?? 0) / sum;
        }
        changed++;
      }
      if (changed) {
        this.entries.push({geometry, originalJoints:skinIndex, originalWeights:skinWeight, joints, weights});
        this.vertexCount += changed;
      }
    });
  }

  setEnabled(enabled) {
    if (enabled === this.enabled) return;
    for (const entry of this.entries) {
      entry.geometry.setAttribute('skinIndex', enabled ? entry.joints : entry.originalJoints);
      entry.geometry.setAttribute('skinWeight', enabled ? entry.weights : entry.originalWeights);
    }
    this.enabled = enabled;
  }
}

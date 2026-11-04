import * as THREE from 'three';

// Small position-based preview of the same chain/capsules used by Godot.
// Call after AnimationMixer.update(), before renderer.render().
export class PonytailPhysics {
  constructor(model, config) {
    this.model = model;
    this.settings = config.settings;
    this.bones = ['ZG_Ponytail_01', 'ZG_Ponytail_02', 'ZG_Ponytail_03'].map(name => model.bones.get(name));
    this.colliders = config.colliders.map(c => ({
      bone: model.bones.get(c.bone),
      localA: new THREE.Vector3(...c.a), localB: new THREE.Vector3(...c.b),
      a: new THREE.Vector3(), b: new THREE.Vector3(), radius: c.radius, worldRadius: 0
    }));
    this.enabled = true;
    this.positions = [];
    this.previous = [];
    this.baseQuaternions = [];
    this.goals = [];
    this.lengths = [];
    this.updates = 0;
    this.collisionCorrections = 0;
    this.minJointClearance = 0;
    this.reset();
  }

  _captureAnimation() {
    this.model.root.updateMatrixWorld(true);
    this.scale = this.model.wrapper.getWorldScale(new THREE.Vector3()).x;
    this.goals = this.bones.map(b => b.getWorldPosition(new THREE.Vector3()));
    this.goals.push(this.bones[2].localToWorld(new THREE.Vector3(0, this.settings.end_bone_length, 0)));
    this.baseQuaternions = this.bones.map(b => b.quaternion.clone());
    this.lengths = this.bones.map((b, i) => this.goals[i].distanceTo(this.goals[i + 1]));
    this.radii = this.settings.joint_radii.map(r => r * this.scale);
    for (const c of this.colliders) {
      c.a.copy(c.localA).applyMatrix4(c.bone.matrixWorld);
      c.b.copy(c.localB).applyMatrix4(c.bone.matrixWorld);
      c.worldRadius = c.radius * c.bone.matrixWorld.getMaxScaleOnAxis();
    }
  }

  reset() {
    this._captureAnimation();
    this.positions = this.goals.map(p => p.clone());
    this.previous = this.goals.map(p => p.clone());
    this.minJointClearance = 0;
  }

  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.bones.forEach((bone, i) => bone.quaternion.copy(this.baseQuaternions[i]));
      this.model.root.updateMatrixWorld(true);
    }
    this.reset();
  }

  _closest(point, capsule) {
    const axis = capsule.b.clone().sub(capsule.a);
    const t = THREE.MathUtils.clamp(point.clone().sub(capsule.a).dot(axis) / axis.lengthSq(), 0, 1);
    return capsule.a.clone().addScaledVector(axis, t);
  }

  _project(point, radius, capsule, fallback) {
    const center = this._closest(point, capsule);
    const normal = point.clone().sub(center);
    const distance = normal.length();
    const required = capsule.worldRadius + radius + (this.settings.collision_padding ?? .0012) * this.scale;
    if (distance >= required) return new THREE.Vector3();
    if (distance > 1e-8) normal.multiplyScalar(1 / distance);
    else normal.copy(fallback).normalize();
    this.collisionCorrections++;
    return normal.multiplyScalar(required - distance);
  }

  _constraints() {
    const p = this.positions;
    const maxAngle = THREE.MathUtils.degToRad(this.settings.max_swing_degrees ?? 85);
    for (let iteration = 0; iteration < 10; iteration++) {
      p[0].copy(this.goals[0]);
      for (let i = 0; i < 3; i++) {
        const delta = p[i + 1].clone().sub(p[i]);
        const length = delta.length();
        const correction = delta.multiplyScalar((length - this.lengths[i]) / Math.max(length, 1e-9));
        if (i === 0) p[i + 1].sub(correction);
        else { p[i].addScaledVector(correction, .5); p[i + 1].addScaledVector(correction, -.5); }
        const desired = p[i + 1].clone().sub(p[i]).normalize();
        const target = this.goals[i + 1].clone().sub(this.goals[i]).normalize();
        const swing = new THREE.Quaternion().setFromUnitVectors(target, desired);
        const angle = target.angleTo(desired);
        if (angle > maxAngle) {
          swing.slerp(new THREE.Quaternion(), 1 - maxAngle / angle);
          p[i + 1].copy(p[i]).addScaledVector(target.applyQuaternion(swing), this.lengths[i]);
        }
      }
      for (let i = 0; i < 3; i++) {
        for (const c of this.colliders) {
          const fallback = this.goals[i + 1].clone().sub(this._closest(this.goals[i + 1], c));
          p[i + 1].add(this._project(p[i + 1], this.radii[i], c, fallback));
          // Keep the length of a thick strand outside the body, not only its tip.
          for (const t of [.35, .65]) {
            const sample = p[i].clone().lerp(p[i + 1], t);
            const correction = this._project(sample, this.radii[i] * .85, c, fallback);
            if (i === 0) p[i + 1].addScaledVector(correction, 1 / t);
            else {
              const denominator = (1 - t) ** 2 + t ** 2;
              p[i].addScaledVector(correction, (1 - t) / denominator);
              p[i + 1].addScaledVector(correction, t / denominator);
            }
          }
        }
      }
    }
    p[0].copy(this.goals[0]);
  }

  _applyToSkeleton() {
    for (let i = 0; i < 3; i++) {
      const bone = this.bones[i];
      bone.quaternion.copy(this.baseQuaternions[i]);
      bone.updateWorldMatrix(true, true);
      const origin = bone.getWorldPosition(new THREE.Vector3());
      const tail = i < 2 ? this.bones[i + 1].getWorldPosition(new THREE.Vector3()) : bone.localToWorld(new THREE.Vector3(0, this.settings.end_bone_length, 0));
      const actualDirection = tail.sub(origin).normalize();
      const endpoint = this.positions[i + 1].clone();
      // Resolve contacts again on the fixed-length sphere of the actual joint.
      // The preceding parent rotation can shift this origin away from the PBD estimate.
      for (let iteration = 0; iteration < 18; iteration++) {
        endpoint.sub(origin).normalize().multiplyScalar(this.lengths[i]).add(origin);
        for (const c of this.colliders) {
          const fallback = this.goals[i + 1].clone().sub(this._closest(this.goals[i + 1], c));
          endpoint.add(this._project(endpoint, this.radii[i], c, fallback));
          for (const t of (i === 0 ? [.65] : [.35, .65])) {
            const sample = origin.clone().lerp(endpoint, t);
            endpoint.addScaledVector(this._project(sample, this.radii[i] * .85, c, fallback), 1 / t);
          }
        }
      }
      const desiredDirection = endpoint.sub(origin).normalize();
      const worldRotation = bone.getWorldQuaternion(new THREE.Quaternion());
      const change = new THREE.Quaternion().setFromUnitVectors(actualDirection, desiredDirection);
      worldRotation.premultiply(change);
      const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.copy(parentRotation.invert().multiply(worldRotation));
      bone.updateWorldMatrix(false, true);
    }
    // Store actual fixed-length skeletal endpoints, rather than a stretched solver approximation.
    this.positions = this.bones.map(b => b.getWorldPosition(new THREE.Vector3()));
    this.positions.push(this.bones[2].localToWorld(new THREE.Vector3(0, this.settings.end_bone_length, 0)));
    this.minJointClearance = Infinity;
    for (let i = 0; i < 3; i++) for (const c of this.colliders) {
      this.minJointClearance = Math.min(this.minJointClearance, this.positions[i + 1].distanceTo(this._closest(this.positions[i + 1], c)) - c.worldRadius - this.radii[i]);
    }
  }

  update(delta) {
    if (!this.enabled) return;
    this._captureAnimation();
    const dt = Math.min(Math.max(delta, 0), 1 / 15);
    const steps = Math.max(1, Math.ceil(dt * 60));
    const h = dt / steps;
    const drag = Math.pow(1 - this.settings.drag, h * 60);
    const spring = 18 + this.settings.stiffness * 65;
    const gravity = new THREE.Vector3(...this.settings.gravity_direction).multiplyScalar(this.settings.gravity * this.scale);
    for (let step = 0; step < steps; step++) {
      for (let i = 1; i <= 3; i++) {
        const point = this.positions[i];
        const old = point.clone();
        const velocity = point.clone().sub(this.previous[i]).multiplyScalar(drag);
        const acceleration = this.goals[i].clone().sub(point).multiplyScalar(spring).add(gravity);
        point.add(velocity).addScaledVector(acceleration, h * h);
        this.previous[i].copy(old);
      }
      this._constraints();
    }
    this._applyToSkeleton();
    this.updates++;
  }

  getDiagnostics() {
    return { active: this.enabled, updates: this.updates, collisionCorrections: this.collisionCorrections, minJointClearance: this.minJointClearance };
  }
}

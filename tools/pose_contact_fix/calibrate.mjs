import fs from "node:fs";
import * as T from "three";
import { measureHands } from "../characters/resistance_hand_geometry_r47.mjs";
import { read } from "../qa/validate_pf89.mjs";
const V = (a) => new T.Vector3().fromArray(a),
  Q = (a) => new T.Quaternion().fromArray(a).normalize();
function frame(long, normal) {
  const y = long.clone().normalize(),
    z = normal.clone().addScaledVector(y, -normal.dot(y)).normalize(),
    x = new T.Vector3().crossVectors(y, z).normalize();
  return new T.Quaternion().setFromRotationMatrix(
    new T.Matrix4().makeBasis(x, y, z),
  );
}

async function palmMarkers(file) {
  const root = (await read(file)).scene;
  root.updateMatrixWorld(true);
  const bones = {};
  root.traverse((o) => {
    if (o.isBone) bones[o.userData.name || o.name] = o;
    if (o.isMesh) o.material = new T.MeshBasicMaterial({ side: T.DoubleSide });
  });
  const markers = {};
  for (const side of ["Left", "Right"]) {
    const get = (n) => bones["mixamorig:" + side + "Hand" + n],
      hand = get(""),
      p = hand.getWorldPosition(new T.Vector3()),
      long = get("Middle1")
        .getWorldPosition(new T.Vector3())
        .sub(p)
        .normalize();
    const across = get("Index1")
        .getWorldPosition(new T.Vector3())
        .sub(get("Pinky1").getWorldPosition(new T.Vector3()))
        .normalize(),
      inward = new T.Vector3()
        .crossVectors(across, long)
        .normalize()
        .multiplyScalar(side === "Right" ? 1 : -1);
    const center = get("Middle1")
      .getWorldPosition(new T.Vector3())
      .lerp(p, 0.18);
    const hit = new T.Raycaster(
      center.clone().addScaledVector(inward, 0.06),
      inward.clone().negate(),
    )
      .intersectObject(root, true)
      .find((h) => h.point.distanceTo(center) < 0.035);
    if (!hit) throw Error("No palm skin marker " + side);
    const o = hit.object,
      ids = [hit.face.a, hit.face.b, hit.face.c],
      pts = ids.map((i) => o.getVertexPosition(i, new T.Vector3()));
    markers[side] = {
      contact: hand.worldToLocal(hit.point.clone()).toArray(),
      mesh: o.name,
      vertices: ids,
      barycentric: new T.Triangle(...pts)
        .getBarycoord(o.worldToLocal(hit.point.clone()), new T.Vector3())
        .toArray(),
    };
  }
  return markers;
}
const folders = {
    diandian: "diandian-classic",
    zhigeng: "zhigeng",
    military: "resistance",
    vest: "resistance",
    linxu: "linxu",
  },
  bySite = {};
for (const [cid, folder] of Object.entries(folders)) {
  const dir = `web/motion-labs/${folder}-motion-lab`,
    cfg = JSON.parse(fs.readFileSync(dir + "/assets/weapon_attachment.json")),
    ch = cfg.characters[cid],
    file = ["diandian", "zhigeng"].includes(cid)
      ? `${dir}/assets/${cid}_fixed.glb`
      : `${dir}/assets/characters/${cid}/character.glb`,
    hands = await measureHands(file),
    cal = { hands, markers: await palmMarkers(file), weapons: {} };
  for (const side of ["Left", "Right"])
    hands[side].contact = cal.markers[side].contact;
  for (const [id, data] of Object.entries(cfg.weapons)) {
    const gun = (await read(`${dir}/assets/weapons/${id}.glb`)).scene;
    gun.updateMatrixWorld(true);
    gun.traverse((o) => {
      if (o.isMesh)
        o.material = new T.MeshBasicMaterial({ side: T.DoubleSide });
    });
    const ray = new T.Raycaster(),
      hit = (p, d) => {
        ray.set(V(p), V(d));
        return ray.intersectObject(gun, true)[0]?.point;
      };
    const pistol = data.type === "pistol",
      rocket = id === "pf89",
      fixed = id === "qjz89";
    let rightY = data.right_grip[1],
      rightZ = data.right_grip[2],
      leftZ = data.left_grip[2];
    if (id === "m870") {
      rightY = -0.071;
      rightZ = 0.162;
      leftZ = -0.24;
    }
    if (id === "qbu85") {
      rightY = -0.069;
      rightZ = 0.385;
      leftZ = 0.015;
    }
    if (id === "qcq171") leftZ = -0.24;
    let rg =
      hit([0.3, rightY, rightZ], [-1, 0, 0]) ||
      V(data.right_palm_surface || data.right_grip);
    rg.x += 0.001;
    let lg = pistol
      ? V(data.left_grip)
      : hit([id === "qbu85" ? -0.005 : 0, -0.4, leftZ], [0, 1, 0]) ||
        V(data.left_grip);
    if (!pistol) lg.y -= 0.001;
    const gripUp = V(data.right_grip_axis || [0, 0.95, -0.3]).normalize(),
      palmInward = new T.Vector3(-1, 0, 0),
      forward = new T.Vector3().crossVectors(palmInward, gripUp).normalize();
    if (id === "m870") forward.set(0, -0.2, -1).normalize();
    const rq = frame(forward, palmInward)
      .multiply(Q(hands.Right.frame).invert())
      .multiply(Q(hands.Right.restWorld));
    const lq = frame(
      pistol ? new T.Vector3(0, 0.2, -1) : new T.Vector3(0.92, 0, -0.4),
      pistol ? new T.Vector3(-1, 0, 0) : new T.Vector3(0, -1, 0),
    )
      .multiply(Q(hands.Left.frame).invert())
      .multiply(Q(hands.Left.restWorld));
    const butt = data.butt_contact || [
      0,
      0.02,
      new T.Box3().setFromObject(gun).max.z,
    ];
    cal.weapons[id] = {
      right: rg.toArray(),
      left: lg.toArray(),
      rightRotation: rq.toArray(),
      leftRotation: lq.toArray(),
      butt,
    };
  }
  (bySite[dir] ??= {})[cid] = cal;
  console.log(cid, "measured", Object.keys(cal.weapons).length, "weapons");
}
for (const [dir, data] of Object.entries(bySite))
  fs.writeFileSync(
    dir + "/grip-calibration.js",
    "// Measured from current character palm meshes and weapon surfaces. Generated by tools/pose_contact_fix/calibrate.mjs.\nexport const calibration = " +
      JSON.stringify(data, null, 2) +
      ";\n",
  );

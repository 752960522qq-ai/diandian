import fs from "node:fs";
import assert from "node:assert/strict";
import { runtime as male } from "../weapon_v7_refined/runtime.mjs";
import { runtime as female } from "../weapon_v6_two/runtime.mjs";
import { installFixedGunMotions } from "../../web/motion-labs/diandian-classic-motion-lab/fixed-machine-gun.js";
const report = { characters: [], failures: [], samples: 0 },
  N = Number(process.env.SAMPLES || 20);
for (const cid of (
  process.env.CIDS || "military,vest,linxu,zhigeng,diandian"
).split(",")) {
  const f = ["diandian", "zhigeng"].includes(cid),
    r = await (f ? female(cid) : male(cid)),
    a = f ? r.attachment : r.model.attachment;
  if (f) installFixedGunMotions(r.model);
  const pose = (w, m, t) => (f ? r.poseAt(w, m, t) : r.model.pose(m, t, w)),
    duration = (w, m) => (f ? r.duration(w, m) : r.model.duration(m, w));
  const row = { character: cid, clips: [], seekDrift: 0, nonArmDrift: 0 };
  const originalUpdate = a.updateAuthored.bind(a);
  a.updateAuthored = (...args) => {
    const result = originalUpdate(...args);
    r.rawBody = new Map(
      [...new Set(r.model.bones.values())]
        .filter((b) => !/(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(b.name))
        .map((b) => [
          b,
          [
            ...b.position.toArray(),
            ...b.quaternion.toArray(),
            ...b.scale.toArray(),
          ],
        ]),
    );
    return result;
  };
  for (const w of Object.keys(r.cfg.weapons)) {
    const pistol = r.cfg.weapons[w].type === "pistol";
    const motions =
      w === "qjz89"
        ? ["QJZ89Idle", "QJZ89Aim"]
        : pistol
          ? ["PistolIdle", "PistolWalk", "PistolAimingIdle", "PistolShooting"]
          : [
              "RifleIdle",
              "RifleWalk",
              "RifleRun",
              "RifleAimingIdle",
              "FiringRifle",
              ...(["m870", "type97hawk"].includes(w) ? ["ShotgunPump"] : []),
            ];
    if (!f && w === "m870") motions.push("ShotgunAimLevel", "ShotgunAimUp", "ShotgunAimDown");
    if (f && w === "m870")
      motions.push(
        "ShotgunAimLevel",
        "ShotgunAimUp",
        "ShotgunAimDown",
        ...["RifleAimingIdle", "FiringRifle", "ShotgunPump"].flatMap((m) =>
          [-1, -0.5, 0, 0.5, 1].map((p) => m + "@" + p),
        ),
      );
    for (const m of motions) {
      let d;
      try {
        d = duration(w, m);
      } catch {
        continue;
      }
      if (!(d > 0)) continue;
      let maxL = 0,
        maxR = 0,
        maxW = 0,
        maxShoulder = 0,
        maxMove = 0;
      for (let i = 0; i <= N; i++) {
        const t = (d * i) / N,
          s = pose(w, m, t);
        assert.equal(s.gripRevision, "contact-r49", `${cid} ${w} ${m}: constraint evaluated`);
        assert(Number.isFinite(s.leftContactErrorM) && Number.isFinite(s.rightContactErrorM), `${cid} ${w} ${m}: measured skin contact`);
        report.samples++;
        maxL = Math.max(maxL, s.leftContactErrorM || 0);
        maxR = Math.max(maxR, s.rightContactErrorM || 0);
        maxW = Math.max(
          maxW,
          s.leftWristBendDegrees || 0,
          s.rightWristBendDegrees || 0,
        );
        maxShoulder = Math.max(maxShoulder, s.shoulderContactErrorM || 0);
        maxMove = Math.max(maxMove, s.reachFitTranslationM || 0);
        for (const [b, values] of r.rawBody) {
          const actual = [
            ...b.position.toArray(),
            ...b.quaternion.toArray(),
            ...b.scale.toArray(),
          ];
          const drift = Math.max(
            ...values.map((v, j) => Math.abs(v - actual[j])),
          );
          if (drift > row.nonArmDrift) {
            row.nonArmDrift = drift;
            row.driftBone = b.name;
          }
        }
        for (const b of new Set(r.model.bones.values()))
          assert(
            [...b.quaternion.toArray(), ...b.position.toArray()].every(
              Number.isFinite,
            ),
            `${cid} ${w} ${m} finite`,
          );
      }
      const entry = {
        weapon: w,
        motion: m,
        duration: d,
        maxLeftM: maxL,
        maxRightM: maxR,
        maxWristDegrees: maxW,
        maxShoulderM: maxShoulder,
        maxReachFitM: maxMove,
      };
      row.clips.push(entry);
      if (maxL > 0.005 || maxR > 0.005 || maxW > 65)
        report.failures.push({ character: cid, ...entry });
    }
  }
  if (f) {
    row.aimPitchDegrees = [-1, -0.5, 0, 0.5, 1].map(p => {
      const motion = "RifleAimingIdle@" + p;
      return pose("m870", motion, duration("m870", motion) / 2).barrelPitchDegrees;
    });
    assert(row.aimPitchDegrees.every((v, i, xs) => i === 0 || v > xs[i - 1] + 1), `${cid}: continuous shotgun aim remains monotonic`);
    assert(row.aimPitchDegrees[0] < -45 && row.aimPitchDegrees[0] > -70 && row.aimPitchDegrees[4] > 45 && row.aimPitchDegrees[4] < 70, `${cid}: shotgun aim endpoints retained`);
  }
  const snapshot = () =>
    [...new Set(r.model.bones.values())].flatMap((b) => [
      ...b.position.toArray(),
      ...b.quaternion.toArray(),
      ...b.scale.toArray(),
    ]);
  pose("qsz92", "PistolShooting", 0.5);
  const first = snapshot();
  for (let i = 0; i < 4; i++) {
    pose("m870", "ShotgunPump", 0.73);
    pose("type56_1", "RifleIdle", 4);
    pose("qsz92", "PistolShooting", 0.5);
  }
  row.seekDrift = Math.max(...snapshot().map((x, i) => Math.abs(x - first[i])));
  assert(row.seekDrift < 1e-5, `${cid}: switching drift ${row.seekDrift}`);
  assert(row.nonArmDrift < 1e-7, `${cid}: changed non-arm baseline`);
  report.characters.push(row);
  console.log(
    cid,
    "clips",
    row.clips.length,
    "failures",
    report.failures.filter((r) => r.character === cid).length,
    "seekDrift",
    row.seekDrift,
  );
}
fs.mkdirSync("work/pose-fix", { recursive: true });
fs.writeFileSync(
  "work/pose-fix/validation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "SAMPLES",
  report.samples,
  "FAILURES",
  JSON.stringify(report.failures),
);
if (report.failures.length) process.exitCode = 1;

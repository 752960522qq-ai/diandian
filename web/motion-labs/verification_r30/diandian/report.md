Diandian Type97 RifleRun is accepted for integration.

The replacement is a full flat resolved Type56-1 RifleRun mount, with stale Type97-specific right-arm IK, elbow pole, forearm twist, finger overrides, body offset and nested motions removed/nullified. Geometry adaptations preserve Type97 model_scale=1 and its actual right grip. Left support uses the palm center [.003,.043,-.009] and rear/lower pump point [-.013,-.065,-.145], full support weight1.

Original RifleRun body/leg animation, right arm, gun orientation and motion timing remain the Type56-1 reference. Full-cycle 162 samples across .6666666865s (~241.5Hz) show body position error0; normalized body/right-arm rotation difference<=3.42e-6 degrees; gun orientation difference<=2.42e-6 degrees. Maximum left palm target residual6.81e-8m and right residual2.31e-16m. Maximum adjacent arm rotation1.262 degrees; no IK branch jump. Left elbow within3.89cm of the reference despite differing actual gun geometry. Left wrist range32.1–40.75 degrees (reference maximum48.87).

Actual rendered front/top/side views at phases0,.1666667,.3333333,.5 show a coherent forward-carried weapon, bent support elbow and palm under the pump, with the same body/right-arm silhouette as56. Files prefixed render-* are stable800x800 WebGL screenshots. Earlier UI screenshots are viewport-dependent and should not be used for review.

Only run-patch.json is intended for integration into characters.diandian.mounts.type97hawk.motions.RifleRun. Production files were not edited. Git was not pushed. Deployment remains root-owned.

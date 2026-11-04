# r23 independent reproduction of r22 defects

Frozen baseline: `baseline_manifest.json` plus copies of both sites’ JS/config/HTML/CSS in `baseline/`. Large assets were hashed, not duplicated.

Reproduced both actors at RifleIdle 8.26 s, and Diandian at 0 / 7.44 / 8.26 s, using eight camera views each. JS/config were routed from the frozen baseline; real character skin and clothing were rendered with updated skeleton matrices.

Observed defects in Diandian:

- Skin-colored pointed faces protrude through the left jacket side below the armpit; two separate exposed tips are especially clear in `before_diandian_idle_8.26_left_mid.png` and high left/front views.
- The left shoulder/upper-arm sleeve is compressed into an awkward folded shape; the sleeve edge by the elbow and the forearm direction do not form a natural whole-arm silhouette. Wrist contact and timeline continuity are insufficient to establish a visual fix.
- The back and rear waist closure look intact in the captured 8.26 s back views. This is a preservation requirement for the next candidate.

No prior-weapon regression sweep has been run before the candidate is merged. Final acceptance must compare the same cameras, actual skin and clothing, and the whole shoulder/elbow/wrist chain.

Production verification by root: `/workspace/work/type97_r23/live_before.json` records authenticated HTTPS response hashes for the actual app.js and Diandian character GLB, both matching r22. The reported visual defects were present in the published r22 files.

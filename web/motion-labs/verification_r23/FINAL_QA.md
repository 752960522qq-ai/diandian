# r23 final integrated QA

**Result: PASS for the frozen limited r23 changes.** One final browser regression run completed; no production files, deployment, or repository synchronization were performed by QA.

## Visible result

- The same 8.26 s cameras show the two pointed skin-colored fragments at Diandian’s left armpit/rib-side jacket are gone. The left elbow/sleeve transition and upper-arm silhouette in RifleIdle visibly improve over r22.
- Reviewed both characters at Idle 8.26 s in eight views, plus selected front/side/back views at 0 and 7.44 s. The captured front/side skin fragments stay absent. Back/waist closure shows no newly opened background gap in the reviewed views.
- Reviewed the captured Run, Aim, Fire, Pump and Reload front/side/back key poses. Existing source sleeve/vest intersections remain outside this limited fix. In particular, Walking’s existing jagged brown folds must not be described as completely repaired.

## Regression evidence

- 104 previous-weapon motion pose cases passed (52 per character, including 56-1 Walk), tolerance 1e-6; browser errors: zero.
- Type97 Walk, Run, Aim, Fire, Reload and Pump sampled poses are exactly unchanged from r22: six per character, maximum bone/weapon pose difference 0.
- Config diff is restricted to revision 22 → 23 and each character’s Type97 RifleIdle upper-arm twist weight 0 → 0.35 plus reference 180°. No rejected Walk/Run variant remains.
- Fire/Pump rifle body and right-side source tracks remain exact; shotgun left-side source tracks match within numeric precision. Seven Type97 motions × 121 samples per character passed grip-contact and deterministic seek checks.
- Actual browser geometry remains 800 mm long, width 55.319129 mm; pump stroke remains 44.855577646 mm. Pump end, motion-switch and weapon-switch resets passed. Original M1897 pump and pitch endpoints passed.
- At 390 px, all ten weapon buttons are enabled and fit within the viewport; no horizontal document overflow.

## Reviewable files

- `comparison_idle_8.26_before_after.jpg`: one same-camera left/right before/after image.
- `comparison_diandian_8.26.jpg`: three same-camera before/after pairs, including the user’s high right-front view.
- `integration.json`: compact pass result, scope, known limits, config diff and production SHA values.
- `verification.json.gz`: full one-run numeric/browser results.
- `baseline_manifest.json`: frozen r22 JS/config and asset SHA record.

## Frozen character asset

- diandian `assets/diandian_fixed.glb`: `a2533218537e38f4dbd2c3462dd2c68d082442cc12d7f8c0960032859eac3f02`
- zhigeng `assets/zhigeng_fixed.glb`: `95bcd799d7966058864b34836b3c2239e077f2db4335747ecfabd529242ed923`

Root independently confirmed published r22 response hashes before this repair (`live_before.json`); the original report reproduced a real r22 defect. The release step subsequently verified both published HTML/JS/config responses and the Diandian character GLB byte-for-byte against the frozen source; see `live_after_diandian.json`, `live_after_zhigeng.json` and `deployments.json`.

The reviewed finite poses support this targeted repair. This is not an exhaustive clothing collision certification. No additional scan is pending.

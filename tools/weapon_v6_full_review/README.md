# Linxu full motion visual review (read-only)

Production source: `web/motion-labs/linxu-motion-lab/` at start of this review, comparefix state. This harness does not write production assets or runtime files.

Official UI inventory: `web/motion-labs/verification_linxu_full_motion/linxu-ui-validation-matrix.json` (71 primary equipment-motion states plus five RifleRun_Before states). Of those, 65 non-longgun-run states are rendered here without body/equipment deduplication. The six longgun RifleRun states and five Before variants belong to the separate shoulder-collapse investigation.

- `export_linxu.mjs`: evaluates the actual Three `prepareRig().pose()` at 240 Hz, includes start/end, bakes runtime bone TRS and weapon/pump transforms into original textured skinned GLBs. Preserves effective skin weights. No replacement generated imagery.
- `render_linxu.py`: imports GLBs with scene fps **set to 240 before import**, renders original skinned character and equipment in Blender Cycles CPU, front/side/back. Default nine phases 0, 1/8, ... 1. `--continuous` produces 12 fps complete-cycle frames, including terminal pose. `--full` produces wider full-body views.
- `validate_linxu_times.{mjs,py}`: cross-checks matching Three/Blender bone world positions at multiple nonintegral times. Three action classes / 12 times / 72 positions. Maximum error 5.49e-7 m.
- `package_linxu.py`: composes labeled review strips and 12 fps triptych H.264 videos without changing animation.

No browser visual verification was performed. WebGL/browser socket access is unavailable; denied paths were not retried. Blender uses CPU Cycles. Experimental Workbench used software graphics but was slower; discarded test images and frames with an early time-import mismatch are isolated in `invalid_timing_*` and are **not valid review evidence**. Only final `frames/`, `frames-full/`, `sheets/`, and `videos/` count.

Caveats: nine sampled phases do not inspect every rendered real-time frame. 240 Hz refers to runtime baking, not pixel rendering. 12 fps video is reserved for risk cases documented in final coverage. Upper-body framing of armed actions intentionally prioritizes shoulders, neck, wrists, and fingers; wider locomotion passes supplement it. Mild source-authored mesh intersections are not automatic failures. Findings are source-relative and not a claim of absolute absence of problems.

## Final reviewed evidence

The lightweight user-facing package is `web/motion-labs/verification_weapon_v6_full_review/linxu/evidence/`. Open `index.html` or `复核报告.md`. It contains 65 main three-view sheets, 6 detail sheets, 7 full-body sheets, 10 playable triptych videos, all continuous-frame contact sheets, explicit coverage, source fingerprints, and equivalence proofs. It excludes invalid timing experiments, baked GLBs, raw PNG frames, and logs.

Totals: 1755 main + 582 continuous + 84 detail + 189 full-body = 2610 valid 512px renders. All main states and every continuous-sheet frame were visually inspected. `visual-review-log.json` records the inspected sets. `render-reuse-proof.json` proves the 65-state scope stayed identical after the final M870 Run-only shoulder correction: 47,631 samples, maximum world-matrix delta 0, unchanged character and gun meshes.

### Reproduction from the project root

Prerequisites: project's Node dependencies (including `three`), Blender with glTF support, Python/Pillow, and ffmpeg. The harness uses CPU Cycles, 2 threads, 4 samples. No graphics-browser setup is required. Do not enable denoising if Blender lacks OpenImageDenoise.

`node tools/weapon_v6_full_review/export_linxu.mjs`

`node tools/weapon_v6_full_review/calc_full_bounds.mjs`

`blender -b -t 2 -P tools/weapon_v6_full_review/render_linxu.py`

Continuous cases:

`blender -b -t 2 -P tools/weapon_v6_full_review/render_linxu.py -- --continuous none-Walk m870-FiringRifle m870-Reloading m870-ShotgunPump type64-RifleRun type64-PistolShooting type64-Reloading type97hawk-ShotgunPump qbz95-FiringRifle qbz95-Reloading`

Wider supplementary cases:

`blender -b -t 2 -P tools/weapon_v6_full_review/render_linxu.py -- --full qbz95-RifleWalk m870-RifleWalk type64-PistolWalk type64-RifleRun m870-ShotgunAimUp m870-ShotgunAimDown m870-ShotgunAimLevel`

Hand/shoulder closeups:

`blender -b -t 2 -P tools/weapon_v6_full_review/render_linxu.py -- --detail --close --times=0,0.333333,0.5 type64-PistolAimingIdle type54-PistolAimingIdle qsz92-PistolAimingIdle m870-ShotgunAimLevel`

`blender -b -t 2 -P tools/weapon_v6_full_review/render_linxu.py -- --detail --close --times=0,0.0166667,0.0333333,0.0375,0.0416667,0.05,0.0666667,0.0833333,0.1 m870-Reloading`

`blender -b -t 2 -P tools/weapon_v6_full_review/render_linxu.py -- --detail --close --times=0.65,0.7,0.725,0.7375,0.75,0.775,0.8 type56_1-Reloading`

Package images/videos with `python tools/weapon_v6_full_review/package_linxu.py` and `python tools/weapon_v6_full_review/package_continuous.py`. The build_evidence.py packager requires the completed visual review log and an explicit successful reuse proof; it does not assert visual acceptance automatically.

All runtime tools default to current production. `WEAPON_V6_SITE` can select a different site directory. Historical comparisons use `WEAPON_V6_BASELINE` as a repository-root override, defaulting to the sibling `character_adapt_baseline`. They are optional and never needed for current-site rendering. `verify_render_reuse.mjs --reference=SITE_DIRECTORY` compares an explicitly supplied old site with current production; without the option it records current source fingerprints only. No tool hard-depends on `work/` or the historical comparefix snapshot. Fixed evidence retains the original reviewed SHA and final-source SHA.

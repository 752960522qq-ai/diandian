# Three-character v6 natural weapon binding

## Install the delivered files

Use the complete verified file overlay or the standalone site snapshot. The installed site and animation packs are ready to use. **Do not run a generator to use or install the delivered files.**

- Current Linxu shoulder-fix snapshot: `web/motion-labs/verification_weapon_v6_three/linxu_verified_candidate_shoulderfix/site/index.html`.
- Current production trees: `web/motion-labs/linxu-motion-lab/` and `web/motion-labs/resistance-motion-lab/`.
- Source/baked animation bundles: `assets/characters/weapon_update_v6/{linxu,military,vest}/`.
- Frozen production hashes: `web/motion-labs/verification_weapon_v6_three/three-production-freeze-manifest.json`.

`install.py` is only a wiring helper for an engineering checkout that already contains this v6 overlay. It is **not** an installer from the untouched baseline. Do not describe or use it as one.

## Rebuild for engineering

The supplied rebuild scripts run from the repository root, using Node.js and `three@0.180.0`, the repository's GLTF loader/helper files, the current complete v6 overlay, and the complete original `81d5a485` reference checkout with materialized GLB assets.

The reference checkout defaults to a project sibling directory named `character_adapt_baseline`. To put it elsewhere, set `WEAPON_V6_BASELINE` to its absolute path. The parameter changes the reference **location**, not the approved reference content.

Example: `WEAPON_V6_BASELINE=/absolute/path/to/81d5a485-checkout node tools/weapon_v6_three/build.mjs linxu,military,vest`.

Rebuild only in an engineering copy. The generator writes animation bundles, site animation packs, and weapon attachment JSON. It must not run against the separately frozen site snapshot.

Historical note: before the shoulder fix, reference-path resolution alone was made portable. `portable-rebuild-equivalence.json` documents that earlier mechanical patch. The current shoulder-fix bundles are newly generated and embed the current candidate and builder SHA values; `generator-provenance.json` records both generations without presenting the old tool as the new source.

## Motion rules

- Four weapons only: M870, Type54, Type64, QSZ92. Existing character meshes, skin weights, inverse bind matrices, local bone lengths and short-neck geometry are untouched.
- Original `81d5a485` displayed M97/Type54/QSZ92 motion families and their actual time scales are the reference. A matching native target body clip is retained; otherwise the corresponding original action is anatomically retargeted, with root travel scaled by leg-length ratio.
- Pistol Run uses final **D**: original `RifleRun` full-body action and its 0.6666666865 s duration, with the original QSZ92 Run mount. No replacement arm composition is used.
- Pistol Reload uses original generic `Reloading`, 3.2999999523 s, and the original QSZ92 reload mount; the left hand remains released. There is no new magazine-prop animation.
- Original `LeonPistolIdle` is a static 0.0333333351 s pose. It stays static. No long target body cycle is squeezed into that interval. Original static ShotgunAimDown is treated the same way.
- M870 Fire/Pump/Reload retain the original distinct action trajectories and source durations. Pump timing comes from the original curve, with amplitude mapped to the new 75 mm mechanism.
- M870 Idle/Walk keep the original low-carry identity and support near the metal tube/receiver underside. Support correction is capped at 25 mm. Other supported M870 actions allow at most 90 mm of support-arm position correction. No shoulder assistance, artificial shoulder-pocket anchor, wrist-local rotation rewrite, finger rewrite, or surface-depth optimization is applied in the new runtime branch.
- **Shoulder fix, M870 Run only:** for Linxu, military, and vest, the source M97 `RifleRun` mount keeps its authored wrist direction (`left_hand_quaternion_weapon: null`) and disables the two added axial redistributions (`support_forearm_twist_weight: 0`, `support_upper_arm_twist_weight: 0`). This is inline in `candidate.mjs`; no additional policy helper is required. All other 27 clips have identical sample bytes. Gun tracks and attachment JSON remain identical. The left elbow/wrist paths change by about 5 cm for Linxu and 5–7 cm for military/vest; shoulder points, body, legs, right arm, bone lengths, meshes, and weights do not change.
- Type64 inherits the original Type54 action and finger posture; it has an independent gun transform. The v5 upright-thumb overrides are gone.
- The only authorized old unarmed-motion change is Linxu Walk: approved sigma=1 filtering of the Hips.y terrain compensation, maximum 3.30 mm. Its new source SHA is `9a451d615d3135ecf10abc412e48494ff64541f8005a97e77e8a703afa87e103`. Normal gait motion remains.
- Original UI one-shot rules are retained. New sources are sampled at 60 Hz or 240 Hz without changing clip duration.

## Verified scope and limits

- Runtime vs baked bundle: 84 weapon/action pairs, 25 phase samples each; all passed. Maximum interpolated bone-position discrepancy 3.64 mm; gun-root discrepancy 0.63 mm.
- Legacy regression: 60 samples per character, all non-authorized local transforms unchanged to numeric precision. The approved Linxu Walk difference is reported separately.
- Transition regression: 24 new-weapon-to-old-weapon/unarmed sequences per character. No visible wrong gun, wrist/finger residue, old-gun root change, or M870 pump residue.
- Static sources: 480 samples at alternating 24/30/60/120 Hz and irregular steps. Bone/gun movement stays at floating-point noise.
- Godot: isolated exact-name mapping to each original Skeleton3D and AnimationPlayer seek/advance playback passed. This is not production-controller integration.
- Actual skinned Blender renders cover M870 nine motion families with multiple phases and three views; Type64 dynamic classes and the other pistol aiming grips are also shown. Linxu final D Run has a nine-phase sheet.
- Browser/WebGL/UI execution was **not tested**: the execution environment blocks Chromium socket creation. No browser pass is claimed.
- Slightly loose supporting fingers in the D pistol run are intentionally retained. They are a non-blocking visual limitation, preferred over changing the original wrist/shoulder pose or inventing a closed grip. Minor intersections remain acceptable under the user's stated priority.

No push, upload or deployment was performed by this worker.

## Run-comparison control hotfix

The comparison-control correction remains in the current shoulder-fix site. `linxu_verified_candidate_comparefix/site/` is now an immutable pre-shoulderfix reproduction baseline, not the current entry. `linxu_compare_run_hotfix/` contains the earlier two-file patch only. Old weapon comparison remains available; the four new weapons hide/ignore that legacy comparison. `compare-run-hotfix-validation.json` was rerun after the shoulder fix.

## Shoulder-fix validation and release limits

`shoulderfix-scope-validation.json` proves the production bake changed only M870 Run left arm/forearm/hand/finger rotation samples and provenance metadata. Other clips, timing, translations, models, old-weapon data, and all hand-relative gun tracks remain unchanged. `shoulderfix-production-skin-validation.json` compares actual production `prepareRig` skin to the independently reviewed source candidate over 161 phases per character; maximum shoulder/elbow/wrist skin difference is below 0.88 mm.

The full Linxu numeric UI inventory and scan were refreshed: 76 review rows, 49,413 time samples, and 5,776 ordered selection transitions. These are numeric coverage, not a substitute for surface review. Linxu source-candidate skin was separately reviewed over 41 complete-cycle frames in three views; military/vest were reviewed at five phases in three views, including the weakest elbow-metric phase. The compact independent Linxu evidence is under `verification_weapon_v6_shoulder/evidence/`.

This worker has frozen the approved shoulder correction only. Overall package completion remains with the parent and the separate all-motion review; this document does not declare the entire task complete. Earlier candidate/debug images and scripts describe their pinned source hashes and should not be rerun against the new production tree as if they still represented the old generation.

# r23 final: Type97 Idle-only upper-arm twist distribution

Frozen integration files:

- `patch.json`: only the two character Type97 `motions.RifleIdle` entries receive `support_upper_arm_twist_weight: .35` and `support_upper_arm_twist_reference_degrees: 180`.
- `diandian-weapon-attachment.js` / `zhigeng-weapon-attachment.js`: identical complete module files, based on r22. A final optional `upperTwistReference=0` parameter is passed from the support mount to the existing twist routine. Default behavior and all right-arm calls remain the same.
- `diandian-candidate-config.json` / `zhigeng-candidate-config.json`: complete configs for route-based preview. Parsed config comparison confirms the only changes from r22 are those two Idle fields per character.

Do not use the broader `upper35` walking/running experiment or any images/data under `rejected-global180` as the final candidate. `validation_three_motion_trial.json` is historical exploratory data; only its exact matching Idle samples were extracted to `idle_validation.json`. The final configuration leaves Walk, Run, Aim, Fire, Pump and Reloading at r22 values.

## Diagnosis and visual evidence

The r22 change removed upper-arm distribution entirely to stop the ±180° branch discontinuity. The discontinuity was removed, but real surface distortion at the elbow and rolled sleeve remained. At Diandian Idle 8.26 s the cuff converges into a sharp forward point and the bare elbow/forearm root appears pinched. Restoring moderate upper-arm distribution, with a reference centered on 180°, makes that cuff/forearm junction a continuous curve without changing shoulder, elbow or wrist position, gun orientation, hand orientation, finger source, or the animation layers.

Direct identical-camera evidence:

- `compare_original_diandian_RifleIdle_8.26_frontHigh.png` vs `compare_final_diandian_RifleIdle_8.26_frontHigh.png`
- `before_diandian_r22_armLeft.png` vs `test_diandian_upper35_armLeft.png` (reverse side, clear elbow/cuff view)
- `final_zhigeng_RifleIdle_8.26_leftMid.png` and `final_zhigeng_RifleIdle_8.26_frontHigh.png`

The final Idle configuration is exactly the same as the earlier `upper35` Idle experiment; the later scope reduction only removes its Walk/Run fields. Whole shoulder–upper arm–elbow–forearm views were inspected at Idle 0, 2, 4, 6, 7.44 and 8.26 s, from the front above and reverse side, as well as hand-top views. It improves the pinched elbow/cuff transition. This does not establish that every original clothing fold is natural.

The triangular skin patch under the left armpit belongs to the separate r18 body fill and is being fixed by the clothing agent. These left-arm captures intentionally retain the unmodified r22 body mesh so that pose comparison is isolated.

The original rolled-jacket mesh also has jagged brown strips intersecting the gray tank top during Walk, visible before this change. The proposed upper-arm distribution made some of those strips longer at Walk .35 s, so the final patch deliberately excludes Walk and Run. This is visible in `compare_{original,final}_diandian_RifleWalk_0.35_frontHigh.png`; those final-named walking captures are rejected trials, not a claim of a corrected walking jacket.

## Validation of the accepted Idle change

Both characters' complete 8.57 s Idle clips were sampled at 240 Hz (2057 samples each), including exact 7.44 / 8.26 s and dense local samples. Quaternion distances account for q / −q equivalence.

| Character | Maximum adjacent upper-arm local step | forearm local step | hand local step | elbow displacement |
| --- | ---: | ---: | ---: | ---: |
| Diandian | .0293° | .1476° | .1244° | .1893 mm |
| Zhigeng | .0369° | .1594° | .1315° | .1756 mm |

The selected upper branch remains far from its 0° / 360° seam: Diandian 166.67–184.56°, Zhigeng 141.08–163.76°. Idle remained identical under out-of-order seek to within 2.5×10⁻⁶° numeric round-off during the trial; this branch uses no history-dependent unwrapping.

`idle_validation.json` contains the accepted Idle local bone samples and exact complaint-time pose. `anchor_validation.json` checks the final Idle-only configuration against r22 at four phases of each motion. The non-Idle motion local arm/hand quaternions and elbow positions match element-for-element in both characters (maximum absolute element difference exactly 0 across six unchanged motions × four phases × upper/forearm/hand quaternions and elbow positions). Their configuration and default reference are unchanged.

No production site or main repository files were modified by this agent. Root should integrate this patch with the separate clothing mesh fix, then perform the final combined multi-angle check.

# R48 empty-handed Idle shoulder correction

Scope: the two resistance characters' **Idle**, with no weapon equipped. This is not RifleIdle. R47 used 3° shoulder yaw and 6° upper-arm abduction but did not elevate the clavicles. R48 adds a conservative 8° elevation in the moving torso frame. Upper-arm rotations compensate so the arm's world direction stays the same instead of adding a wide-arm or shrug pose.

## Actual rendered comparisons

Blender 4.x Cycles imports of the real character and corrected motion GLBs, same lighting and camera, sampled at frame 9 (approximately 0.267 s). There is no pose paint-over. The comparison image contains both versions together.

- `military-idle-front.png`, `vest-idle-front.png`: **left R47 before, right R48 after**.
- `military-idle-quarter.png`, `vest-idle-quarter.png`: **left R47 before, right R48 after**.
- `military-idle-back.png`, `vest-idle-back.png`: **left R48 after, right R47 before**, because the camera faces the back of the same two placed models.

The front and back shoulder contours sit slightly higher, without changing the head, torso, elbow bend, hand orientation, or lower body. Visual inspection covers these sampled views, not all possible continuous-time clothing intersections.

## Verification

- `assets/characters/resistance_r48/idle-report.json`: four rotation channels changed per character; **all other 32 clips and every unrelated Idle channel are identical**. Mesh, original rig and retarget calibration are unchanged.
- Clavicle endpoint lift over all 251 authored keys: military 8.751–8.862 mm native, vest 8.853–8.938 mm native. At the site's 1.75× preview scale this is approximately **15.3–15.6 mm**.
- `assets/characters/resistance_r48/idle-validation.json`: **501 samples per character at 60 Hz**, no nonfinite transforms, no other-bone local transform changes. Maximum upper-arm direction deviation below 0.000012°. Maximum adjacent-sample shoulder rotation 0.0481°.
- Minimum palm-to-leg axis distance 113.0 mm military / 114.7 mm vest in native units. This is an axis proxy, **not a mesh collision test**.
- This subtask does not assert a full web-browser run, Godot integration, publication, or exhaustive surface collision clearance.

## Reproduce

From the repository root with the vendored Three.js module available as `three`:

```sh
node tools/gltf/lift_resistance_idle_r48.mjs
node tools/qa/validate_resistance_idle_r48.mjs
blender -b -t 4 -P tools/blender/preview_resistance_idle_r48.py -- military
blender -b -t 4 -P tools/blender/preview_resistance_idle_r48.py -- vest
```

The generator always reads R47, so rerunning does not accumulate shoulder lift. Production motion packs are in `assets/characters/resistance_r48/{military,vest}/motions.glb` and have been copied to the corresponding resistance motion-lab character assets. The combined animated GLBs in `work/resistance-r48` are only visual-QA intermediates.

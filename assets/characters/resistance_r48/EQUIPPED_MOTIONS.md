# Reusable R48 equipped animations

Each character directory contains:

- `character.glb`: unchanged original character mesh, textures, skin and skeleton.
- `motions.glb`: ordinary 33-clip pack, including the corrected empty-handed `Idle`. This is not replaced by the equipped bake.
- `equipped_motions.glb`: separate skeleton-only animation pack, **31 clips**, with full local translation/rotation/scale for 65 military / 66 vest bones. Clip names encode the weapon, for example `QBZ95_RifleIdle`, `Type56_1_RifleWalk`, `QBU85_RifleAimingIdle`, `Type97Hawk_ShotgunPump` and `QCQ171_FiringRifle`.
- `equipped_weapon_transforms.json`: matching weapon-root transform samples, visibility and moving pump-part local transforms.

The pack evaluates the actual final website constraints, including `applyReferenceGrip`, and saves their resulting bone transforms. It does not merely rename or copy the uncorrected source actions. There are six equipped motions per weapon and one extra Type97Hawk pump clip. Firing is sampled at 60 Hz, the sharp pump motion at 240 Hz, and other actions at 30 Hz, with endpoints included.

## Import contract

1. Load `character.glb`. Attach the named animation tracks from `equipped_motions.glb` to matching skeleton nodes. A motion-only GLB has no visible character geometry when opened alone.
2. Load the weapon GLB identified by `weaponModel` in the JSON. Paths in that field are relative to the repository root.
3. Play the clip and the JSON entry with the same `name` at the same time. Apply the JSON `position`, `rotation` and `scale` to the **loaded weapon scene root**, as a sibling of the unnormalized character scene.
4. Coordinates are native glTF right-handed Y-up. Quaternions are `[x,y,z,w]`. These transforms already remove the website's 1.75-metre preview wrapper. If scaling the character for an engine scene, place both character and weapon under the same parent scale.
5. Interpolate position and scale linearly and rotation by normalized shortest-path quaternion slerp. Apply `movingParts` transforms to their existing weapon descendants. Each path records child indices and names from the weapon root; preserve the weapon hierarchy. Set visibility from `visible`.
6. Do not re-run the website grip solver on these baked clips, or apply another hand-size override. The exported bone scales already contain the runtime result.

Weapon models remain separate rather than duplicating five guns in every character GLB. The JSON is an import contract, not a supplied Godot animation controller. No engine integration or automatic weapon playback is claimed.

## Reproduce and verify

```sh
node tools/gltf/bake_resistance_grips_r48.mjs
```

`equipped-bake-report.json` records hashes of the configuration, attachment runtime, reference-grip helper, rig setup, and character/motion inputs. The generator reloads each written GLB and compares every authored sample against the live runtime, and checks every adjacent-key midpoint to quantify interpolation differences. It rejects source configuration changes during export and unexpected runtime skin-weight modifiers.

The initial final-config export contains 2,836 samples per character. Maximum reloaded key-component error is below 0.00000066. Maximum midpoint bone-position difference is about 1.918 mm in native model coordinates (Type97Hawk pump), or about 3.36 mm at the website's 1.75× scale. This is a sampled approximation, not a guarantee of exact continuous-time contact. The website remains authoritative for interactive solving and continuous-time grip constraints.

Two consecutive executions are checked for identical SHA-256 outputs in the companion `equipped-determinism.json` report. No mesh/rig changes, publication or deployment are performed by this generator.

## Pump sampling diagnosis

The final left-hand positional reference creates a sharp, continuous elbow bend in the pump. A 1,500-interval runtime scan found maximum adjacent local quaternion changes of 0.535° (military) and 0.380° (vest), not an observed 180° branch flip. At 60 Hz, midpoint sampling found up to 6.107 mm native bone-position approximation error. Pump-only export sampling was increased to 240 Hz without changing the source runtime. Its worst midpoint is the left forearm at 0.254802 s: 1.918 mm military and 1.497 mm vest. See `pump-sampling-diagnosis.json`. These finite samples do not prove continuity at every possible time.

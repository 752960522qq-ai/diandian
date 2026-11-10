# R49 weapon contact corrections

This change addresses the annotated screenshots for Military, Vest, Lin Xu,
Zhigeng and Diandian. It runs after the existing animation and weapon placement
code. Uploaded FBX files, character meshes and animation clips are unchanged.

The constraint restores the current animation's arm pose before every solve,
uses measured palm skin triangles and weapon surface points, seats long-gun
stocks during aiming, and moves the support contact with the shotgun pump.
Forearm roll and wrist bend are bounded. Finger curls use each character's
measured bind axes. Carrying poses fit the rigid weapon within both arms' reach;
PF89 carry is brought inward and QJZ89's support grip is lowered away from the
face. Shotgun pitch blending and deliberate releases during reload are retained.

The generated calibration files are local to each standalone website. Run from
the repository root with Three.js 0.180.0 installed as a local Node dependency:

```sh
node tools/pose_contact_fix/calibrate.mjs
SAMPLES=24 node tools/pose_contact_fix/validate.mjs
```

Validation uses the production rigs and animation mixers. It samples each
equipped weapon's available carry/aim/fire/pump motions, including clip endings,
shotgun pitch endpoints and intermediate blends. It checks actual skinned palm
markers within 5 mm of their target, wrist bend below 65 degrees, finite bone
transforms, repeatable seeking/weapon switching, unchanged non-arm behavior and
monotonic shotgun pitch control. These are contact/pose checks, not an exhaustive
triangle collision test. The annotated camera views are also reviewed in the
browser; selected captures and the numeric report are in `evidence/`.

Both the new module and the import chain use `contact-r49` to invalidate old
browser caches. The existing five deployments retain their independent
character selectors and access settings.

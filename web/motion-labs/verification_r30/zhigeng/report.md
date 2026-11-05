Zhigeng Type97 RifleRun candidate is ready for integration.

`run-patch.json` is the full resolved per-motion mount patch. It uses Type56-1 RifleRun's gun and hand rotations and clears stale Type97 base/run overrides. It retains the 800 mm Type97 model at scale 1 and its actual right grip. Geometry adaptation is limited to the support grip [-0.013,-0.065,-0.145], native palm center [0.003,0.037,-0.009], and full support contact weight 1. The palm center is the already calibrated Zhigeng palm value; it avoids aiming contact at the old knuckle-offset point. No body animation clip or renderer edits.

240 Hz complete-loop scan (162 samples, duration 0.6666666865 s) found max support error 0.000000102 m and max right error 2.3e-16 m. Wrist angle is 30.68–40.55 degrees. Largest adjacent 240 Hz left arm/forearm/hand steps are 0.51/1.27/1.00 degrees, with no branch jump. Body and right arm local quaternion components and positions are exactly equal to Type56-1 throughout the scan; gun world orientation differs by at most 0.0000025 degrees. The raw angleTo body difference in the JSON is source float quaternion norm error, confirmed by exact component equality.

Same-camera front/top/side screenshots compare Type56-1 and Type97 at 0.167 and 0.5 seconds. Top view confirms the left arm reaches forward similarly to Type56-1, with the palm under the pump and no forced elbow flare. Files with the phase suffix are the final screenshots.

Only this isolated work directory and own runtime QA page were modified. Production edits and publishing are left to root.

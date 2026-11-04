# Type97 Left hand fix — ready for integration

Patch: `left_patch.json`. Apply the supplied fields only to each character's `mounts.type97hawk` base and six named holding motions. Leave `Reloading`, AR body/right-arm animation, other weapons and shared solver unchanged. The two null dictionary fields intentionally clear stale QBZ world-direction constraints (`Object.entries(null || {})` is already supported). The validation used empty objects, which behave identically here.

The final settings keep `support_forearm_twist_weight=.65`, set `support_upper_arm_twist_weight=0`, and remove support finger world targets while retaining the source animation's local finger rotations. No additional JS hook is required. Source AR fingers remain on base motions; source shotgun left-hand animation remains on the existing hybrid fire/pump clips.

Two independent defects were reproduced and corrected:

- The upper-arm twist extraction wraps at ±180°. With upper weight .45, the computed branch wrap injects a real ~162° local rotation jump into the upper arm and inverse jump into the forearm. Diandian Idle and Zhigeng Walk/Run reproduce this. Type97 no longer distributes forearm twist into this unstable upper branch. The wrist/hand target and forearm distribution are retained.
- The old QBZ finger targets point the first long-finger segment approximately along gun +X, despite this hand's palm-forward being gun −Z and palm-across gun −X. At Idle 7.44 s the four MCP first segments lie at −86.1 to −88.7° in the palm plane and only 12.5–12.8° flexion out of that plane. The resulting knuckles are forced sideways. With the natural source pose the MCP abduction is +3.6, −12.8, −26.3, −38.1° and flexion is 64.0, 69.0, 76.3, 77.9°. Local rotations return to source within floating-point precision (maximum reported quaternion delta .03°). Thumb no longer receives the forced 31.5° / ~20° IP rotation, so it keeps its source opposition and axial orientation.

`left_validation.json` contains deterministic actual local bone quaternions, hand-relative finger directions, elbow positions, and contact residuals. Both characters' entire Idle clips were sampled at 240 Hz (including 19 samples between 7.40 and 7.48, plus exact 7.44); five other holding motions each received 241 samples. Quaternion angular distances account for q/−q equivalence.

| Motion / character | Maximum adjacent upper step before | after | Maximum adjacent fore step after | Maximum adjacent hand step after |
| --- | ---: | ---: | ---: | ---: |
| Diandian Idle, 240 Hz | 161.996° | 0.0179° | 0.1401° | 0.1243° |
| Zhigeng Idle, 240 Hz | 0.0440° | 0.0179° | 0.1474° | 0.1314° |
| Zhigeng Walk, 241 samples | 162.082° | 0.1220° | 0.4362° | 0.3120° |
| Zhigeng Run, 241 samples | 162.150° | 0.4479° | 0.6091° | 0.4460° |

Maximum adjacent Idle elbow displacement is .1893 mm (Diandian) / .1755 mm (Zhigeng); removing upper distribution did not move the elbow path or expose a pole flip. The maximum sampled holding-motion palm residual is below .00000021 m. This residual is only contact verification and is not used as a proxy for visual anatomy.

Actual skinned mesh renders were manually inspected at Idle 7.44 s from close side and above, plus full body; the forearm taper remains smooth and the knuckles curl around the fore-end rather than folding sideways. Fire .10 s, Walk .65 s, and maximum Pump .233333 s also have full/side/top renders. Key evidence:

- `diandian_left_idle.png`
- `zhigeng_left_idle.png`
- `zhigeng_left_pump.png`

These are real rendered skinned meshes with current 800 mm / 90%-width model, with skeleton matrices explicitly updated before rendering. Shadows were disabled for deterministic visual comparison only. The thumb is intentionally allowed to keep the natural source extension; minor palm/fore-end clearance was not solved by forcing more finger world targets.

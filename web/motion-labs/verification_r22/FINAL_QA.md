# Type97 r22 final QA

Result: GO for root deployment and repository synchronization. Production files were not edited by this QA task.

Frozen final build: 800 mm weapon geometry; proportional XYZ resize then width × 0.9; Type97 upper twist 0 / forearm twist 0.65 / source local finger pose; Diandian final clothing mesh.

## Automated evidence

- Independent full-hierarchy GLB vertex measurement: 800.000 mm long, 55.319129 mm wide, 232.037679 mm high. Width is exactly 90% of the width after proportional resizing. Both characters use the same weapon geometry; 68 original mesh BIN data retained.
- 104 previous-weapon motion cases passed (52 per character): bone and weapon poses matched the r21 snapshot within 1e-6, including 56-1 walking. Diandian clothing geometry changes were allowed; bone regression was not.
- Type97 Fire/Pump preserve the rifle source body and right-side tracks exactly. The left-side source match error is at most 5.96e-8.
- Type97 physical pump travel: 44.855577646 mm. Peak/end times and motion/weapon switch reset passed. Existing M1897 pump and pitch endpoints remained unchanged.
- Seven Type97 motions × 121 samples × two characters checked for grip contact and deterministic timeline seeking. Maximum palm contact error < 0.000001 m; seek differences < 1e-5 rad. No browser errors.
- All 10 weapon buttons remained enabled at a 390 px viewport, with no horizontal document overflow. Type97 action selection and original shotgun pitch controls passed.

## Visual review

- Viewed rendered outer and underside left-hand closeups at idle start and 7.44 s for both characters. No severe upper-arm roll, wrist collapse, or side-splayed finger deformation was visible in these captured views; fingers curl around the pump and palm remains attached.
- Viewed right-side Reload at normalized 0 / 0.033 / 0.9 / 1 and Aim for both characters. No recurrence of the prior right-arm-through-body or shortened-stock-through-chest defect was visible in these frames.
- Viewed both full-character idle captures and mobile pages. Diandian front lower waist opening and clothing front render without the removed bridge faces. The actual skin/clothing images were reviewed in addition to bone metrics.
- The inner-hand camera is occluded by the torso and was excluded from anatomy judgment. Contact sheets use the unobstructed outer/underside views.

## Artifacts

- `size_verification.json`: independent static geometry and target transform evidence.
- `left_validation.json`: detailed local-bone and finger-direction checks.
- `integration.json`: compact browser metrics.
- `diandian_left_idle.png`, `zhigeng_left_idle.png`, `zhigeng_left_pump.png`: unobstructed left-hand skin/finger closeups.
- `type97_right_arm.jpg`: shortened weapon right-side reload and aim views.
- `waist_before_after.png`: the reported clothing defect before and after repair.

Scope: finite animation samples and selected rendered views; this is not exhaustive triangle collision certification. No further scan is required for the requested fixes.

diandian: 390 px document at 390 viewport; 52 previous-motion regressions passed.
zhigeng: 390 px document at 390 viewport; 52 previous-motion regressions passed.

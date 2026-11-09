# Independent visual grip review

**Result: scoped visual acceptance of the revised candidate.** No gross hand inversion, detached support hand, or obvious new torso penetration was seen in the inspected snapshots. This is not a collision-free certification for the full animation cycle.

## Evidence and scope

Reviewed actual skinned character/weapon GLB renders at 37% clip time: all five weapons in RifleAimingIdle; revised QBU85 RifleRun/RifleIdle and QBZ95 RifleIdle from both front-quarter sides. Also checked revised QBU85 run front view and QBU85 source-reference aiming closeup. Final changes reviewed: QBU85 run forward offset 0.07 m; Idle/Walk right-elbow blend 0.5. No independent Walk render was reviewed.

Six JPEG evidence images in `grips/` are under 120 KB each. Five aiming images remain applicable because the final offset/elbow changes target run/idle/walk, not aiming. The sixth shows revised QBU85 run. Additional inspected idle and opposite-side renders are retained in the working QA directory.

## Findings

- **QBZ95 aiming:** support fingers visibly wrap the fore-end; no gross floating palm or wrist inversion. The right index appears below/outside the trigger guard, so exact trigger contact should not be claimed.
- **QCQ171 aiming:** support wrap and right pistol-grip alignment look coherent; no obvious gross separation in the inspected angle.
- **Type97hawk aiming:** support wrap and right grip remain coherent in the inspected angle.
- **QBU85 aiming:** left fingers cradle the fore-end rather than form a tight wrap. Direct source-reference comparison confirms this open pose is inherited; Linxu's broader bare hand makes it more visible than the source glove.
- **Type56_1 aiming:** similarly open support-finger cradle. Potential polish item, not a demonstrated new inversion/separation defect.
- **Revised QBU85 run:** visibly reduced right-wrist bend. Stock lies beside the right elbow with close sleeve contact; front and opposing quarter views show no obvious torso penetration. Support hand remains attached. Existing scan reports right/left maximum segment angles 53.92°/51.94°, versus previous 65.01°/54.27°.
- **Revised QBU85 idle and QBZ95 idle:** elbow/forearm line looks coherent and remains in front of the torso. Stock/sleeve contact is close but no obvious new gross penetration was visible in paired quarter views.

## Remaining limitations

The wrist metric compares forearm-to-wrist and wrist-to-middle-knuckle segments; it is not an anatomical joint-angle measurement. Mathematical anchor errors and source-quaternion agreement do not establish real skin/gun clearance. The exploratory ray test uses contact targets and fixed directions that can miss the palm or intersect fingers, so its misses/intrusion values should not automatically be labelled physical collision failures. Conversely, these selected renders cannot exclude small hidden finger intersections or defects at unrendered frames. A full interactive browser review was not completed; browser launch was blocked by `socket() not permitted`.

Automated results, separate from the visual collision inspection: 31/31 reference combinations pass (maximum hand/finger source error 0.682°); 43 runtime combinations/2,623 sampled frames and 31 baked clips/3,070 frames pass their checks.

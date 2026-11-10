"""Refresh runtime wiring only in an engineering checkout already carrying this v6 overlay.
This is not a standalone installer from the original baseline. End users should
apply the complete verified file overlay and must not run any generator.
"""
from pathlib import Path
root=Path.cwd()
if not (root/'web/motion-labs/linxu-motion-lab/assets/characters/linxu/weapon_update_v6.glb').exists():
 raise SystemExit('Apply the complete verified v6 overlay first; this helper cannot install from a clean baseline.')
for lab in ['linxu','resistance']:
 site=root/f'web/motion-labs/{lab}-motion-lab'
 (site/'natural-weapon.js').write_text((root/'tools/weapon_v6_three/natural-weapon.js').read_text())
 p=site/'weapon-attachment.js';s=p.read_text()
 if "import { applyNaturalWeaponTrack }" not in s:s="import { applyNaturalWeaponTrack } from './natural-weapon.js?v=natural-v6';\n"+s
 needle="    const id = this.selectedWeapon;"
 insert="    const naturalTrack = this.character.mounts[id]?.natural_motion_tracks?.[this.state.actualClip];\n    if (naturalTrack) { applyNaturalWeaponTrack(this, naturalTrack, time); return; }"
 if insert not in s:s=s.replace(needle,needle+'\n'+insert)
 p.write_text(s)
 for file in ['app.js','rig.js','index.html']:
  p=site/file;s=p.read_text().replace('weapon_update_v5.glb','weapon_update_v6.glb').replace('weapon-attachment.js?v=linxu-v4','weapon-attachment.js?v=natural-v6').replace('weapon-attachment.js?v=resistance-r48','weapon-attachment.js?v=natural-v6')
  if file=='index.html':s=s.replace('v=weapon-v5','v=weapon-v6').replace('v=weapons-v5','v=weapons-v6')
  p.write_text(s)

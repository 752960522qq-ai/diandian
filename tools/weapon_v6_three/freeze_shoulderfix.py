#!/usr/bin/env python3
"""Freeze validated files without overwriting either earlier standalone site."""
from pathlib import Path
import json,hashlib,shutil,datetime
ROOT=Path(__file__).resolve().parents[2]
Q=ROOT/'web/motion-labs/verification_weapon_v6_three'
SNAP=Q/'linxu_verified_candidate_shoulderfix'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def put(p,data):Path(p).write_text(json.dumps(data,indent=2)+'\n')
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
scope=read(Q/'shoulderfix-scope-validation.json');skin=read(Q/'shoulderfix-production-skin-validation.json')
assert not scope['failures'] and not skin['failures']
names=['validation.json','legacy-regression.json','transition-validation.json','static-and-loop-validation.json','compare-run-hotfix-validation.json']
for n in names:assert not read(Q/n)['failures'],n
assert read(Q/'godot_skeleton/summary.json')['passed']
matrix=ROOT/'web/motion-labs/verification_linxu_full_motion/linxu-ui-validation-matrix.json'
sweep=ROOT/'web/motion-labs/verification_linxu_full_motion/linxu-ui-numeric-sweep.json'
num=read(sweep);assert not num['errors'] and not num['transition_summary']['failures'] and num['source_hashes_still_match']
assert all(sha(ROOT/f)==h for f,h in num['source_files'].items()),'UI scan inputs changed'
sources=['tools/weapon_v6_three/candidate.mjs','tools/weapon_v6_three/build.mjs','tools/weapon_v6_three/reference-path.mjs','tools/qa/validate_pf89.mjs']
old=read(Q/'shoulderfix_before/web/motion-labs/verification_weapon_v6_three/generator-provenance.json')
provenance={'revision':'natural-v6-shoulderfix','generated_at_utc':now,'generator_sha256_field_means':'Exact SHA256 of candidate.mjs used for this new generation; builder_sha256 records build.mjs separately.','current_generation':{'sources':{f:sha(ROOT/f) for f in sources},'policy':'Inline in candidate.mjs, only approved linxu/military/vest source M97 RifleRun: natural left wrist and both extra axial redistribution weights zero. No runtime helper change and no external policy helper dependency.','artifacts':{cid:{'pack_sha256':row['production_pack_sha256'],'embedded_provenance':row['embedded_provenance']} for cid,row in scope['characters'].items()}},'previous_generation':old,'immutable_previous_sources':'shoulderfix_before/tools/weapon_v6_three/','scope_evidence':'shoulderfix-scope-validation.json','production_skin_evidence':'shoulderfix-production-skin-validation.json'}
put(Q/'generator-provenance.json',provenance)
summary={'revision':'natural-v6-shoulderfix','scope':'Approved three-character M870 Run shoulder correction. Overall all-motion/package acceptance is owned by the parent; not declared complete here.','generated_at_utc':now,'production_packs':{c:r['production_pack_sha256'] for c,r in scope['characters'].items()},'unchanged_clips_per_character':27,'attachment_and_gun_tracks_identical':True,'production_runtime_source_skin_max_error_m':max(r['max_world_skin_error_m'] for r in skin['characters'].values()),'runtime_reference_cases':84,'legacy_samples_per_character':60,'transition_cases_per_character':24,'static_source_mixed_cadence_samples':480,'godot_passed':True,'linxu_ui_numeric_rows':len(num['rows']),'linxu_ui_numeric_samples':sum(r['samples'] for r in num['rows']),'linxu_ordered_transitions':num['transition_summary']['ordered_pairs'],'linxu_new_m870_run_loop_endpoint':next(r['loop_seam_risk'] for r in num['rows'] if r['key']=='m870__RifleRun__normal'),'visual_coverage':{'linxu_source_candidate':'41 complete-cycle phases x front/side/back x before/after = 246 images; independent Astra review.','military_vest_source_candidates':'5 phases x front/side/back x before/after x 2 characters = 60 images.','production_equivalence':'Actual prepareRig production skin vs source candidate at 161 phases per character, shoulder/elbow/wrist vertices.','webgl_ui':'Not executed: environment blocks Chromium sockets. No browser pass claimed.'},'path_change_disclosure':'Left elbow/wrist paths change about 5cm for Linxu and 5–7cm for military/vest. Shoulder points, body, legs, right arm, gun trajectory, bone lengths, meshes and weights remain unchanged.','report_sha256':{str(p.relative_to(ROOT)):sha(p) for p in [*(Q/n for n in names),Q/'shoulderfix-scope-validation.json',Q/'shoulderfix-production-skin-validation.json',Q/'godot_skeleton/summary.json',matrix,sweep]}}
put(Q/'shoulderfix-validation-summary.json',summary)
prior=read(Q/'shoulderfix_before/web/motion-labs/verification_weapon_v6_three/three-production-freeze-manifest.json')
prod={'status':'Approved shoulder-fix files frozen locally; overall all-motion/package acceptance pending parent. No deployment by this worker.','revision':'natural-v6-shoulderfix','frozen_at_utc':now,'files':{f:{'sha256':sha(ROOT/f),'bytes':(ROOT/f).stat().st_size} for f in prior['files']},'generator_sources':{f:sha(ROOT/f) for f in sources},'validation_summary_sha256':sha(Q/'shoulderfix-validation-summary.json'),'generator_provenance_sha256':sha(Q/'generator-provenance.json')}
put(Q/'three-production-freeze-manifest.json',prod)
assert not SNAP.exists(),'Never overwrite a frozen snapshot'
SNAP.mkdir();shutil.copytree(ROOT/'web/motion-labs/linxu-motion-lab',SNAP/'site')
shutil.copytree(ROOT/'assets/characters/weapon_update_v6/linxu',SNAP/'source_bake')
(SNAP/'rebuild_sources').mkdir();
for p in (ROOT/'tools/weapon_v6_three').iterdir():
 if p.is_file() and p.suffix in ['.mjs','.py','.js','.md']:shutil.copy2(p,SNAP/'rebuild_sources'/p.name)
(SNAP/'rebuild_sources/qa').mkdir();shutil.copy2(ROOT/'tools/qa/validate_pf89.mjs',SNAP/'rebuild_sources/qa/validate_pf89.mjs')
(SNAP/'validation').mkdir()
for n in names+['shoulderfix-scope-validation.json','shoulderfix-production-skin-validation.json','shoulderfix-validation-summary.json','generator-provenance.json','three-production-freeze-manifest.json']:shutil.copy2(Q/n,SNAP/'validation'/n)
shutil.copy2(Q/'godot_skeleton/summary.json',SNAP/'validation/godot-summary.json')
for p in [matrix,sweep]:shutil.copy2(p,SNAP/'validation'/p.name)
shutil.copytree(ROOT/'web/motion-labs/verification_weapon_v6_shoulder/evidence',SNAP/'shoulder_evidence')
(SNAP/'README.txt').write_text('Current standalone Linxu shoulder-fix preview. Open site/index.html through a static HTTP server.\n\nUse the complete delivered files directly; do not run generators to install this snapshot. The rebuild_sources directory records the exact sources but is not a standalone project. Rebuilding requires the complete engineering repository, its normal Node/three dependencies, original 81d5a485 reference assets, and the target meshes/calibration sources. The approved three-parameter policy is inline in candidate.mjs; no candidate_policy helper is required.\n\nOnly M870 Run was changed in this revision. Existing comparison-control and approved Walk corrections remain. Other 27 natural weapon clips, old weapons, model/skin/bone lengths, and all weapon tracks are unchanged. Left elbow/wrist paths change about 5cm for Linxu, not zero. Actual production skin was compared with the independently reviewed candidate.\n\nSee validation/shoulderfix-validation-summary.json for tests and their source hashes. Browser/WebGL execution was unavailable; no browser pass is claimed. Overall complete-package acceptance remains with the parent and the all-motion review. No deployment or upload was performed by this worker.\n\nThe earlier comparefix snapshot is preserved separately as the pre-shoulderfix reproduction baseline.\n')
manifest={'status':'Locally frozen approved Linxu shoulder correction; overall package review not asserted complete.','revision':'natural-v6-shoulderfix','created_at_utc':now,'entry':'site/index.html','source_commit':'81d5a485','production_pack_sha256':scope['characters']['linxu']['production_pack_sha256'],'source_hashes':{f:sha(ROOT/f) for f in sources},'source_site_file_hashes':{str(p.relative_to(ROOT/'web/motion-labs/linxu-motion-lab')):sha(p) for p in (ROOT/'web/motion-labs/linxu-motion-lab').rglob('*') if p.is_file()},'files':{str(p.relative_to(SNAP)):{'sha256':sha(p),'bytes':p.stat().st_size} for p in SNAP.rglob('*') if p.is_file()}}
put(SNAP/'MANIFEST.json',manifest)
print(json.dumps({'snapshot':str(SNAP),'manifest_sha256':sha(SNAP/'MANIFEST.json'),'production_manifest_sha256':sha(Q/'three-production-freeze-manifest.json'),'linxu_pack_sha256':scope['characters']['linxu']['production_pack_sha256'],'files':len(manifest['files'])},indent=2))

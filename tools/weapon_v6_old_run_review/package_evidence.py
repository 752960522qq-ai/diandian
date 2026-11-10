"""Build a small delivery bundle from completed reports/sheets. Never copies baked GLBs or raw frames."""
import hashlib,json,os,shutil
from pathlib import Path
R=Path(__file__).resolve().parents[2];O=(R/Path(os.environ.get('LINXU_OLD_RUN_OUTPUT','web/motion-labs/verification_weapon_v6_old_run_review'))).resolve();E=O/'evidence';E.mkdir(parents=True,exist_ok=True);(E/'sheets').mkdir(exist_ok=True)
def read(name):return json.loads((O/name).read_text())
a=read('baseline-equivalence.json');s=read('semantics-and-seams.json');m=read('manifest.json');coverage=read('coverage-and-findings.json')
for row in coverage['rows']:
 name=row['name'];src=O/'sheets'/(name+'.jpg');assert src.is_file();shutil.copy2(src,E/'sheets'/src.name)
 row['contact_sheet']='sheets/'+src.name
 row.pop('frame_metadata',None)
 row['raw_frame_note']='27 original PNGs were visually reviewed for this state; this delivery contains their 9-phase x 3-view contact sheet, not the raw frame set.'
coverage['artifact_scope']='Standalone report, summaries and 10 reviewed contact sheets. No raw frames, baked meshes, or frozen runtime snapshot included.'
(E/'coverage-and-findings.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2))
summary={'phases_per_state':a['phases'],'original_review_source':'comparefix frozen site matching production at the time of the 270-frame visual review; file hashes in source-and-baseline.json','rows':[{k:v for k,v in x.items()if k!='samples'}for x in a['rows']],'cross_equipment':a['crossEquipment'],'semantics_and_seams':[{**x,'currentBeforeComparison':{k:v for k,v in x['currentBeforeComparison'].items()if k!='samples'}}for x in s['rows']]}
recheck=O/'verification-current-defaults/baseline-equivalence.json'
assert recheck.exists(), 'Post-cleanup current-production recheck is required before packaging this report.'
if recheck.exists():
 re=json.loads(recheck.read_text());rm=json.loads((recheck.parent/'manifest.json').read_text());assert len(re['rows'])==10 and all(x['maxLocal']==x['maxWorld']==0 and x['clipTracksIdentical']for x in re['rows'])
 summary['post_cleanup_current_production_recheck']={'site_selection':'Default current production linxu-motion-lab; no frozen snapshot required','phases_per_state':re['phases'],'rows':[{k:v for k,v in x.items()if k!='samples'}for x in re['rows']],'source_hashes':rm['hashes']}
(E/'numeric-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
provenance={'baseline_commit':'81d5a48','baseline_required_for_rerun':True,'original_baseline_inputs':read('baseline-provenance.json'),'original_visual_review_input_hashes':m['hashes'],'baseline_setup':'Materialize the original 81d5a48 complete web/motion-labs/linxu-motion-lab site, including actual GLBs, runtime imports, config and all configured weapons. Default repository root is sibling character_adapt_baseline; override WEAPON_V6_BASELINE. Do not replace the baseline with current production.'}
(E/'source-and-baseline.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2))
report=(O/'REPORT.md').read_text().replace('详见 baseline-provenance.json。','详见 source-and-baseline.json。').replace('原图和时间元数据位于相邻 verification_weapon_v6_shoulder/legacy-frames/。','本精简包不包含原图、烘焙GLB或临时站点；10张联系表完整保留270张采样视图。')
report+='\n## 交付清理后的复测\n\n工具已改为默认读取当前生产 linxu-motion-lab，并支持显式配置其他站点。原始基线仍是必需输入，默认同级 character_adapt_baseline，可通过 WEAPON_V6_BASELINE 指定。路径整理后重新运行10状态×161相位对照，局部/世界差异仍全部为0，源clip轨道仍一致；没有重渲270张图。详见 numeric-summary.json 的 post_cleanup_current_production_recheck。\n'
(E/'REPORT.md').write_text(report)
(E/'README.md').write_text('''# Old-longgun run QA evidence\n\nThis small standalone bundle contains REPORT.md, coverage-and-findings.json, numeric-summary.json, source-and-baseline.json, and 10 contact sheets. It includes no baked meshes, raw frame directories, temporary runtime snapshots, or software dependencies. Open the report and sheets directly.\n\nThe original visual review used real runtime poses with actual UI Before branches, 9 phases × 3 views × 10 states = 270 images. The post-cleanup numerical recheck uses default current production. These are sampled/source-relative findings, not an absolute guarantee.\n\nTo rerun numerical checks, use tools/weapon_v6_old_run_review/{runtime.mjs,export_and_audit.mjs,check_semantics.mjs} in the project, Node.js and three@0.180.0. The current site and original81d5a48 baseline site with materialized GLBs are required. The baseline is not included here and must not be silently substituted with current assets. See the tools README for paths and commands.\n''')
files=[p for p in E.rglob('*')if p.is_file()and p.name!='checksums.json'];checks={str(p.relative_to(E)):hashlib.sha256(p.read_bytes()).hexdigest()for p in sorted(files)};(E/'checksums.json').write_text(json.dumps(checks,indent=2))
assert len(list((E/'sheets').glob('*.jpg')))==10
assert not any(p.suffix=='.glb'or p.name in ['baked','frames','site']for p in E.rglob('*'))
print('EVIDENCE',E,'files',len(files)+1,'bytes',sum(p.stat().st_size for p in E.rglob('*')if p.is_file()))

"""Create the small merger ZIP and a standalone review ZIP after final verification."""
import json,shutil,zipfile,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT.parent/'delivery'
split=json.loads((OUT/'v7_split_manifest.json').read_text());install=json.loads((ROOT/'web/motion-labs/verification_weapon_v7/install-validation.json').read_text());checks=json.loads((OUT/'split-validation.json').read_text())
assert checks['passed'] and install['passed']
text=f'''# V7 分卷合并与校验

本次共 {len(split['parts'])} 卷。将本工具 ZIP 的内容解压到全部 V7 partNNN.zip 所在目录，保留每个分卷的原文件名。

Windows：安装 Python 3 后双击“合并V7.bat”。也可在终端运行 python merge_v7.py。
macOS / Linux：运行 python3 merge_v7.py。

工具先逐卷验证大小、SHA-256，再合并并验证完整 ZIP 的 SHA-256 和 CRC。缺卷或损坏会停止；不会覆盖不同内容的已有整包。分卷也可预先解压为同名 .partNNN 数据文件后合并，但不要混入 V6 分卷。

输出：{split['archive']}
大小：{split['archive_bytes']:,} 字节
完整 SHA-256：{split['archive_sha256']}

每个下载分卷均小于 30,000,000 字节。合并后的整包较大，这是正常的；不要分别把分卷当独立补丁使用。

合并成功后，解压整包并阅读“安装与验收说明.md”。先运行 apply_update.py 做只读检查，通过后加 --apply 安装。包包含全部 V6 依赖，可用于已验证的 main 或 V6 工程；未知本地修改会整批阻止覆盖。

本工具不删除任何 V6 文件，不自动修改仓库，不访问网络。
'''
tool=OUT/'V7_分卷合并与校验.zip'
with zipfile.ZipFile(tool,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for name in ['merge_v7.py','合并V7.bat']:z.write(ROOT/'tools/weapon_v7_delivery'/name,name)
 z.write(OUT/'v7_split_manifest.json','v7_split_manifest.json');z.writestr('使用说明.md',text)
report=OUT/'V7_修复说明与验证图.zip'
with zipfile.ZipFile(report,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for folder in ['Docs/weapon_update_v7','web/motion-labs/verification_weapon_v7_legacy']:
  for p in sorted((ROOT/folder).rglob('*')):
   if p.is_file():z.write(p,p.relative_to(ROOT))
 for rel in json.loads((ROOT/'Docs/weapon_update_v7/additional-files.json').read_text()):
  p=ROOT/rel
  if p.suffix in ['.json','.log'] and 'verification_weapon_v7_legacy/'not in rel:z.write(p,rel)
 z.write(ROOT/'web/motion-labs/verification_weapon_v7/install-validation.json','验证/install-validation.json')
 z.write(OUT/'split-validation.json','验证/split-validation.json');z.write(OUT/'v7_split_manifest.json','验证/v7_split_manifest.json');z.write(OUT/'package/manifest.json','验证/manifest.json')
 z.writestr('先读我.md',f'本文件是无需合并分卷即可查看的修复说明、实际蒙皮对比与验证结果。请先看 Docs/weapon_update_v7/README.md 和逐图复核.md；evidence 内是快速前后对比。工程安装文件仍在{len(split["parts"])} 个 V7 数据分卷中。本报告不是可安装补丁。\n')
for p in [tool,report]:
 assert p.stat().st_size<30_000_000,(p,p.stat().st_size)
 with zipfile.ZipFile(p)as z:assert z.testzip()is None
for p in (ROOT/'Docs/weapon_update_v7/evidence').glob('V7_前后复核_*.jpg'):shutil.copyfile(p,OUT/p.name)
files=[OUT/p['outer_file']for p in split['parts']]+[tool,report]+sorted(OUT.glob('V7_前后复核_*.jpg'))
rows=[{'name':p.name,'local_path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in files]
assert all(r['bytes']<30_000_000 for r in rows)
(OUT/'delivery-files.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows,ensure_ascii=False,indent=2))

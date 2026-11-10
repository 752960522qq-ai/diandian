"""Package only reviewed, valid lightweight evidence. Does not render or change production."""
import json,csv,shutil,hashlib,html
from pathlib import Path
R=Path(__file__).resolve().parents[2];O=R/'web/motion-labs/verification_weapon_v6_full_review/linxu';E=O/'evidence';E.mkdir(exist_ok=True)
manifest=json.loads((O/'manifest.json').read_text());review=json.loads((O/'visual-review-log.json').read_text());reuse=json.loads((O/'render-reuse-proof.json').read_text())
rows=[r for r in manifest['rows']if r['coverage']!='delegated_longgun_run'];assert len(rows)==65 and set(r['name']for r in rows)==set(review['reviewedNinePhaseThreeViewSheets']);assert reuse['reusable']
coverage=[];total=0
for kind in ['sheets','sheets-detail','sheets-full','videos','continuous-sheets']:
 (E/kind).mkdir(exist_ok=True)
 for p in sorted((O/kind).glob('*')):
  if p.suffix in ['.jpg','.mp4']:shutil.copy2(p,E/kind/p.name)
for row in rows:
 n=row['name'];main=json.loads((O/'frames'/n/'metadata.json').read_text());assert len(main['frames'])==27
 c=O/'frames'/n/'metadata-continuous.json';cont=json.loads(c.read_text())if c.exists()else None
 detail=O/'frames-detail'/n/'metadata.json';detail=json.loads(detail.read_text())if detail.exists()else None
 full=O/'frames-full'/n/'metadata.json';full=json.loads(full.read_text())if full.exists()else None
 item={'name':n,'weapon':row['w'],'motion':row['m'],'clip':row['clip'],'duration_seconds':row['duration'],'views':['front','side','back'],'phase_times_seconds':[f['time']for f in main['frames']if f['view']=='front'],'main_rendered_images':27,'main_sheet':'sheets/'+n+'.jpg','continuous_fps':cont['renderSamplingHz']if cont else None,'continuous_rendered_images':len(cont['frames'])if cont else 0,'continuous_times_seconds':[f['time']for f in cont['frames']if f['view']=='front']if cont else [],'continuous_video':'videos/'+n+'.mp4'if cont else None,'detail_rendered_images':len(detail['frames'])if detail else 0,'detail_times_seconds':[f['time']for f in detail['frames']if f['view']=='front']if detail else [],'full_body_rendered_images':len(full['frames'])if full else 0,'visually_reviewed':True,'render_reusable_after_shoulder_fix':True}
 coverage.append(item);total+=sum(item[k]for k in ['main_rendered_images','continuous_rendered_images','detail_rendered_images','full_body_rendered_images'])
summary={'states':65,'main_images':1755,'continuous_states':10,'continuous_images':582,'detail_states':6,'detail_images':84,'full_body_states':7,'full_body_images':189,'total_rendered_images':total,'resolution':[512,512],'runtime_sampling_hz':240,'rows':coverage}
assert total==2610
(E/'coverage.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
with(E/'coverage.csv').open('w',encoding='utf-8-sig',newline='')as f:
 keys=['name','weapon','motion','clip','duration_seconds','main_rendered_images','continuous_fps','continuous_rendered_images','detail_rendered_images','full_body_rendered_images','visually_reviewed'];w=csv.DictWriter(f,keys,extrasaction='ignore');w.writeheader();w.writerows(coverage)
for name in ['render-reuse-proof.json','blender-runtime-pose-validation.json','locomotion-equality.json','old-weapon-baseline-comparison.json']:shutil.copy2(O/name,E/name)
M=R/'web/motion-labs/verification_linxu_full_motion'
for name in ['linxu-ui-validation-matrix.json','linxu-ui-validation-matrix.csv']:shutil.copy2(M/name,E/name)
n=json.loads((M/'linxu-ui-numeric-sweep.json').read_text());small={k:n[k]for k in ['scope','generated_at','errors','transition_summary','source_hashes_still_match']};small.update(states=len(n['rows']),samples=sum(r['samples']for r in n['rows']),loop_ranking_by_endpoint_position=n['loop_ranking_by_endpoint_position'][:10],source_note='This numerical scan predates the final M870 Run shoulder change. The separate 65-state render-reuse proof validates only this report scope against final production.')
(E/'numeric-sweep-summary.json').write_text(json.dumps(small,ensure_ascii=False,indent=2))
report='''# 林叙其余动作多角度复核

## 结论

本报告复核 **65个非长枪奔跑UI状态**，每项均单独渲染前、侧、后3视角，查看覆盖起止的9个相位。另逐帧查看10组风险动作的完整周期连续采样、6组肩腕近景及7组全身/完整枪补图。共 **2610张有效512×512实渲画面**。

在这些已查看的画面中，没有复现长枪奔跑那种明显左上臂扭塌、肩部挤细。三手枪待机保持静态自然姿势；空手走路连续采样未见此前那种明显额外上下抖动。未为消除轻微穿插而另改动作。本报告是有边界的抽样复核，不是“所有帧、所有角度绝对无问题”的保证。

### 仍需如实保留的动作局限

1. **通用换弹手势没有完整对应枪械机构。** QBZ95、56-1、QCQ171等旧枪Reloading里，左手多次在枪/弹匣上方做空中抓取动作；QBZ95右肘抬得较高。例：QBZ95 t=0、1.65、2.475秒；56-1 t=.65–.80秒近景。旧五枪25项非Run动作，与原81d基线各25相位对照，骨位置及枪位置差均为0，说明这一部分是已有动作/接触不足，并非本轮新引入。三手枪Reloading也沿用通用的左手释放、抬手手势，不是逐枪制作的机械换弹。证据：sheets/qbz95-Reloading.jpg、videos/qbz95-Reloading.mp4、sheets-detail/type56_1-Reloading.jpg。
2. **M870换弹早段仍有局部枪托/衣服交叠。** t=0–.10秒后视，枪托靠近并局部进入右腋衣服，未伴随本次关注的左肩挤细。按“动作自然优先、接受轻微穿模”的要求保留，不将其误报为完全无交叠。证据：sheets-detail/m870-Reloading.jpg；完整周期见videos/m870-Reloading.mp4。
3. 攀梯、坐姿动作在本证据中只渲染角色，没有梯子、椅子等场景道具，不能据此评价与这些道具的接触。部分长枪上半身图会裁掉枪口；M870俯仰/行走有完整枪补图，其他长枪未逐帧加拍完整枪口画面。

## 覆盖与精度

官方UI清单为71项主选择，加5项旧长枪RifleRun_Before比较，共76项。本报告覆盖其中65项。M870 RifleRun，以及五旧枪的RifleRun/Before共11项，不属于本报告，应以单独的长枪肩部/奔跑报告验收。winchester1897是M870兼容别名，不另计装备。当前动作包没有Run_Before，因此空手Run没有可实际选用的Before。

- 主覆盖：65 × 9相位 × 3视角 = **1755张**。相位为0、1/8、2/8……1，覆盖首尾，不只拍3张静态图。每一装备单独渲染，没有用另一把枪的图替代上半身及挂载。
- 连续覆盖：**10组、582张**。12fps完整周期，两个短开火片段采用48fps；包含末帧。视频将前、侧、后三画面并排，末端画面会短暂停留一帧。
- 近景：**6组、84张**。三手枪瞄准与M870平举各3时间点；M870换弹早段9点；56-1换弹峰值附近7点。具体时间见coverage.json。
- 全身/完整枪：**7组、189张**。M870行走和上/下/水平瞄准；QBZ95行走；64式手枪行走、奔跑。
- 连续帧全部另存为continuous-sheets/三面逐帧表，便于不播放视频时复查。完整65项动作、实际clip、时长及覆盖数在coverage.csv/json；76项UI语义基表见linxu-ui-validation-matrix.csv/json。

### 连续视频名单

|动作|帧率|每视角画面数|
|---|---:|---:|
|空手Walk|12|15|
|M870 FiringRifle|48|13|
|M870 Reloading|12|25|
|M870 ShotgunPump|12|10|
|64式 RifleRun|12|10|
|64式 PistolShooting|12|15|
|64式 Reloading|12|41|
|97式防暴枪 ShotgunPump|12|10|
|QBZ95 FiringRifle|48|14|
|QBZ95 Reloading|12|41|

### 仅用于补充全身图的等价证明

65项主图与装备从未去重。仅全身补图中，旧五枪行走的下半身/躯干轨迹经240Hz Float64 SHA验证一致，以QBZ95为代表；三手枪行走和奔跑的下半身分别一致，以64式为代表。M870行走是独立轨迹，单独渲染。54式/64式手枪行走与奔跑的全骨轨迹也一致，QSZ92上半身不同，已在各自主图查看。详细摘要见locomotion-equality.json。数值相同不等于所有可见表面相同，所以未据此取消装备主图。

## 如何生成与验证

使用当前Three运行时实际pose()，以不大于1/240秒间隔烘焙骨骼、角色父层级、枪与泵变换，保留原始模型、贴图和蒙皮，在Blender CPU Cycles中实渲。**240Hz是姿态采样频率，不是2610张图片的渲染帧率。** 材质照明与浏览器会有差异。

Three与Blender跨三类动作、12个时刻、72个骨世界坐标复核，最大误差 **5.49×10⁻⁷米**。Blender在导入前设为240fps，避免导入帧率不一致造成时序偏移；本包只含已校正时序的最终图，不含失效试验图。

循环和选择切换另有数值检查：76项、49,413个样本，无非有限值；5776个有序切换，固定源相位.73到目标相位.37未发现姿态残留。旧枪瞄准循环端点最大位置差约0.480毫米；这些值不代表逐像素/全过渡实渲验收。该完整数值扫描发生在最终M870 Run修复前；本报告的65项已另做最终生产源复用验证。

### 最终生产源复用

最终M870 Run肩修复写入后，本报告65项共 **47,631个≤1/240秒样本** 与已渲染的修复前来源重新比较。角色全层级与当前枪/泵全层级world矩阵最大差为 **0**；角色和枪网格文件SHA不变。因此65项实渲可以复用，M870 Run必须查看其单独的新渲染。

- 最终weapon_update_v6.glb SHA256：9b95188cbd35082c2699e766b8b4464c813994345de25e3dd716ea40e805d5b0
- 角色character.glb SHA256：71f8f6a2562397e82c6e9f102ea4f2cd358b135486a30cb63777f49914ba54c9
- 完整必要源文件新旧SHA与逐项复用值：render-reuse-proof.json。
- UI基表和原数值摘要保留生成时的来源SHA，不冒充最终M870 Run结果。

## 未测部分和结论边界

没有真实浏览器/WebGL视觉复核。当前环境无法进行该验证，采用实际运行时姿态加原蒙皮Blender实渲，没有绕过浏览器限制。

9相位主图不覆盖相位之间全部帧，尤其SittingTalking约44.97秒，只能覆盖其大段姿势。连续视频仅上述10组；没有给所有65项做每帧视频。摄像机为前、单侧、后三个方向，不包含另一侧、顶视或任意360°角度。镜头内遮挡的手指/内侧皮肤、所有材质光照条件、每个实际UI过渡的像素画面均未穷尽。本报告没有依据数值“无NaN”或骨轨迹一致推断绝对无表面问题。

## 复现

工具位于项目 tools/weapon_v6_full_review/，从项目根目录运行。默认读取当前生产 web/motion-labs/linxu-motion-lab，导出器可用WEAPON_V6_SITE指定其他站点目录；历史基线可用WEAPON_V6_BASELINE指定仓库根目录，默认同级character_adapt_baseline。正常复现不依赖work/或历史comparefix目录。

1. node tools/weapon_v6_full_review/export_linxu.mjs
2. node tools/weapon_v6_full_review/calc_full_bounds.mjs
3. blender -b -t 2 -P tools/weapon_v6_full_review/render_linxu.py
4. 对连续样本：在上条命令末加 -- --continuous，再给出上表名称，如m870-Reloading。
5. python tools/weapon_v6_full_review/package_linxu.py；python tools/weapon_v6_full_review/package_continuous.py。

完整参数、近景与全身补图命令见工具README.md。可选复用证明工具verify_render_reuse.mjs只有显式指定--reference=站点目录时才做历史对比。本小型证据包不含体积较大的240Hz烘焙GLB和逐帧PNG，它们可由工具重新生成。
'''
(E/'复核报告.md').write_text(report,encoding='utf-8')
links=['<h1>林叙65项其余动作复核</h1><p>2610张有效实渲，65项三视角主表、10段连续采样、6组近景、7组全身补图。</p><p><a href="复核报告.md">中文完整报告与结论边界</a> · <a href="coverage.csv">覆盖清单</a> · <a href="render-reuse-proof.json">最终来源复用证明</a></p><p>发现：通用换弹保留空中抓取手势；M870早段枪托/腋下衣服局部交叠。未在本次已查看画面复现额外长枪Run式肩塌。不是所有帧、所有角度绝对无问题保证。</p>']
for row in coverage:
 name=row['name'];links.append('<section><h2>'+html.escape(name)+'</h2><a href="'+row['main_sheet']+'"><img loading="lazy" src="'+row['main_sheet']+'"></a>')
 for directory,label in [('sheets-detail','近景'),('sheets-full','全身/完整枪')]:
  if(E/directory/(name+'.jpg')).exists():links.append(f'<a href="{directory}/{name}.jpg">{label}</a> · ')
 if row['continuous_video']:links.append(f'<a href="{row["continuous_video"]}">连续三视角视频</a> · '+ ' · '.join(f'<a href="continuous-sheets/{name}-{v}.jpg">连续{v}逐帧表</a>'for v in['front','side','back']))
 links.append('</section>')
(E/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>林叙动作复核</title><style>body{font:16px/1.6 sans-serif;max-width:1400px;margin:30px auto;padding:0 20px;background:#f3f4f5;color:#222}section{background:white;padding:16px;margin:20px 0}img{width:100%;height:auto}a{color:#185da5}</style>'+''.join(links)+'</html>',encoding='utf-8')
files=[{'path':str(p.relative_to(E)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in sorted(E.rglob('*'))if p.is_file()and p.name!='FILES.json']
(E/'FILES.json').write_text(json.dumps({'files':files,'totalBytes':sum(f['bytes']for f in files)},ensure_ascii=False,indent=2));print('Evidence',E,'files',len(files)+1,'bytes',sum(f['bytes']for f in files))

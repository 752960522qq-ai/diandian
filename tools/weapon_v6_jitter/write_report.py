import json,hashlib
from pathlib import Path
O=Path('web/motion-labs/verification_weapon_v6_jitter');j=json.loads((O/'walk-candidate-validation.json').read_text());c=next(c for c in j['candidates']if c['id']=='sigma_1');r=next(r for r in c['continuous']if r['hz']==120);sha=hashlib.sha256((O/'motions-sigma_1.glb').read_bytes()).hexdigest();rp=json.loads((O/'render-parity.json').read_text());manifest={'candidate':'motions-sigma_1.glb','sha256':sha,'requiredInputMotionsSHA256':'b1e1360027fd582b1b26755f18d38399653f5e156007fdb247dd4bbacd433efe','recommendedTarget':'web/motion-labs/linxu-motion-lab/assets/characters/linxu/motions.glb','status':'QA candidate only; parent coordinates installation. This worker has not changed production files.','scope':'Only Walk Hips translation sampler. Other animation definitions and original buffer bytes preserved.','preview':'walk-original-vs-candidate.mp4','minimumSoleClearanceM':c['minSoleClearanceM'],'maxVerticalChangeM':c['maxVerticalWorldChangeM'],'maxAddedHorizontalBoneDisplacementM':c['maxBoneHorizontalShiftM']};(O/'candidate-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
s=f'''# 林叙连续动作诊断与最小 Walk 候选

## 可直接使用的结果

- **推荐候选：`motions-sigma_1.glb`**，SHA-256：`{sha}`。
- 应用建议：先确认输入 `motions.glb` 的 SHA-256 为 `b1e1360027fd582b1b26755f18d38399653f5e156007fdb247dd4bbacd433efe`，再由负责生产合并的人复制至 `web/motion-labs/linxu-motion-lab/assets/characters/linxu/motions.glb` 并重算站点哈希/回归。本诊断工作没有写生产目录。
- 真模型固定相机视频：`walk-original-vs-candidate.mp4`；GIF：`walk-original-vs-candidate.gif`；8相位连帧图：`walk-contact-sheet.png`。左为原站/v5，右为候选。
- 曲线证据：`walk-curves.png`、`pistol-jitter-spectrum.png`。
- **正常行走上下起伏仍约4cm。** 修复的是额外贴地补偿的折角，不是把原步态压成平移；加速度也不应归零。

## 1. 手枪 Idle：独立复现及因果链

1. 原81d来源 `leon_pistol_animations.glb` 中 `LeonPistolIdle` 时长0.033333335秒，两帧所有轨道的数值变化严格为0，是静态源姿势。
2. v5 `tools/gltf/retarget_three_weapon_update_v5.mjs:19–23` 保留这0.033秒时长，却选取3.1秒的目标 `RifleAimingIdle`，执行 `body.time=t/duration*bodyDuration`。因此将完整身体循环压缩了约93倍。
3. v5目标身体轨道与该时间映射后的原身体轨道误差仅1.17e-10，故是生成数据中的时间压缩，不是运行时猜测。
4. 实际冻结v5 rig + attachment + Three AnimationMixer：60Hz时每帧枪根最多跳13.28mm、头部15.36mm；120Hz枪根峰速1.232m/s。960Hz测1秒的频谱主峰为30Hz，枪根Z振幅5.666mm，头部Z振幅6.586mm。
5. 30Hz采样恰好近同相位，表面上几乎稳定。不能用30fps抽样、单帧或仅首尾差验收此问题。不规则12–24ms帧间隔也复现抖动。
6. 三人worker已切换的v6另做只读对照：三把手枪在60/120/240Hz、连续30周期，枪根速度≤5.4e-14m/s，属浮点噪声。这里保持静态是尊重这个静态源动作，不能据此冻结其它有呼吸/步态的动作。

详细证据：`pistol-source.json`、`pistol-960hz-trajectories.json`、`diagnosis.json`。此次已记录的v5数值来自当时冻结的v5站点快照，没有将已更新生产站误标为v5。重新运行历史对照需显式提供 `WEAPON_V6_V5_BASELINE`，生产验证不依赖该快照。

## 2. 空手 Walk：源动作与历史补偿分离

- 原81d与冻结v5的角色模型/基础动作包SHA完全一致，连续所有采样的Walk世界轨迹相同。该现象不是本次四枪更新新写入Walk。
- 真实源是用户 `Standard Walk.fbx`，周期1.1666667秒。`assets/characters/linxu_motion_v2/walk-samples.json`保留其60Hz采样。
- 按原腿长比例和网页归一化换算，源正常臀部Y起伏45.16mm。原站合成后42.43mm。
- 额外贴地抬高在4.72–30.45mm之间。旧生成器 `tools/gltf/retarget_linxu_fbx_v2.mjs:39–46` 用三帧最大值包络后线性插值，在0.383秒、0.950秒等处有速度折角。只消除循环端点位置差不能修复这些周期内部折角。
- 撤掉整条补偿的反事实会使鞋底穿地27.86mm。因此既不能删补偿，也不能低通过滤整个Hips.y而抹掉源步态。
- 原Walk首尾位置跳变为0；动画采样后附加层对Walk身体位移为0；绝对seek与增量mixer最大位置差<9.5e-8m；切换和重复seek不累积漂移。没有证据把这归因于IK、额外骨重写或AnimationMixer重置顺序。

## 3. 推荐最小候选

只对旧的**附加贴地补偿**做周期Gaussian（sigma=1个60Hz采样间隔）+周期C2三次样条，并加入最小0.338mm安全常量。源全部旋转、1.1666667秒节奏、Hips.x/z和原始Hips.y分段线性bob完整保留。

glTF只变Walk的一个translation sampler：采用标准CUBICSPLINE，源x/z和源y使用原分段线性的入/出切线，叠加补偿样条切线。**只有补偿C2连续，原动作自身关键帧的节奏/折角没有被平滑掉。**

重载候选GLB并跑实际Three rig，30/60/120/240Hz均连续至少3周期：

| 量 | 原站/v5 | 推荐候选 |
|---|---:|---:|
| 臀部上下范围 | 42.43mm | 39.78mm |
| 120Hz臀部峰值速度 | 0.550m/s | 0.470m/s |
| 120Hz臀部峰值加速度 | 57.44m/s² | 41.65m/s² |
| 120Hz头部峰值加速度 | 57.40m/s² | 44.26m/s² |
| 循环首尾位置跳变 | 0 | 0 |
| 最低鞋底净空 | 2.553mm（120Hz） | 2.671mm（240Hz） |

- 相比原站，任何时刻最大垂直改动仅3.300mm。
- 240Hz鞋底净空范围2.671–16.368mm；原120Hz范围2.553–15.186mm。最大离地净空增加约1.18mm，不把这种已有离地距离夸称为全程贴地。
- 所有骨骼世界水平位置新增偏移<2.0e-11m，因此没有新增水平脚滑；局部XZ误差<1.2e-11m。所有旋转采样器原字节未变。
- 其它动作定义以及原二进制buffer前缀字节全部保持；只改变一个sampler。
- 比较了sigma0.6/1/1.5/2。更强候选的最大改动5.76–8.38mm，但剩余峰值加速度主要来自源动作；没有必要为追求更低数字扩大改动，推荐sigma1。

`walk-candidate-validation.json`保存详细结果，`walk-candidates.json`保存补偿值/导数，`walk-source.json`保存源曲线分离与实际皮肤鞋底采样。

## 4. 连帧视觉与跨读取验证

- Blender Cycles真实网格、原材质贴图，固定相机24fps，一个28帧完整周期重复3次形成3.5秒片段。视频逐帧来自真实Three姿态采样烘焙，不是AI图，也不是浏览器录屏。
- 原始CUBICSPLINE在Blender的导入曲线近似曾有最大0.40mm误差，所以仅用于渲染的副本改为从Three采样240Hz线性烘焙；生产候选仍是原CUBICSPLINE。
- 最终28帧实际Blender根位置与Three最大误差：原站{rp['maxOriginalErrorM']:.3g}m、候选{rp['maxCandidateErrorM']:.3g}m。
- Godot 4.6.3成功导入两份真实动画/312骨骼模型。`GLTFDocument.generate_scene(...,240)`下候选根位置与Three最大误差{rp['godot']['maxCandidateErrorM']:.3g}m。默认30Hz导入会重新采样，原动画本身也有毫米级近似，不应用其低频采样来否定高频验证。
- 已审阅8相位连帧图：原动作腿/脚/摆臂形态及节奏保留，没有新增可见反常弹跳或穿地。水平脚滑是否新增由逐骨世界XZ对比证明，而不是仅凭截图宣称全项目脚滑为零。
- 浏览器未运行：此前环境Chromium socket限制仍未绕过。本报告不声称已做浏览器/手机运行验收。

## 5. 真实UI循环、切换、暂停、seek

从原/冻结v5的app.js直接提取并执行items/selectMotion/selectWeapon/frame/播放/seek函数，DOM和渲染仅用stub，真实Three rig照常执行。这是CPU逻辑验证，不是完整DOM浏览器测试。

- 共78个可见动作/装备组合，分别推进3个时长；另对其中56个真正repeat的组合采样3循环。22个once组合不强行循环。
- Reloading、ShotgunPump、Dying、FlyingBackDeath、HangToCrouch、SittingTalking到末尾停；m870/97式FiringRifle也是once。
- 三把手枪PistolShooting和普通步枪FiringRifle实际repeat；已按repeat检查，未把它们误当once。
- 暂停、重复seek、重选同动作的世界位置漂移都为0。
- 一次性动作末尾直接点击播放，原handler会先将time重设0，再恢复playing；下一帧正常前进，不会立即再停。无需修改UI。
- 其它已检查循环的最大端点差是v5 m870向上瞄准约1.44mm，手枪射击最大端点差约0.48mm。它们不是手枪Idle 30Hz身体抖动那种时间压缩问题；没有扩改。

详细结果：`app-flow.json`、`visible-loop-audit.json`。循环端点角差使用归一化四元数计算，避免非单位浮点四元数产生假阳性。

## 可移植重建与输入身份

所有命令从工程根目录运行。工具不再硬编码此次机器的绝对路径：

- `WEAPON_V6_BASELINE`：原81d5a485基线仓库根目录。未设置时默认为**当前工程的同级目录** `character_adapt_baseline`。
- `WEAPON_V6_V5_BASELINE`：冻结v5仓库根目录，**独立且可选**。没有默认的私有work路径，只有显式执行历史对照工具才需要；不设时历史工具会明确报缺少此可选输入，不会将当前生产伪装成v5。
- `runtime()`默认加载当前工程的林叙站。`verify_current.mjs`只验证当前站，不读取原基线或v5快照。
- 原基线中导入的JS也必须能解析 `three@0.180.0`，例如该基线按原工程说明安装依赖，或与当前工程共享已安装的上级node_modules。脚本不会暗中修改依赖目录。

### 原始输入来自哪里

原用户提供的FBX是仓库已追踪文件 `assets/characters/linxu_motion_v2/sources/Standard Walk.fbx`，Git LFS身份为 `sha256:4e76a7d67450ddae042f13592a1cf65ad9f9d71eac270b139910007de0054b76`，1,865,568字节。本次工作区该路径只有LFS指针，不把指针冒称为已经读取的FBX。

**重建本候选不需要FBX原始字节**，实际使用81d5a485中已入库的以下JSON。先在指定完整基线中找；若提供的是只有web的站点快照，则读取当前工程里原已入库的同名JSON，并逐一验证以下SHA-256。缺失或内容不符会明确失败，不会猜测数据：

- `assets/characters/linxu_motion_v2/walk-samples.json`：`6454d0a46c687329385b181382862d5cbca8dc0d47b7c77c1aa1deadee988b20`
- `assets/characters/linxu_motion_v2/retarget_report.json`：`fdf1e1d84903db18a0731cedb5085a911aae4b01b083a774775779f46604d289`
- `assets/characters/linxu_motion/retarget_calibration.json`：`780665cc8e61bb728a04cd4ae75cb46241a67ac1840f6f90171f0e109534cd7f`

此外需要原基线的林叙站 `character.glb`、`motions.glb`、站点JS、配置及其引用的武器GLB。它们是已有工程输入，不包含在“只有本候选GLB”的交付内。上述原动作包SHA见本报告开头。若要从FBX重新生成walk-samples，再取得仓库LFS中的对应原文件并用原采样器；不需要用户重复上传原FBX。

### 当前生产验证，无历史输入

```sh
node tools/weapon_v6_jitter/verify_current.mjs
```

### 重建已批准Walk候选，不需要v5快照

如未采用同级目录默认值，先设置：

```sh
export WEAPON_V6_BASELINE=/path/to/original-baseline
node tools/weapon_v6_jitter/walk_source.mjs
python tools/weapon_v6_jitter/smooth_floor.py
node tools/weapon_v6_jitter/build_candidate.mjs
node tools/weapon_v6_jitter/validate_candidate.mjs
```

生成器仍是本次已验证算法，重建会写QA候选输出而非生产；**本次路径收尾没有执行重建，也没有重写已批准GLB**。历史原旋转/其它动作buffer字节保持验证仍保存在 `walk-candidate-validation.json`。

### 可选的历史v5对照

只有需要重现历史抖动时才提供该快照：

```sh
export WEAPON_V6_V5_BASELINE=/path/to/frozen-v5-repository
node tools/weapon_v6_jitter/diagnose.mjs
node tools/weapon_v6_jitter/pistol_source.mjs
node tools/weapon_v6_jitter/app_flow.mjs
node tools/weapon_v6_jitter/audit_visible_loops.mjs
```

### 真实模型预览

```sh
node tools/weapon_v6_jitter/bake_render.mjs
blender --background --threads 4 --python tools/weapon_v6_jitter/render_walk.py
python tools/weapon_v6_jitter/plot_evidence.py
python tools/weapon_v6_jitter/package_render.py
```

缺少可选的历史手枪轨迹时，plot_evidence只生成Walk曲线，不强制读取v5。需要Three0.180、Python NumPy/SciPy/Matplotlib/Pillow、Blender；MP4另需ffmpeg。完整数值轨道较大，站点发布只需选用视频、图片、报告和必要候选，不必发布所有中间GLB/原始轨道。

工具路径收尾的前后哈希与候选不变证明见 `tool-portability-change.json`；此文件只记录代码路径/输入发现/当前验证入口的变化，不代表重新运行全部历史动作或浏览器验收。
'''
(O/'README.md').write_text(s)
print(sha)

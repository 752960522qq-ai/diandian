# 修订31：两人持枪微调（已部署，未推送 GitHub）

基线为 `aff56fbd32bc5fddc41d5abde063cd9bc4050bde`。点点和知更均已修改，两个线上站点已更新至修订31。本轮不改角色/武器 GLB、贴图、原动画文件或 Godot 运行时。

## 修改范围

| 用户问题 | 最终修改 |
| --- | --- |
| 汉阳造右手偏高、大臂穿模、左腕弯曲 | 右手参考各自 M1897 的手掌方向和握指；瞄准/开火使用其实际 RE4 握姿，待机/行走/跑步使用对应握姿。按汉阳造扳机重新降低接触点，微调肘部与肩窝避让。知更行走在参考握姿上额外舒展右腕 8°。左腕减少内折。 |
| 95 式弹匣穿模 | 小幅调整待机、跑步、举枪时枪体偏角及右掌侧向位置，右肘避让弹匣。行走原挂枪参数保留。 |
| C96 枪托穿模 | 待机/行走/跑步枪体偏角与右肘、右掌分别调整，原瞄准/开火和装填姿态保留。 |
| QCQ171 举枪左臂 | 减少强制让肘部追随掌轴的权重，左肘自然下落；瞄准和开火使用一致设置。 |
| 长枪待机/行走左胸拉扯 | 对内侧左胸与衣领的小块蒙皮区域做平滑权重转移，减弱上臂旋转牵拉。只在长枪待机/行走启用，其他动作恢复原权重。 |
| 以轻微修改为主 | 除明确要求参考 M1897 的 97 式开火/拉泵上半身外，保留原动作来源；以握点、腕角、肘部和局部衣领修正为主。 |
| 97 式开火跳动、曲肘拉泵 | 合入 M1897 胸部、颈头、双肩、双臂及手指轨道，保持源时长和节奏；髋部、腿部等其余轨道保持 AR。按 97 式握把高度下移枪体，左手与泵柄同步运动。 |
| 56-1 手掌未握到握把 | 右掌沿枪体向后移动 20 mm（枪体局部尺寸，渲染后约 18 mm），枪体与左臂原姿态保持。装填不应用该偏移。 |

两站的运行实现为 `weapon-attachment.js`、`chest-skinning.js`、`type97-motion.js` 及各自 `assets/weapon_attachment.json`。合并的两人参数归档为 `assets/weapons/character_attachment_v31.json`。入口和配置的缓存版本均已更新。

## 同机位对照

每张图均由实际本地 Three.js 场景渲染。前后使用相同动作时刻、相机和背景，图像旁的 JSON 保存握点误差、骨骼与武器变换。`before-*` 使用基线的原运行模块和参数，并关闭新增胸口修正。

| 问题/时刻 | 点点：修改前 → 后 | 知更：修改前 → 后 |
| --- | --- | --- |
| 汉阳造瞄准 2.03 s | [前](diandian/before-hanyang-aim.png) → [后](diandian/hanyang-aim.png) | [前](zhigeng/before-hanyang-aim.png) → [后](zhigeng/hanyang-aim.png) |
| 汉阳造行走 0.23 s | [前](diandian/before-hanyang-walk.png) → [后](diandian/hanyang-walk.png) | [前](zhigeng/before-hanyang-walk.png) → [后](zhigeng/hanyang-walk.png) |
| 95 式待机 3.46 s | [前](diandian/before-qbz95-idle.png) → [后](diandian/qbz95-idle.png) | [前](zhigeng/before-qbz95-idle.png) → [后](zhigeng/qbz95-idle.png) |
| 95 式跑步 0.47 s | [前](diandian/before-qbz95-run.png) → [后](diandian/qbz95-run.png) | [前](zhigeng/before-qbz95-run.png) → [后](zhigeng/qbz95-run.png) |
| C96 待机 5.11 s | [前](diandian/before-c96-idle.png) → [后](diandian/c96-idle.png) | [前](zhigeng/before-c96-idle.png) → [后](zhigeng/c96-idle.png) |
| QCQ171 瞄准 2.79 s | [前](diandian/before-qcq171-aim.png) → [后](diandian/qcq171-aim.png) | [前](zhigeng/before-qcq171-aim.png) → [后](zhigeng/qcq171-aim.png) |
| 左胸，97 式待机 4.26 s | [前](diandian/before-chest.png) → [后](diandian/chest.png) | [前](zhigeng/before-chest.png) → [后](zhigeng/chest.png) |
| 56-1 瞄准 3.04 s | [前](diandian/before-type56-grip.png) → [后](diandian/type56-grip.png) | [前](zhigeng/before-type56-grip.png) → [后](zhigeng/type56-grip.png) |

汉阳造瞄准图中，左腕弯曲指标由点点 58.9° 降到 35.3°、知更 63.6° 降到 41.7°。指标为前臂与中指掌骨方向的夹角，用于同角色前后比较，不是完整的人体关节角定义。

97 式动作阶段：

| 角色 | 开火 | 拉泵 |
| --- | --- | --- |
| 点点 | [起始](diandian/type97-fire-rest.png) → [后坐](diandian/type97-fire-peak.png) | [起始](diandian/type97-pump-start.png) → [曲肘](diandian/type97-pump-bent.png) → [复位](diandian/type97-pump-end.png) |
| 知更 | [起始](zhigeng/type97-fire-rest.png) → [后坐](zhigeng/type97-fire-peak.png) | [起始](zhigeng/type97-pump-start.png) → [曲肘](zhigeng/type97-pump-bent.png) → [复位](zhigeng/type97-pump-end.png) |

## 验证结果

- 两人各 41 个武器/动作组合，按 60 Hz 遍历完整动作，共 12,982 帧；骨骼数值均有限，未出现手臂翻转跳变。本轮新校准的握点误差低于 0.001 mm。
- 汉阳造、95 式、C96 的待机/行走/跑步/瞄准/开火额外检查了共 4,194 帧，包含均匀采样和全部源关键帧。枪械使用真实三角形，手臂使用沿骨骼分段采样的渐变半径范围。
- 所测最小间隙：点点汉阳造 3.17 mm、95 式 4.24 mm、C96 5.33 mm；知更分别为 2.38 mm、3.20 mm、5.92 mm。具体半径和取样范围见两个 clearance 脚本。这是几何代理及有限采样，不代表所有细小皮肤、手指、衣服接触的穷尽证明。
- 128 个保留姿态的骨骼与枪体分量差严格为 0。另检查两人 56-1 的五个动作，枪体/左臂不变，右手后移符合 20 mm 局部偏移。
- 56-1 既有左手软约束偏移保留：奔跑最大约 40/32 mm，知更瞄准/开火约 17/18 mm；不是本轮右掌后移引入，也不计入上述新握点精度结论。
- 97 式每段 159 条上半身轨道与 M1897 源时间和值完全相同，其余 AR 轨道保持原值。开火 0.2333 s，拉泵 0.7333 s。拉泵左肘夹角变化约 41°/42°；物理泵行程仍为 44.8556 mm，离开拉泵动作复位。
- 重复暂停、往返拖动、切枪后恢复均未累积变换。局部蒙皮权重非负且归一，点点影响 2,955 个顶点、知更 2,449 个顶点；退出适用动作后恢复原缓冲区。
- 新页面以真实动画循环运行，390 px 手机宽度无横向溢出，两站单次开火、拉泵停止和泵柄归零通过，无页面脚本异常。两站 JS 语法与 `git diff --check` 通过。

数值证据见 `scan-*.json`、`clearance-*.json`、`invariants-*.json`、`regression-*.json` 和 `ui-smoke.json`。本轮已部署两个站点，未推送 GitHub。

## 本地复查

从仓库根目录启动 `python -m http.server 8080 --bind 127.0.0.1`，打开两个校准室路径。自动复查需要 Chromium、Playwright（或 `PLAYWRIGHT_MODULE` 指定的 playwright-core 模块）和可连接的 CDP 端口，默认 `http://127.0.0.1:9222`，可由 `CDP_URL` 覆盖。

`browser.cjs init diandian` / `init zhigeng` 在本地站点创建确定性检查页，载入前暂停自动帧循环，初始化 `qa-context.js`。然后用 `browser.cjs eval <角色> <脚本路径> <输出JSON>` 依次执行：

1. `stock-magazine-clearance.js`、`hanyang-clearance.js`（建立实际几何检测函数）；
2. `scan.js`、`clearance-cycle.js`、`invariants.js`；
3. `regression.js`（需要下述基线目录）；
4. `capture.cjs` 输出当前画面，`capture.cjs --before` 输出基线；
5. `ui-smoke.cjs` 创建独立页面，使用浏览器真实帧循环检查手机布局和单次动作。

所有命令从仓库根目录执行，脚本位于本目录。例如：

```sh
node web/motion-labs/verification_r31/browser.cjs init diandian
node web/motion-labs/verification_r31/browser.cjs eval diandian web/motion-labs/verification_r31/invariants.js work/invariants-diandian.json
```

基线模块目录默认 `work/grip-r31/before/diandian/` 和 `work/grip-r31/before/zhigeng/`。用基线提交中各站的 `weapon-attachment.js`、`c96-dynamics.js`、`c96-reload.js`、`assets/weapon_attachment.json` 按原相对路径放入对应目录即可；无需复制模型。回归检查也接受页面变量 `QA_BASELINE_ROOT` 指定其他同源目录。

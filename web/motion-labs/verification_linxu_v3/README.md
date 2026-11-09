# 林叙 V3：肩线与持枪修正

基线：`752960522qq-ai/diandian`，`46fbc50f2640b626e3fe161a5f9555ab18d6cde1`。从此提交单独检出制作，未推送、未发布线上站点，未改 Godot 游戏控制器。

## 修改范围

- 空手 Idle、Walk、Run：锁骨分别抬升 8°、8°、6°，舒展 4°、4°、2°；反向补偿上臂，保留原有肘腕摆动和 FBX 步态。仅这三个动作的左右肩、上臂旋转轨道改变，其余 31 个底层动作和所有时长保持不变。
- 不扩大模型、骨长或缩放；角色网格、蒙皮、面部骨、材质和贴图均未改。
- QBZ95、56-1、QBU85、97式 Hawk、QCQ171：按点点同武器、同动作的实际最终掌腕与指节姿态重定向，替代旧的静态统一握法。左手中指指根对齐来源位置；换弹左手保留离枪动作，不强行锁死。
- 持枪待机、行走的右肘向掌线方向混合 50%，减少腕部折弯。QBU85 奔跑前移量由 11cm 调为 7cm，最弯右腕线段夹角由约 65.01° 降为 53.92°；左腕约 51.94°。这是适配量，不是模型体型调整。
- 更新网页运行时与缓存版本；新增 31 段独立装备动作烘焙包及枪体/泵柄变换 JSON，供后续引擎接入使用。不能只导入人物动画而忽略枪体变换。

## 已完成检查

- 43 种装备/动作组合、2,623 帧：无非有限矩阵，双手约束锚点最大误差小于 0.001mm，往返切换漂移为 0。锚点数值不等于皮肤零穿插。
- 31 个装备动作，每段 121 个相位：执行后的掌腕/指节与重定向来源最大误差 0.682°。初始射击抽样出现最大 1.77° 的指节插值差，已将射击参考细化至 240Hz 后复测通过。
- 空手三动作按 60Hz 检查：时长、循环端点、根运动、腿部轨道和未涉及通道保留；采样手/前臂与裤面均保持正间隙。原生坐标最小间隙（左/右）：Idle 17.24/10.39mm，Walk 4.27/20.05mm，Run 4.68/9.60mm。
- 31 段装备烘焙、312 骨、3,070 帧重新读取验证：关键帧分量误差最大 6.61e-7；关键帧中点骨骼位置误差最大 1.255mm 原生坐标。普通动作 30Hz，射击/拉泵 240Hz。重复烘焙得到同一 GLB SHA256。
- Blender 读取真实导出 GLB：空手三动作各四相位前后对照；五枪瞄准近景；QBU85 奔跑及 QBU85/QBZ95 待机从两侧复核。可见肩线和握持改善，选定视图未见新增明显身体穿插。

## 限制与遗留

- Chromium 启动被环境限制阻止：`socket() failed: Operation not permitted`。本次未完成浏览器 UI、手机布局或 Godot 实机验收；不是网站已上线。
- 枪托与袖口个别姿态靠得较近；逐三角面、所有时刻的碰撞没有穷尽验证。QBU85、56-1 的左手仍保留来源中的托持/较开放指型。QBZ95 瞄准姿态食指在护圈外，未另行认证逐枪射击扳机接触。
- 旧固定掌心射线测试会命中不同手指/虎口，或漏检，不能把它当作当前动态手型的真实碰撞判定。初轮诊断保留在 `exploratory/`，其中的报警未冒充通过项。独立实物几何近景复核见 `independent-review.md`。
- 离散抽样和烘焙线性插值不是连续时间约束证明。未新增布料/头发物理、游戏碰撞、枪弹/伤害逻辑。

## 复现

需要 Node.js、three@0.180.0、Blender。先恢复仓库 LFS 资源。从仓库根目录：

```sh
node tools/gltf/refine_linxu_shoulders_v3.mjs
node tools/qa/validate_linxu_shoulders_v3.mjs
cp assets/characters/linxu_motion_v3/motions.glb web/motion-labs/linxu-motion-lab/assets/characters/linxu/motions.glb
node tools/characters/calibrate_linxu_weapons_v3.mjs
node tools/qa/validate_linxu_motion.mjs --out=web/motion-labs/verification_linxu_v3
node tools/qa/validate_linxu_reference_grip_v3.mjs
node tools/qa/validate_linxu_hand_pose_v3.mjs
node tools/qa/validate_linxu_wrist_v3.mjs
node tools/gltf/bake_linxu_grips_v3.mjs
node tools/qa/export_linxu_comparison_v3.mjs qbz95 RifleAimingIdle
blender --background --python tools/blender/preview_linxu_grips_v3.py -- qbz95 RifleAimingIdle linxu right
```

本地网页：`python -m http.server 8087`，访问 `/web/motion-labs/linxu-motion-lab/`。有可用 Chromium/Playwright 的执行环境可继续 `node tools/qa/browser_linxu_v3.mjs`。

# 林叙 · 独立动作与装备站 · V2

角色以用户上传的 `Linxu_assembled_animated.glb` 为准。网格、材质、原始精度贴图、312 根骨骼及蒙皮不变。

## 本次替换

| 网站动作 | 用户提供的动作 | 周期 |
| --- | --- | ---: |
| 待机／站立 | Orc Idle.fbx | 5.3333 秒 |
| 行走 | Standard Walk.fbx | 1.1667 秒 |
| 奔跑 | Running.fbx | 0.6333 秒 |

三个 FBX 由 Blender 按 30 fps 读取世界姿态，再按林叙骨架比例和解剖坐标架重定向。走路与跑步消除净水平前进，以便在预览中原地循环；保留原有节奏、上下起伏和周期内的摆动。按实际蒙皮表面检查手与裤腿间距、鞋底接地和循环接缝，仅修正检查发现的适配问题。

其余无装备动作及五枪动作沿用上一版。旧无装备 Run_Before 已移除，持枪奔跑的肩部修正对比仍可使用。未加入表情测试。

## 动作范围

12 个无装备动作：待机、行走、奔跑、倒退行走、交谈、转头、二郎腿坐姿、坐姿交谈、攀爬梯子、悬挂翻越、倒地死亡、后飞死亡。

QBZ95、56式（56-1）、QBU85、97式 Hawk、QCQ171 提供持枪待机、行走、奔跑、瞄准、射击、换弹；97式另有拉泵上膛。

## 资产与复现

- 角色原件及 V1 动作：`assets/characters/linxu_motion/`。
- 本次三个原始 FBX、新动作包和校验报告：`assets/characters/linxu_motion_v2/`。
- 网站浏览器角色移除内嵌动作，网格、蒙皮、贴图数据字节保持不变；播放仅来自独立 `motions.glb`。
- V2 网页验证与发布记录：`web/motion-labs/verification_linxu_v2/`。

从仓库根目录运行：

```sh
blender --background --python tools/blender/sample_linxu_fbx_v2.py
node tools/gltf/retarget_linxu_fbx_v2.mjs
node tools/qa/validate_linxu_fbx_v2.mjs
blender --background --python tools/blender/preview_linxu_fbx_v2.py
cp assets/characters/linxu_motion_v2/motions.glb web/motion-labs/linxu-motion-lab/assets/characters/linxu/motions.glb
node tools/qa/validate_linxu_motion.mjs --out=web/motion-labs/verification_linxu_v2
python -m http.server 8087 --bind 127.0.0.1
# 另一终端
node tools/qa/browser_linxu_v2.mjs
```

预览：`http://127.0.0.1:8087/web/motion-labs/linxu-motion-lab/`。本目录是无需构建的静态站，发布时复制为现有 Sites 项目的 `dist/`。

校验覆盖新动作的蒙皮表面间距、脚底高度、循环首尾、原有动作数据保留、43 种装备/动作组合和手机端操作。表面检查使用离散帧采样，不是连续全网格碰撞证明。该目录用于网页预览，枪械握持求解未接入 Godot 游戏运行时。

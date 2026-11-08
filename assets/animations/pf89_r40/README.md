# PF89 R40：恢复里昂式高位持筒

2026-11-07 本地交付，基于仓库 `2ddb6721e662fd27c97c576a2c222159272c7d3c`。本版替代本轮R39交付，纠正了待机/跑步左手被拉到筒身下端的问题。未提交、推送或部署。

## 可编辑文件

- `diandian_pf89_r40.blend`、`zhigeng_pf89_r40.blend`：两人的实际模型、材质、骨架和17组角色/武器动画，纹理已打包，可直接打开。
- `pf89_motion_guides.blend`：Blender编制的抽筒/举筒路径引导场景。

Blender 4.3.2，60Hz烘焙。打开角色场景后，默认时间轴 `PF89_ReviewSequence` 按标记预览全部动作。单段编辑需同时静音角色骨架与 `PF89_AnimatedMount` 的复核序列，再使用成对 `Rocket*` / `Rocket*_Weapon` 动作。场景内 `PF89_README` 有说明。

## 本次修正

原始提供文件 `w07_000 / 001 / 002.fbx` 的真实网格与骨架已经核对：左手在靠肩高位，右手在腰前低位。R39虽然减少了交叉，却错误地将左手锁到前端下托位置。

R40保留里昂上半身重定向动作，待机、行走和跑步的左手世界朝向直接使用源动画；将接触点改为PF89靠肩后段，并以源肘方向为主，只做接触和体型避让。左掌、左肘和右手不再被同一个下托持法覆盖。

抽筒末端和举筒起始同步到高位持筒位置，举筒时握点与手腕方向一起平滑转到瞄准持法。正常瞄准、开火和弃筒参数保持R39；原腕部扭转分摊、抽筒防转圈修复以及14项可见类别继续保留。

源文件只有22根骨，没有独立手指骨或手指曲线。手指使用两人现有握指姿态作适配，不能称为复制里昂手指动画。

## 验证与范围

详细结果见 `web/motion-labs/verification_r40/README.md`。两人高位持筒各1268帧120Hz检查，左腕始终高于右腕至少15.3/15.2cm；源手方向最大误差小于0.05°。枪体/躯干头部三角面和左臂中心线/躯干的检测均无交叉。

完整17动作每人4076帧检查无非有限值；两份.blend重新读取各2050帧，最大关节误差小于0.002mm。其他十款武器1088姿态与基线完全一致。

本轮未改原GLB、蒙皮权重、Godot或下半身源轨道，网页连续IK仍以JavaScript/配置为准。.blend为可编辑烘焙，不是已经集成到Godot的动画控制器。浏览器实播与跨动作混合未验收；跑步循环首尾前臂仍有约3.5°/3.2°差异，不声称完全无缝循环。有限采样及中心线检测不能证明所有皮肤表面在任意时刻绝对无接触。

## 重建

仓库须检出原LFS资源。需要Node.js、three@0.180.0、three-mesh-bvh和Blender 4.3.2。

```sh
blender -b --python tools/blender/author_pf89_r40_paths.py -- \
  assets/animations/pf89_r40/path_references.json \
  work/pf89-r40/rebuilt-paths.json work/pf89-r40/rebuilt-guides.blend
node tools/qa/export_pf89_blender.mjs work/pf89-r40/rebuild
for c in diandian zhigeng; do
  blender -b --python tools/blender/bake_pf89_review.py -- \
    work/pf89-r40/rebuild/$c-poses.json.gz work/pf89-r40/rebuild/$c.blend
  blender -b work/pf89-r40/rebuild/$c.blend --python tools/blender/validate_pf89_bake.py -- \
    work/pf89-r40/rebuild/$c-poses.json.gz work/pf89-r40/rebuild/$c-validation.json
done
```

修改引导轨迹后需将输出JSON样本同步至对应站点配置的draw_path / raise_paths，再导出烘焙。当前配置已含R40轨迹。

# PF89 R40 验证记录

本地修订，基于 `2ddb672`，未推送或部署。源里昂高位持筒参考见 `source-reference/`；资源使用说明在 `assets/animations/pf89_r40/README.md`。

## 确认动作意图

实际读取并渲染提供的 w07_000 / 001 / 002 FBX，而非仅用握点误差判断是否正确。左手应位于靠肩后段高位，左前臂上抬，右手保持低位。源没有独立手指曲线，未声称复用原手指动画。

## 最终配置检查

- `carry-source.json`：待机、行走、跑步每人1268帧120Hz。左腕始终高右腕至少15.34/15.21cm；对源重定向左手世界方向的最大误差0.016°/0.044°。动作内左臂局部最大单步0.683°/0.706°。
- `carry-clearance.json`：同三动作完整120Hz，实际枪体与蒙皮头/躯干三角面无交叉，左臂中心线与躯干三角面无交叉。该中心线最小有限采样距离约4.29/2.88cm，不是皮肤表面间距。
- `final-focused-clearance.json`：待机单点，完整走/跑、6个举筒、抽筒和向下发射120Hz复核；两类交叉计数均0。
- `pose-metrics.json`：每角色17动作4076帧120Hz，六条手臂骨骼无非有限变换；全17动作10Hz左臂中心线/躯干交叉记录0。抽筒最大局部单步约3.67°，不再呈现原先持续转圈。
- `runtime-regression.json`：每人527姿态，下半身源轨道/运行姿态保持、握点误差和多轮切换复位检查通过。
- `blender-diandian.json` / `blender-zhigeng.json`：实际保存.blend重新载入，每人17动作、2050帧，最大关节误差0.001548/0.001708mm。
- `non-pf89-regression.json`：其他10款武器，两人1088姿态与基线变换/可见性完全一致，共用GLB哈希保持。
- `config-scope-regression.json`：本轮相对R39只改PF89持筒、抽筒/举筒衔接与路径。常规瞄准/开火/弃筒参数及其他武器保持。
- `motion-catalog.json`：PF89可见14项，3个备用举筒变体仍保留为可编辑动作；未破坏源数据。

## 真实视频与图像

交付MP4由两份最终R40 Blender文件逐帧渲染，包含待机、跑步、高位握持特写、抽筒、举筒到瞄准和瞄准腕指特写。分段切镜，不是对游戏内跨动作混合的验收；未使用生成式动作替换。各角色目录保存相应实际渲染帧。

`source-reference` 的图片是提供的源FBX网格/骨架，不是原游戏截图。其简化网格和22骨结构不应被误称为完整商业游戏角色资产。

## 限制

- 跑步循环首尾左前臂仍相差约3.46°/3.19°，未宣称完全无缝。弃筒原有15–16°最大单步仍保留；本轮没有重做弃筒。
- 手臂检测是中心线，排除了肩部前20%的正常接入区域；躯干按蒙皮权重筛选。开放衣物、完整手指/手臂皮肤表面与采样间瞬间不在穷尽证明范围内。
- 网页浏览器实播、手机布局及跨动作混合未完成；没有Godot或Android/H5发布。

## 复现

```sh
node tools/qa/validate_pf89_carry_source.mjs work/pf89-r40/check-source.json
node tools/qa/pf89_verify_final.mjs work/pf89-r40/check-carry.json --carry-only
node tools/qa/pf89_verify_final.mjs work/pf89-r40/check-focused.json
node tools/qa/pf89_pose_metrics.mjs work/pf89-r40/check-pose.json
node tools/qa/validate_pf89.mjs
node tools/qa/validate_non_pf89_regression.mjs 2ddb672
node tools/qa/validate_motion_catalog.mjs
blender -b assets/animations/pf89_r40/diandian_pf89_r40.blend \
  --python tools/blender/render_pf89_r40_video.py -- work/pf89-r40/frames-diandian diandian
```

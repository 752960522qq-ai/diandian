# PF89 900 mm 与双角色握持修订 R38

本轮以本地已有的 `1fbd2fb` 为基线，只修改本地资源与动作预览代码。没有部署站点、推送 GitHub 或同步远端。

## Blender 文件

- `diandian_pf89_900mm.blend`：点点，17 段完整动作。
- `zhigeng_pf89_900mm.blend`：知更，17 段完整动作。
- `pf89_raise_guides.blend`：Blender 中编制的举筒基础路径。
- `../../weapons/pf89_900mm.blend`：900 mm 独立武器。

两个人物文件保留角色网格、材质、骨架和贴图，以 60 fps 烘焙本地最终姿态。默认时间轴按顺序播放全部动作，命名标记定位每一段。角色动作 `Rocket*` 与武器挂点动作 `Rocket*_Weapon` 配对；单段编辑时先静音 `PF89_ReviewSequence`，再启用相应成对 NLA 轨道或动作。文件内 `PF89_README` 亦说明用法。

## 修改内容

Blender 按实际世界顶点测得原 PF89 长 981.170893 mm，整体等比缩至 900 mm，保留外形比例、UV 与材质。重新导入最终 GLB 后长度为 899.999917 mm；网页挂载比例为 1。完整记录见 `../../weapons/pf89_dimensions.json`。

重新校准右掌与握把侧面、握指和拇指，左掌在筒身下方独立承托。枪体向身体外侧避让，双肘由手掌方向和身体外侧共同引导，取消左臂在 ±180° 分支间跳变的扭转分摊。走跑时根据手臂实际骨长适量抬筒，避免左腕伸出可达范围。举筒使用 Blender 基础曲线与运行时外侧弧线；取出和丢弃重新调整武器轨迹、显隐与双手松握过渡。

两站的 `weapon-attachment.js`、`rocket-motion.js` 和 `assets/weapon_attachment.json` 为连续 IK 的实际实现，完整参数另存 `../../weapons/character_attachment_v38.json`。角色原 GLB、RE4 源动画与下半身轨道保持原样；本次没有将网页约束移植到 Godot 旧组件。Blender 文件是当前效果的可编辑烘焙，不是替换原角色资产的要求。

## 验证

- 每人 17 段动作按 120 Hz 检查，共 8,152 帧。锁定支撑时最大掌心挂点误差：点点 1.019 mm、知更小于 0.001 mm。松手阶段不按锁定接触评判。
- 每个动作取 9 个时刻，最终两人各 145 个可见武器样本中，实际筒身与躯干/头部三角面相交为 0；基线各有 140 个相交样本。取出动作的显隐时间调整后，前后可见样本总数略有差异。
- 288 项其他长枪姿态对照的骨骼四元数分量和武器位置差异为 0；PF89 下半身轨道、运行时下半身姿态及反复切换后的姿势恢复检查通过。
- 保存后重新打开两份 Blender 文件，每段检查起点、中点、终点，共 102 帧、每帧 10 个关节，与独立 Three.js 世界坐标比对，最大误差小于 0.0015 mm。
- 本地 Chromium WebGL 实际播放、待机/跑步/瞄准/举筒/取出预览通过，两站没有页面脚本异常。

相交检查覆盖躯干与头部的有限采样；不能据此保证所有连续时刻、所有指尖和衣物表面完全没有细微接触。手部近景与多姿态另做图检。

## 重建

需要 Blender 4.3.2、Node.js、`three@0.180.0`、`three-mesh-bvh`，以及已下载的角色与动画 Git LFS 实体文件。从仓库根目录运行：

```sh
mkdir -p work/pf89-r38/bake
git show 1fbd2fb:assets/weapons/pf89.glb > work/pf89-r38/original.glb
blender -b --python tools/blender/resize_pf89.py -- work/pf89-r38/original.glb assets/weapons/pf89.glb assets/weapons/pf89_900mm.blend assets/weapons/pf89_dimensions.json
blender -b --python tools/blender/author_pf89_paths.py -- assets/animations/pf89_r38/path_references.json work/pf89-r38/authored-paths.json assets/animations/pf89_r38/pf89_raise_guides.blend
node tools/qa/validate_pf89.mjs
node tools/qa/validate_pf89_clearance.mjs work/pf89-clearance.json
node tools/qa/export_pf89_blender.mjs work/pf89-r38/bake
blender -b --python tools/blender/bake_pf89_review.py -- work/pf89-r38/bake/diandian-poses.json.gz assets/animations/pf89_r38/diandian_pf89_900mm.blend
blender -b --python tools/blender/bake_pf89_review.py -- work/pf89-r38/bake/zhigeng-poses.json.gz assets/animations/pf89_r38/zhigeng_pf89_900mm.blend
```

基础路径的 JSON 已写入各站 PF89 的 `raise_paths`。武器重新导出后应将同一 GLB 复制到两站对应 `assets/weapons/pf89.glb`。重复导出不是部署操作。

## 后续发布

用户随后授权部署。2026-11-07，点点与知更站均已发布 R38，Sites 返回 succeeded；部署来源提交与结果见 `deployments.json`。访问权限保持原设置。仅推送了两个 Sites 专用源码仓库，diandian 的 GitHub 仓库尚未推送。上文“本地”与验证记录描述的是部署前的交付状态。

# 两人动作校准室（修订18）

此目录保存已部署的点点和知更完整网页工程，包含运行代码、角色、九款武器、原动作以及新增动画包。

从仓库根目录运行 `python -m http.server 8080`，访问：
- `/web/motion-labs/diandian-classic-motion-lab/`
- `/web/motion-labs/zhigeng-motion-lab/`

修订16包含：54式、QSZ92手枪高位戒备及行走，C96、QCQ171冲锋枪、QBU85、压缩M1897；汉阳造专用待机/行走、手腕与枪托避让；56冲原臂自然待机；点点手掌90%；手枪实际握孔校准及左臂避躯干。QCQ171横向厚度为收窄前92%。

网页运行时 `weapon-attachment.js` 和各站 `assets/weapon_attachment.json` 是此版本的完整适配实现。新增动画同时整理至 `assets/animations/motion_lab_v16/`，新增武器整理至 `assets/weapons/`。`assets/weapons/character_attachment_v16.json` 保存共享适配参数。

Godot现有 `character_attachment.json` 与组件仍保留之前版本；本次归档网页成果，没有将网页新增约束自动移植到Godot运行时。

`manifest.json` 记录完整网页文件的SHA-256，可核验与已部署版本一致。二进制模型和动画使用Git LFS存储。

## 修订17：RE4霰弹枪动作

M1897覆盖原瞄准、射击与装填；新增上下瞄准极限、独立平视及单次拉泵。两人均提供13段重定向动作，上传源、报告与重现脚本整理在 `assets/animations/re4_shotgun/` 和 `tools/blender/retarget_re4_shotgun.py`。上下源端点为−57.6648°/+56.2974°，独立平视0°；M1897泵总成与前手按源曲线同步。其他武器动作保持。完整网页已同步本次部署源。

修订18修复点点、知更持枪跑步腰部缺面和M1897右拇指反折；高分辨率角色、网页模型与网页约束同时归档，证据与重现脚本见 `assets/characters/repair_r18/README.md`。

# 两人动作校准室（修订16）

此目录保存已部署的点点和知更完整网页工程，包含运行代码、角色、九款武器、原动作以及新增动画包。

从仓库根目录运行 `python -m http.server 8080`，访问：
- `/web/motion-labs/diandian-classic-motion-lab/`
- `/web/motion-labs/zhigeng-motion-lab/`

修订16包含：54式、QSZ92手枪高位戒备及行走，C96、QCQ171冲锋枪、QBU85、压缩M1897；汉阳造专用待机/行走、手腕与枪托避让；56冲原臂自然待机；点点手掌90%；手枪实际握孔校准及左臂避躯干。QCQ171横向厚度为收窄前92%。

网页运行时 `weapon-attachment.js` 和各站 `assets/weapon_attachment.json` 是此版本的完整适配实现。新增动画同时整理至 `assets/animations/motion_lab_v16/`，新增武器整理至 `assets/weapons/`。`assets/weapons/character_attachment_v16.json` 保存共享适配参数。

Godot现有 `character_attachment.json` 与组件仍保留之前版本；本次归档网页成果，没有将网页新增约束自动移植到Godot运行时。

`manifest.json` 记录完整网页文件的SHA-256，可核验与已部署版本一致。二进制模型和动画使用Git LFS存储。

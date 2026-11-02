# 知更 · 头发、身体与动作适配

沿用已清理眼部的head2，以XYZ一致的0.125比例整体缩放适配身体，保持原始脸型与五官比例。棕色头发匹配头围并补齐后脑覆盖；原身体的旧头和皮肤颈已移除，黑高领、衣服与耳麦保留。

共68根骨骼：保留身体65根骨骼，增加3节马尾骨。头部和细睫毛随Head骨运动，接颈使用Neck/Head平滑权重。马尾随动作轻微摆动，依用户要求暂不处理马尾与身体的穿模。

GLB内嵌四段30fps动作：Idle（待机）、Walk（走路）、Run（跑步）、HeadStress（大幅转头）。待机双臂微展，避开工装裤与腿包；待机和走路处理脚底接地，跑步保留腾空。

- `zhigeng_character_animated.glb`：完整角色、骨骼、动作和内嵌贴图。
- `zhigeng_character_animated.blend`：可编辑角色源文件。
- `zhigeng_head_front.png`、`zhigeng_idle.png`、`zhigeng_walk.png`、`zhigeng_run.png`、`zhigeng_head_turn.png`：头部与动作预览。
- `source/`：此次上传的原始身体与棕色头发。
- `adaptation_report.json`、`source_manifest.json`：适配和来源记录。

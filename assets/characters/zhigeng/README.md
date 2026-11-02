# 知更 · 头发、身体与动作适配

沿用已清理眼部的head2，以XYZ一致的0.125比例整体缩放适配身体，保持原始脸型与五官比例。棕色头发匹配头围并补齐后脑覆盖；原身体的旧头和皮肤颈已移除，黑高领、衣服与耳麦保留。

共315根骨骼：身体65根、马尾3根、夏晴来源的246根面部骨骼及下颌控制骨。面部骨骼和蒙皮按知更五官重新适配，细睫毛跟随眼睑骨骼，接颈使用Neck/Head平滑权重。马尾随动作轻微摆动，依用户要求暂不处理马尾与身体的穿模。

GLB内嵌四段30fps动作：Idle（待机）、Walk（走路）、Run（跑步）、HeadStress（大幅转头）。待机双臂微展，避开工装裤与腿包；待机和走路处理脚底接地，跑步保留腾空。

- `zhigeng_character_animated.glb`：完整角色、骨骼、动作和内嵌贴图。
- `zhigeng_character_animated.blend`：可编辑角色源文件。
- `zhigeng_head_front.png`、`zhigeng_idle.png`、`zhigeng_walk.png`、`zhigeng_run.png`、`zhigeng_head_turn.png`：头部与动作预览。
- `source/`：此次上传的原始身体与棕色头发。
- `adaptation_report.json`、`source_manifest.json`：适配和来源记录。

## 面部骨骼与在线测试

在线测试：<https://zhigeng-motion-lab.expert-eagle-6942.chatgpt.site>

面部骨架沿用点点的夏晴R23迁移流程，保留原头模比例与所有顶点位置。新脸权重仅属于Head及其面部子骨骼，身体、马尾骨骼与四段动作保持。网页提供下颌微动、轻抬眉、面部重置、适配前后对照、全身/头部/脚部/左右手特写和骨骼显示。

`face_controls.json` 使用Blender姿态骨骼坐标，`face_controls_web.json` 与 `rig_info.json` 使用网页关节坐标。`zhigeng_before_face.glb` 保留上一次身体与头发适配后的68骨版本。下载版保留高分辨率贴图，网页使用2K贴图，几何、骨骼与动作相同。

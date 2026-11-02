当前为双手修订4：重建左右手连续蒙皮，统一独立指尖与手套的绑定，修正无名指关节与动作中的手指姿态。详见[双手前后对照与下载](hands_revision4_review.md)。

当前动作包包含 **11 段**。普通待机仅保留点点自己的默认 `Idle`，移除多余的 `WomanIdle`、`StandingIdle`；走路、跑步、转头、持枪与瞄准等动作保留。详见[动作包与下载](../../animations/character_motion_pack/README.md)。

# 点点经典形象 · 恢复原头模比例

本版撤销上一版头部的非等比拉伸，使用上传的 `diandian head.glb` 原始几何，以 XYZ 均为0.125的比例整体缩放。相较v5，头部宽度收回16.67%，前后深度收回5.30%，头高与位置保留；五官和脸型恢复原模型比例。

头发、246根面部骨骼与下颌控制骨同步适配新头围，接颈以平滑过渡连接原身体。沿用已经修好的手指权重、四段动作及大臂比例。

- `diandian_classic_fixed.glb`、`diandian_classic_fixed.blend`：当前完整模型与可编辑源文件，头部沿用v6比例，包含11段动作与双手修订4。
- `diandian_classic_before.glb`：上一版v5，供头部比例对照。
- `proportion_report.json`：原始几何等比还原、头发与骨骼适配记录。
- `source_head/`、`source_hair/`、`source_animations/`：上传的原始素材。

在线查看：<https://diandian-classic-motion-lab.expert-eagle-6942.chatgpt.site>

下载模型保留高分辨率贴图；网页使用2K贴图，几何、骨骼和动作相同。当前手部近景以 `hands4_*` 图片为准；其余旧近景保留作历史记录。

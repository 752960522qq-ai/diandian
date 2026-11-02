# 枪械模型

四件上传模型均保留原始外形比例、材质与 UV，按全长进行等比缩放。导出的 GLB 使用米为单位，Godot 中枪口朝 `-Z`、上方为 `+Y`，原点位于整体包围盒中心。

| 模型 | 全长 | 下载 | 预览 |
| --- | ---: | --- | --- |
| QSZ-92 | 190 mm | [qsz92.glb](qsz92.glb) | [预览](qsz92_preview.png) |
| QBZ-95 | 746 mm | [qbz95.glb](qbz95.glb) | [预览](qbz95_preview.png) |
| 56-1 | 870 mm | [type56_1.glb](type56_1.glb) | [预览](type56_1_preview.png) |
| 汉阳造 | 1250 mm | [hanyang88.glb](hanyang88.glb) | [预览](hanyang88_preview.png) |

上传的 `type56.glb` 已带有展开的金属下折式枪托，保留其形状并规范命名为 56-1。870 mm 为当前枪托展开状态的全长。

| QSZ-92 | QBZ-95 |
| --- | --- |
| ![QSZ-92](qsz92_preview.png) | ![QBZ-95](qbz95_preview.png) |
| **56-1** | **汉阳造** |
| ![56-1](type56_1_preview.png) | ![汉阳造](hanyang88_preview.png) |

`source/` 归档原始上传文件，`source/sources.json` 记录 SHA-256；`dimensions.json` 记录缩放系数、统一坐标系与最终 GLB 重新导入后的尺寸。

当前交付为可导入的独立枪械资产，角色挂枪与握持适配另行接入。角色握持时，应使用项目的挂点偏移将枪体对齐手掌，避免额外缩放改变上述实际尺寸。

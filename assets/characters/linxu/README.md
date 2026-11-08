# 林叙 · 组合模型 v1

使用用户上传的 `linxu body.glb`、`linxu head.glb.glb`、`linxu hair.glb`，按照点点的高精度头部移植规则组装。当前交付以人物组合与穿模修复为范围，表情动作暂不制作。

## 文件

- `linxu_assembled.glb`：包含身体、高精度头部、头发、贴图和312根骨骼的完整模型；无动画片段。
- `linxu_assembled.blend`：Blender 4.3.2可编辑工程，贴图已内嵌；保留身体/面部骨骼集合和几何区域标签。
- `source/` 与 `source_manifest.json`：三份用户原件及SHA-256。
- `full_front.png`、`head_front.png`、`head_side.png`、`head_back.png`、`head_turn.png`：成品与转头检查图。

## 处理方式

高精度头部仅使用0.13等比缩放及平移，保留原始脸型与贴图；保留的25,240个头部几何点与等比变换后的原件位置完全一致。原身体的65根骨骼保持原绑定矩阵，替换旧头部与旧发型，保留衣领。头颈采用共享顶点的过渡网格和采样肤色贴图，98个接缝检查点没有开边或位置偏差。

从点点迁移246根XQ面部骨骼及1根下颌控制骨（改名为`LX_Jaw_CTRL`），按林叙头模表面重新定位并迁移基础蒙皮；总计312根骨骼。按照用户后续要求，表情制作和表情变形验收留待下一阶段，本交付保持中立脸，不包含表情动画或口型动画。

头发贴合新头围，补充贴合头皮的深棕色发根层，修复头顶、后脑露出头皮的位置。只在发生接触的发束根部细分并裁去与头模交叠的部分，保留外围发束；耳部发根层另作裁让。头发和发根全部绑定到`mixamorig:Head`，随头部整体转动。

原生单位沿用身体约1米的资产尺度，便于对接现有模型流程。接入游戏时按目标身高对整个人物等比缩放，避免单独拉伸头部。

## 验证范围

`validation.json` 使用 Three.js 和 three-mesh-bvh，对最终GLB蒙皮后的真实三角面做独立相交检查：中立、左右转头35°、抬头15°、低头15°。头部/发束、头部/发根层、身体衣领/头发、身体衣领/头部四组在这五种姿态中均为0相交。所有蒙皮点有权重、权重归一化、每点最多4个骨骼影响，无非有限坐标。

`assembly_validation.json` 验证接颈拓扑闭合、原始脸型等比保留、身体骨骼未改变及无动画。该检查范围不包含尚未制作的表情，也不代表对未来任意极端动作的保证。

## 复现

从仓库根目录依次运行（Blender 4.3.2、Node.js、three 0.180、three-mesh-bvh 0.9.18）：

```sh
blender -b -t 6 --python tools/blender/assemble_linxu.py
blender -b -t 6 --python tools/blender/refine_linxu_hair.py
blender -b -t 4 --python tools/blender/validate_linxu_assembly.py
node tools/qa/validate_linxu.mjs
blender -b -t 6 --python tools/blender/preview_linxu.py
```

本轮模型文件保存在工作区，尚未接入网站或推送GitHub。

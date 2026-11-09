# 林叙 V4：短颈模型与装备动作

目录名沿用 V3，避免破坏既有资源路径。当前可导入文件：

- `character.glb`：短颈后的完整人物模型。原上传模型保留在 `../linxu_motion/character.glb`。
- `motions.glb`：V3 基础动作，未改。
- `equipped_motions.glb`：按新模型与本次握持参数重新烘焙的31段装备动作。
- `equipped_weapon_transforms.json`：各动作枪根节点和泵件的配套变换。
- `fitting_v4/attachment_v4_authored.json`：此次最终持枪参数源文件。

请将新模型和新装备动作配套使用，旧装备动作可能恢复旧头部位置。

脸型、头部大小、身体比例、UV、材质、贴图、骨骼命名和蒙皮权重保留；短颈的具体几何修改见 `NECK.md`。没有把一切手部问题归因于权重，也没有无依据地整体重刷手指权重。

最终检验范围、残余与预览以 `../../../web/motion-labs/verification_linxu_v4/README.md` 为准。旧 `SHOULDERS.md` 及 V3 报告作为历史记录保留，不代表本次全项目验收。

## 重建

在仓库根目录运行 `node tools/characters/rebuild_linxu_v4.mjs`。需要 Python 3、Node.js，以及 QA 所用的 `three@0.180.0` 和 `three-mesh-bvh@0.9.8` 模块（例如在测试副本根目录运行 `npm install --no-save --package-lock=false three@0.180.0 three-mesh-bvh@0.9.8`）。Blender 仅用于离线预览。

重建从已审阅的参数文件产生网页配置和装备动画，不重新执行启发式优化。`fit_linxu_*` / `relax_linxu_*` 是另行修改握姿的作者工具，运行会改写参数，之后必须重新做蒙皮碰撞、动作和多角度视觉检查。

本包不包含 Godot 场景/控制器接入，不代表手机性能测试或正式游戏运行验收通过。

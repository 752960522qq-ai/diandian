# R44 抵肩 QJZ89

两名角色继续采用 PF89 的 `RocketIdle`、`RocketAimLevel` 身体动作。枪身 1640 mm，枪托贴合右肩，右手握把，左手搭在枪托上方；支架悬空，不做接地或携行。

各角色目录包含两段 60 Hz 动画 `uploaded_motions.glb`、握点和人物比例 `authoring.json`、可编辑 Blender 场景 `motions.blend`。点点源手掌为 90%，动画和网页不再重复缩放。

网页实时计算肩部位置；Godot 在骨骼更新后同步枪托；Blender 使用右肩位置约束。三处使用同一枪托点和肩部偏移。相较 R43，机枪位置允许随呼吸移动以维持抵肩。

生成：`node tools/gltf/bake_emplacements_r44.mjs`，再运行 `blender -b --python tools/blender/save_emplacements_r44.py`。验证见 [R44 记录](../../../web/motion-labs/verification_r44/README.md)。

# R44：把手掌缩小 10% 写入源 GLB

当前源模型 `diandian_classic_fixed.glb` 的左右手节点与模型自身 11 段动作已内嵌 90% 缩放，独立导入和播放也生效。网页当前模型和上一版对照模型同步处理。

使用骨骼缩放保留原网格、贴图、蒙皮权重和逆绑定矩阵；不会额外缩短前臂。网页运行时缩放乘数改为 1，仅按实际手掌尺寸计算握点。`asset.extras.preview_normalization` 保存改动前的网页定位基准，避免因手掌包围盒变化引起人物整体平移。

源文件和最终 SHA-256 见 `hand_scale_r44.json`。复现脚本是 `tools/gltf/bake_diandian_hands_r44.py` 与 `tools/gltf/preserve_character_origin_r44.mjs`。两者识别已处理的 R44 文件，避免重复缩小。

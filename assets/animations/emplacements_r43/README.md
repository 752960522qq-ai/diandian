# QJZ89 固定机枪站立操作（R43）

使用用户上传的 `QJZ89_2号主体_左弹箱修正版.glb`，原件为 `assets/weapons/source/qjz89_source.glb`。规范模型 `assets/weapons/qjz89.glb` 按用户要求把枪口至枪托的**枪身长度校准为 1640 mm**；尺寸计算排除后支架的伸出量。左弹箱、枪身及贴图保留。后支架绕上端连接处向人物右外侧展开 42°，避开站立角色的大腿；机枪仍悬空，不做支架接地或地形求解。

点点、知更各有两段动作：

| 动作 | 参考 | 行为 |
| --- | --- | --- |
| QJZ89Idle | RocketIdle，原 PF89 待机 | 站立循环，固定机枪，右手握把，左手位于枪托上方 |
| QJZ89Aim | RocketAimLevel，原 PF89 平视瞄准 | 站立瞄准循环，使用相同固定握点 |

网页保留原火箭筒身体动作，在每帧把两侧手臂解算到固定接触点。机枪不随人物呼吸或手部摆动改变位置。新模式不提供持机枪走路、跑步或携行操作。其他武器的配置、动作和尺寸未改。

各角色子目录包含 `uploaded_motions.glb`（烘焙后的两段动作）、`authoring.json`（枪位、握点、人物缩放与来源）、`motions.blend`（完整人物、机枪、握点标记及两段可编辑动作）。动画按 60 Hz 烘焙，点点保留 68 条轨道，知更保留 71 条轨道；包含双手缩放和知更马尾的必要轨道。

Godot 角色预览读取同一批烘焙动作。仅在操作 QJZ89 时使用网页校准的人物比例；切回原动作恢复原预览比例。固定物件组件为 `godot/scripts/scene_prop_preview.gd`。主游戏的携行武器表未添加固定机枪的可携行条目。

构建脚本见 `tools/gltf/prepare_emplacements_r43.mjs`、`tools/gltf/bake_emplacements_r43.mjs`、`tools/blender/save_emplacements_r43.py`。结果和截图见 [验证记录](../../../web/motion-labs/verification_r43/README.md)。

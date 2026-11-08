# R48 抵抗军模型与动作

源仓库提交：6c64b29576ce0da439c09be1b1c4954e3c4ba518。

每个角色目录：
- `character.glb`：已修复头颈蒙皮的原角色，R48 保持网格、贴图、骨骼长度与权重。
- `motions.glb`：33段原动作包，仅空手 Idle 的锁骨和上臂通道修改。持枪基本动作仍需装备约束。
- `equipped_motions.glb`：本轮新增的31段最终装备姿态烘焙包，包含五种枪的六类动作及97式拉泵。挂接到同名骨架使用。
- `equipped_weapon_transforms.json`：每段动作对应枪体及泵柄变换；枪械GLB在站点`assets/weapons/`中。

网页实时约束与烘焙导入合同不同，详见 `EQUIPPED_MOTIONS.md`。这不等于已接入Godot正式角色控制器。

空手待机肩部约提高15mm（按网页1.75m身高）；保留原动作节奏、全身其他通道和另32段动作。报告见 `idle-report.json`、`idle-validation.json`。

验证和前后对比在 `web/motion-labs/verification_r48/`。本包未推送或发布，线上仍是旧版本。

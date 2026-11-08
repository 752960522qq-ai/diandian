# 59D 无人坦克（R43）

来源为用户上传的 `59d_rigged_v3.glb`，原件保留在 `source/`。按用户指定的**总长度 9200 mm**，以静止姿态的完整模型（含炮管）等比校准；保留上传模型的横纵比例、材质、蒙皮和关节。项目轴向为上 +Y、前 -Z，静止履带最低点落在 Y=0。

`type59d.glb` 是网页与 Godot 共用的模型，`type59d.blend` 是 Blender 4.3.2 可编辑源场景。`type59d_report.json` 记录来源、缩放和轴向处理，`source_manifest.json` 记录上传文件 SHA-256。

模型包含 215 根骨骼和六段原有动作：`Gun_Recoil`、`MG_Aim_Demo`、`Track_L_Cycle`、`Track_R_Cycle`、`Turret_Aim_Demo`、`Wheels_Forward_Loop`。预览提供无人待机、炮塔瞄准、主炮后坐、车载机枪瞄准、履带与车轮五个入口；最后一项组合左右履带和车轮的原动画。没有驾驶员、驾驶姿势或玩家驾驶入口。

R44 已将网页测试拆为独立的 [59D 无人坦克测试场](https://type59d-motion-lab.expert-eagle-6942.chatgpt.site)。点点、知更站仅保留跳转入口，不再携带或请求坦克模型。独立源码归档在 `web/motion-labs/type59d-motion-lab/`；Godot 两个角色预览场景仍提供坦克入口。物件登记在 `godot/data/scene_objects.json`，当前交付范围是模型和机械动作预览，未增加关卡战斗 AI 或伤害数值。

复现：

```sh
node tools/gltf/prepare_emplacements_r44.mjs
```

# v6 自然动作适配输出

本目录为独立衍生动画，不覆盖原人物 GLB 或原动作包。

- `equipped_motions.glb`：与原人物同骨架的装备动作轨道。
- `weapon_transforms.json`：逐帧枪根、泵节点变换、输入 SHA-256、动作来源和限制。
- `chest_skinning.json`：原站已有的低持胸部 relief 权重。仅本四枪范围中的 M870 RifleIdle/RifleWalk 启用，其他情况恢复原权重。不是新的角色蒙皮替换。

## 动作数量与来源

每人导出 42 条：27 个装备动作组合，加 15 个霰弹枪俯仰采样。27 = 三把手枪各 6 类动作 + M870 9 类动作。15 = 瞄准、开火、拉泵各取 -1、-0.5、0、0.5、1 五档；0 档与已有平视动作重叠，不是新增 15 个原创动作。

手枪待机/步行/瞄准/射击继承原 92/54 动作；64 独立绑定并继承 54 姿态。跑步使用未改轨道、未重定时的原 RifleRun（0.6666666865 秒），采用原 QSZ92 的低持挂载校正。换弹使用原通用 Reloading（3.2999999523 秒），释放左手；不是专用手枪装弹片段，没有新弹匣或弹壳道具动画。

M870 使用原 M97 的 HanyangIdle2、HanyangWalk2、RifleRun、ShotgunAim、ShotgunFire、ShotgunPump、ShotgunReload。原身体/右臂/腕指时序保留，仅支撑掌下移 30 mm，泵行程按原曲线缩至 75 mm。枪长 1 m，局部枪身压薄由模型资产提供，枪根 scale 为 1。

## 复现

从项目根运行 `node tools/weapon_v6_two/bake.mjs` 与 `node tools/weapon_v6_two/verify_bake.mjs`。production 不需要 work、v5 快照或旧 compact-pistol-motion.js。

可选原版对照通过 `WEAPON_V6_BASELINE_DIR` 指向原项目根；默认项目同级 character_adapt_baseline。该原版目录只用于对照，不是 production 依赖。

## 验证边界

实际骨架/蒙皮与多相位渲染已检查。原 app 状态函数的无界面测试覆盖切枪、无装备、暂停、反复 seek、单次末帧与 Fire→Pump 衔接。浏览器启动被执行环境阻止，因此不声称浏览器/WebGL 实机测试通过。Godot 完整玩法控制器集成不在本次验证范围。

# R42：倒退手腿避让与原瞄准姿势后坐

点点与知更分别保留 R41 的八段动作，只修订 `WalkingBackwards` 和 `PistolShooting`。原始八个 FBX 与 R41 动作库继续保存在 `../motion_lab_r41/`；未接入 `Pistol_Handgun Locomotion Pack.zip`。

倒退行走仅修改两条上臂旋转轨道。点点左臂外展 5°、右臂 11°；知更左臂 5°、右臂 10°。外展方向按每帧躯干坐标计算，保留腿部、骨盆、原摆臂节奏及循环收合。

手枪开火改用各角色原 `PistolIdle` 的第 0 秒作为瞄准基准，对应网页“手枪瞄准” `PistolAimingIdle` 的实际映射。开火仅改变双侧上臂与前臂旋转：0.10 秒开始快速上扬，0.18 秒达到峰值，0.65 秒平滑回到瞄准，单段仍为 1.167 秒。旋转总幅度 10.5°，按上臂 35%、前臂 65% 分配；身体、下肢和基础握姿保持原瞄准。沿用 QSZ92/54 式的枪位、支撑手与扣扳机适配。知更额外保留原瞄准的马尾根部旋转。

每个角色子目录包含：

- `uploaded_motions.glb`：动画与参考节点，没有重复人物网格或贴图。每段 66 条轨道，知更射击另有 1 条原瞄准马尾轨道。
- `motions.blend`：Blender 4.3.2 中可编辑的原角色与八段动作，贴图已打包。默认显示倒退动作；其他 NLA 轨道静音，在 Action Editor 选择动作编辑。
- `refinement.json`、`blender_report.json`：修订参数、来源与 Blender 导入结果。

重建（从仓库根目录，先获取 Git LFS 资产；Node 需要 three@0.180.0）：

```sh
node tools/gltf/refine_motion_r42.mjs
blender -b --python tools/blender/save_motion_r42.py
```

GLB 是本次运行时与 Blender 编辑文件的共同动画来源。Blender 构建脚本把它与原人物网格、骨架合并后导入，保证使用相同曲线。网页两站与 Godot 角色预览均加载本版。

检查方法、结果和截图见 [R42 验证记录](../../../web/motion-labs/verification_r42/README.md)。

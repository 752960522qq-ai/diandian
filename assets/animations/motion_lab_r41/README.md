# R41：八段独立上传动作

本轮按用户最后确认的范围，只接入八个单独上传的 FBX。`Pistol_Handgun Locomotion Pack.zip` 整包排除，包括其中的 X Bot 参考模型。点点和知更各提供一套独立动画库和可编辑 Blender 文件。

当前交付保留在本地，基于 `eb6133bbb89884863923f7b50844e4169e876285`；未提交、未推送 GitHub、未部署网站。

| 上传文件 | 动作 ID | 时长 | 播放方式 |
| --- | --- | ---: | --- |
| Dying1.fbx | Dying | 4.333 秒 | 单次，保留倒地位移，结束保持 |
| Flying Back Death.fbx | FlyingBackDeath | 3.033 秒 | 单次，保留后飞位移，结束保持 |
| pistol Shooting.fbx | PistolShooting | 1.167 秒 | 单次射击，自动使用选中的手枪 |
| 二郎腿Sitting Talking.fbx | SittingTalking | 44.967 秒 | 完整交谈，单次播放 |
| 二郎腿Sitting.fbx | SittingCrossLegged | 9.567 秒 | 坐姿循环 |
| Climbing Ladder.fbx | ClimbingLadder | 0.767 秒 | 原地攀爬循环 |
| Braced Hang To Crouch.fbx | HangToCrouch | 1.133 秒 | 单次翻越，保留向上与向前位移 |
| Walking Backwards.fbx | WalkingBackwards | 0.967 秒 | 原地倒退行走循环 |

`source/` 保留这八个原始文件，`sources.json` 保存 SHA-256，`catalog.json` 保存动作名称与播放策略。两个角色子目录均包含 `uploaded_motions.glb`、`motions.blend`、`retarget_report.json`。GLB 只包含动画和参考节点，不复制人物网格、贴图或蒙皮。

以 30 fps 重定向 65 根身体/手指骨骼，动画库每段含 65 条旋转轨道和一条骨盆位置轨道。保留原角色骨架比例、表情绑定、服装、头发和已有动作。坐姿的骨盆高度相对源静止骨架保留；死亡动作按实际变形后的身体和头发顶点修正落地高度。循环片段仅在末端 0.12 秒内收合首尾；倒退行走移除线性水平移动，攀爬循环移除线性三维移动。源位移仍保存在 FBX 和报告中，供后续游戏控制器使用。

网页两站已加载新动画库，提供“本次新增 / 原有动作 / 全部动作”分类；新动作不受 PF89 专用列表遮挡。手枪射击使用已有 QSZ92/54 式握持校准；其他七个动作隐藏武器。坐姿显示参照凳，翻越显示参照平台，镜头覆盖动作全程范围。参照物仅用于动作观察，不是游戏碰撞或交互逻辑。

Godot 的 `diandian_preview.tscn`、`zhigeng_preview.tscn` 通过 `uploaded_motion_library.gd` 加载同一批新动作，重映射到已有 Skeleton3D，并补回 Godot 导入器省略的静态骨骼轨道。新动作有中文按钮、循环/单次设置和全程镜头范围。手枪射击加入现有武器附件的可见性与手指处理。

复现需要 Blender 4.3（自带 numpy）：

```sh
blender -b --python tools/blender/import_motion_r41.py
```

从仓库根目录启动本地网页：

```sh
python -m http.server 8086 --bind 127.0.0.1
```

访问 `/web/motion-labs/diandian-classic-motion-lab/` 或 `/web/motion-labs/zhigeng-motion-lab/`。Godot 直接打开对应角色预览场景。首次检出需获取角色和武器的 Git LFS 文件。

验证与截图见 [R41 验证记录](../../../web/motion-labs/verification_r41/README.md)。

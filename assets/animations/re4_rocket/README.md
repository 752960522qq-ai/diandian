# PF89 火箭筒上半身适配 · R37

点点、知更分别使用自己的骨架和握持参数。输入是用户提供的里昂动作分包
`里昂_04_地雷投射器_火箭筒_投掷物30个.zip` 中的 13 个 `w07` FBX，以及 `PF89.glb`。
源 FBX 原样保存在 `source/`，每个文件的 SHA-256、帧范围和原动作名记录在角色目录的 `retarget_report.json`。

## 动作

| 源文件 | 上半身动作 | 下半身基础动作 |
| --- | --- | --- |
| w07_000 | 持筒待机 | RifleIdle |
| w07_001 | 持筒行走 | RifleWalk |
| w07_002 | 持筒跑步 | RifleRun |
| w07_006、008 | 上仰、下俯瞄准 | RifleAimingIdle |
| w07_007、009 | 上仰、下俯发射 | FiringRifle |
| w07_010、011 | 举筒向上、向下 | RifleIdle |
| w07_012、013 | 持筒转上瞄、下瞄 | RifleIdle |
| w07_014 | 丢弃火箭筒 | RifleIdle |
| w07_015 | 取出火箭筒 | RifleIdle |

另从上下端点生成平视瞄准、平视发射、举筒至平视、持筒转平视，共 17 个组合动作。
平视瞄准通过源手部方向求出水平混合权重；发射过程保留源动作的明显抬筒及回落。
这 13 个源动作没有换弹动作，因此 PF89 模式不显示步枪换弹。
30 fps 是提供的 FBX 时间基准，未声称验证了原游戏播放速度或事件时刻。

## 接入方式

- `diandian/re4_rocket_upper.glb`、`zhigeng/re4_rocket_upper.glb`：各自骨架的 17 个上半身层。
  只包含脊柱、肩、颈、头、手臂和手指的旋转通道；不包含网格、骨盆、根骨或腿部动画通道。
- `web/motion-labs/*/rocket-motion.js`：加载上半身层后生成 `Rocket*` 最终组合动作。
  使用相应普通步枪的骨盆、根骨和腿部轨道，关键帧时间及值原样复制。
  行走、跑步上半身跟随原步枪步频；一次性动作超过下半身源时长时保持其末帧。
- 上半身 GLB 的 `animation.extras.reference_hips` 是源骨盆方向参考元数据。
  组合时只在脊柱处抵消下半身骨盆方向差，骨盆本身仍由普通步枪动作驱动。
  **这些 GLB 是供组合器读取的上半身层，不是可独立替换整个人物的模型或完整游戏控制器。**
- `assets/weapons/character_attachment_v37.json` 保存两人的 PF89 握持参数；网站分别使用自身配置。
  右手贴合发射握把，左手托筒；持筒姿势补偿 PF89 与原武器握把位置的差异。
  取出、举筒、丢弃采用平滑支撑手权重，避免左手始终锁死。丢弃动作在 0.34 秒隐藏筒身；
  这是可直接拖动进度条的预览规则，并非原游戏的抛掷物理或已验证的发射事件。
- `assets/weapons/pf89.glb` 仅增加坐标根节点（前向 -Z、向上 +Y），原始几何、材质与纹理二进制保持不变。
- 两个网站默认选择 PF89；其余武器原配置保持不变。此次接入范围为角色资源和动作预览站点。

## 重建与验证

在 Blender 4.3 的 Python / bpy 环境运行：

```sh
python tools/blender/retarget_re4_rocket.py --source-dir assets/animations/re4_rocket/source --sites-root FULL_ASSET_ROOT --output-dir assets/animations/re4_rocket
python tools/gltf/normalize_pf89.py ORIGINAL_PF89.glb assets/weapons/pf89.glb
```

`FULL_ASSET_ROOT` 包含 `diandian/dist/assets/diandian_fixed.glb` 和
`zhigeng/dist/assets/zhigeng_fixed.glb`。必须使用实际 GLB，不能使用 Git LFS 指针文件。

CPU 验证器使用 Node.js 与 `three@0.180.0`：

```sh
node tools/qa/validate_pf89.mjs FULL_ASSET_ROOT
```

每人检查 17 个动作、527 个采样时刻，校验下半身轨道、运行时骨骼、握持接触和反复切换后的姿势恢复。
`validation.json` 记录本次结果，`pose-preview.jpg` 为实际运行时骨骼姿势烘焙后用 Blender 渲染的关键帧。
点点锁定握持时左手最大误差约 3.6 mm，知更小于 0.001 mm；故意松手的过渡帧不纳入锁定握持误差。
两人的下半身差异计数和切换后姿势漂移均为零。

本次云预览浏览器报告 WebGL 被禁用，未完成浏览器内三维播放验证。
已完成 CPU Three.js 动作及握持检查、关键帧渲染、JS/Python 语法检查及旧武器配置一致性检查。

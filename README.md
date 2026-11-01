# 点点滴滴 · 刺瑰行动

Godot 4.6 第三人称动作射击与线性叙事框架。基于《点点滴滴》剧情方案：操控林叙，与点点协作，在架空城市中推进章节。

## 运行

1. 使用 Godot 4.6 导入本目录中的 `project.godot`。
2. 打开项目并按 F6/F5 运行主场景，或在命令行执行 `godot --path .`。
3. 主菜单选择“开始新的旅程”或“章节试演”。

场景、人物和武器目前采用几何模型占位。12 章是复用城市通道的短流程原型，正式人物、动画、配音、完整关卡、无人机和 Boss 演出尚待制作。

## 操作

WASD 移动，鼠标观察，右键瞄准，左键射击，Shift 冲刺，Ctrl 蹲下，空格跳跃；R 换弹，1/2 切换主副武器，E 交互或使用补给箱，Q 请求点点配合，Tab 打开军械库，Esc 暂停，F5 保存检查点。

枪械共 18 把，分为手枪、步枪、狙击枪、冲锋枪、霰弹枪和重型武器。数据保存在 `godot/data/weapons.json`，章节和 53 个任务目标保存在 `godot/data/chapters.json`。枪械数值用于游戏平衡。主副槽、独立弹药、换弹、弹丸散射和榴弹飞行爆炸已接入原型。

点点可跟随、在玩家命令下压制敌机，并响应章节中的协作任务；剧情阶段控制状态和后期交互。普通敌机攻击玩家，击杀任务按目标数量推进。检查点保存在 Godot 的 `user://checkpoint.json`，读取时重建当前任务段及其敌人、生命与弹药。

## 项目结构

- `project.godot`：项目配置；主场景为 `godot/scenes/main.tscn`。
- `godot/scripts/game.gd`：游戏状态、任务、武器、界面及场景组合。
- `godot/scripts/player.gd`、`enemy.gd`：第三人称角色与敌机。
- `godot/scripts/projectile.gd`：榴弹飞行和范围伤害。
- `godot/data/`：原 Unity 工程迁移的章节和武器数据。
- `Docs/Design/`：完整剧情方案。
- `assets/city/chapter03/`：城市美术资产，47款未标记楼体替换126处，每款最多3处，排除转角楼；[场景、预览与用量说明](assets/city/chapter03/README_城市升级.md)。
- `assets/characters/diandian_classic/`：点点经典形象的面部绑定与动作适配资产，含312骨骼模型、待机/走路/跑步和修复前后对照；[交付说明](assets/characters/diandian_classic/README_点点绑定修复.md)。动作测试站：<https://diandian-classic-motion-lab.expert-eagle-6942.chatgpt.site>。

原 Unity 版本保留在 Git 历史的 `fb04302` 提交中。中文字体为 Noto Sans SC 400 静态子集，许可见 `godot/assets/OFL.txt`。

本框架已用 Godot 4.6.3 无界面模式启动，并检查章节进入、敌人受击、武器切换、保存与读取；正式美术、完整剧情演出和平台导出仍需后续制作。

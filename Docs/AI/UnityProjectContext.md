# Unity project context

分析日期：2026-11-01。首次创建的工程，起始仓库没有已有 Unity 内容或提交。

## 已确认

- 项目：`/workspace/diandian`，Unity 6000.0.62f1；内置渲染管线。
- Input System 1.11.2；面向桌面键鼠、单人本地流程。
- 入口：`Assets/Game/Scenes/Boot.unity` → `GameBootstrap` → `GameSession`。
- Runtime 程序集 `Diandian.Runtime` 引用 `Unity.InputSystem`；Editor 程序集 `Diandian.Editor` 仅在编辑器运行。
- `GameSession` 明确持有玩家、同伴、武器、任务和场景；`WorldBuilder` 负责原型世界和对象构造；UI 读取状态并调用明确动作。
- 武器与章节是 ScriptableObject；弹药、生命、当前任务进度是运行时状态。任务事件更新信标并保存检查点。
- 章节数组按 Order 排序。任务的 Id 是上报入口；消灭目标使用 `hostile`。目标段重试重建场景。
- 点点的战术状态与永久剧情变化分离。常规敌人只攻击玩家，固定剧情损伤由章节阶段控制。序章/第一章接入前不展示点点身体；尾声不展示旧点点。
- 枪械18把，按当前用户要求覆盖六类；剧情原方案的少枪限制已由本次用户要求覆盖。

## 约定

namespace 为 `Diandian`；每个挂载组件或 ScriptableObject 各用同名脚本；公开组件 API 按职责命名。输入集中在 GameSession，角色消费输入值；初始化通过 Init/Initialize 明确完成。

`.meta` 使用资产相对路径的 MD5 生成初始 GUID，并随资产交付，后续应保留。资源路径与脚本引用已经写入工程。运行时代码不依赖 Editor。

不添加无必要防御链、捕获后吞异常、自动修复层或重复检查代码；用户要求直接实现，控制验证次数。

## 边界与后续

12章53目标目前是同一几何通道的短流程。完整关卡、角色动画、配音、无人机操控与完整Boss演出待制作。无需用原型时长代替剧情方案的340分钟设计目标。

本环境现已安装 Unity Editor 6000.0.62f1，未连接 Unity MCP。工程首次导入及 Runtime/Editor 程序集编译均已完成。进入 Play Mode 时被未激活的 Unity Editor 许可证拦住，尚无游戏运行结果。Input System 1.11.2 从 Unity 官方 GitHub 源码同版本打包为 Packages 下的本地 tgz，保留原包内容与许可证。

主要依据：ProjectSettings、Packages/manifest.json、Boot.unity、Scripts/Core、Actors、Combat、Narrative、World、Presentation，以及 Docs/Design 下的原方案。

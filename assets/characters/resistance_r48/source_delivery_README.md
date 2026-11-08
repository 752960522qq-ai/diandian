# 抵抗军 R48 修复交付包

本包取自 diandian 仓库 main 的 6c64b29576ce0da439c09be1b1c4954e3c4ba518，并完成两位抵抗军的持枪双手及空手待机肩部修改。

## 直接看效果
安装了 Python 3 后，在解压目录执行：

    python start_preview.py

会在本机打开抵抗军动作站。网站、模型和枪械资源全部包含在包中，无需联网。不要直接双击 index.html。

## 资产
- `assets/characters/resistance_r48/military/`：军装款。
- `assets/characters/resistance_r48/vest/`：背心款。
- 每人含 character.glb、原基础动作包 motions.glb、31段最终装备动作 equipped_motions.glb、枪体/泵柄逐帧变换 equipped_weapon_transforms.json。
- 装备动作导入说明：assets/characters/resistance_r48/EQUIPPED_MOTIONS.md。
- 网站完整源码：web/motion-labs/resistance-motion-lab/。
- 前后图与验证：web/motion-labs/verification_r48/。

## 放回仓库
先备份当前工作区，或建立自己的分支，再把本包 web、assets、tools 对应目录复制到仓库同名位置。这里是文件替换交付，不是完整仓库；重新运行构建脚本还需要原仓库的点点参考资产及原验证工具。网站直接运行不需要这些重建输入。

没有推送GitHub、没有创建PR、没有更新线上网站，也没有自动接入Godot角色控制器。

## 已做与限制
右掌、左掌、手指曲线和左手指根位置按点点对应武器/动作重定向；仅空手Idle抬肩；军装QCQ171奔跑另修实际虎口接触。5246帧组合检查、左手指根/可达性检查、局部真实皮肤接触检查、Blender实际模型前后渲染、烘焙重新导入和重复生成一致性已通过。

当前环境阻止Chromium启动，因此本轮没有浏览器UI/手机实测；不是全身每个三角面在所有连续时刻的零穿模保证。完整边界和复现步骤在验证README中。

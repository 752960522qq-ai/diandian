# R41 本地动作接入验证

只接入用户单独上传的八个 FBX；按照后续指示排除整个 Pistol/Handgun Locomotion Pack。两名角色各八段，保留原有 PF89 R40 与其他武器动作。当前未提交、未推送、未部署。

- `runtime.json`：两人各 1,988 个 30 Hz 姿态样本，绑定、有限数值、武器显示、首尾与切换复位检查通过；三个循环的首尾误差为 0，动作切换无累计漂移。
- `ground.json`：死亡与后飞死亡四组、每组 21 个时刻，检查网页实际蒙皮全部顶点；最低点均在地面上方。Blender 的角色报告另包含四组共 446 个原始帧的落地修正记录。
- `regression.json`：与 `eb6133b` 比较，其他十款武器合计 1,088 个原有姿态样本一致，骨骼、武器、配置及原模型/动作资产无差异。
- `pf89.json`：PF89 每人 17 个动作、527 个姿态样本，原下半身轨道、握持及切换复位检查通过。
- `browser.json`：本地 Chromium 实际点击八个新动作、拖动时间线、单次播放结束及重播、切换 PF89 和手枪；两站均检查 390 px 窄屏布局，无脚本异常或动画绑定警告。知更开启马尾物理的复核记录见 `browser-zhigeng.json`。
- `godot.txt`：Godot 4.6.3 加载两个正式角色预览场景，检查八段动作各 66 条目标骨骼轨道、循环策略、武器显示及每段五个姿态。
- `manifest.json`：原始 FBX、动画库、Blender 文件和元数据的 SHA-256，以及本地交付状态。

截图使用网页的实际角色与运行时代码，包括坐姿、攀爬、翻越、死亡、手枪射击和手机布局。坐姿参照凳与翻越参照平台仅用于预览。攀爬和倒退行走采用原地循环；本轮没有新增游戏输入、梯子碰撞或翻越判定。

验证覆盖导入、采样播放和上述界面操作；不代表任意动作混合、所有连续时刻或服装/马尾之间的全面碰撞验证。

可复跑：

```sh
node tools/qa/validate_uploaded_motions.mjs
node tools/qa/validate_uploaded_ground.mjs
node tools/qa/validate_non_pf89_regression.mjs eb6133b
node tools/qa/validate_pf89.mjs
godot --headless --path . --script tools/qa/validate_uploaded_motions.gd
# 另一个终端先启动本地 8086 静态服务器
node tools/qa/browser_uploaded_motions.mjs
```

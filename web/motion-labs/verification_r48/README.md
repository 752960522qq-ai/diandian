# R48 抵抗军握姿与空手待机

基线：`752960522qq-ai/diandian` 的 `main`，提交 `6c64b29576ce0da439c09be1b1c4954e3c4ba518`（2026-11-08）。本包未推送 GitHub，也未覆盖线上站点。

## 修改

- 两位抵抗军、五种枪：QBZ95、56-1、QBU85、97式 Hawk、QCQ171。
- 右掌、左掌和全部指节，按点点站点相同武器/动作的实际最终姿态重定向，替代 R47 的统一掌向和猜测握指。同时对齐点点实际左手中指指根位置，避免将虎口误作指根挂点而虚握。保留各枪位置、尺寸和原动作；取消额外把食指/拇指拉向固定点的修正。
- 军装款 QCQ171 奔跑单独校准变形后的虎口接触点，保持枪体及其他动作不变；121个采样点的该处实际皮肤射线与枪把表面间隙约1.5mm，无穿入或漏检。
- 保留射击和换弹的指节变化。每个动作采用 30 Hz 基础采样，40 条非线性曲线细化至 60 Hz，再进行四元数关键帧压缩；60 Hz 验证点的手掌误差至多 0.232°、指节误差至多 0.250°。换弹左手仍离枪执行原动作。
- **空手 Idle** 锁骨抬升 8°，保留上臂的世界方向，网站身高 1.75 m 下肩关节提高约 15 mm。另 32 个动作和 Idle 其他通道原样保留。不是持枪待机肩部修改。
- 新增可复用的装备动作烘焙包：每人 31 段，配套枪体及泵柄变换。此包未自动接入 Godot 控制器。

## 已验证

- 5246 帧全部角色/装备/动作组合，双手锚点误差 <3 mm，切换往返无漂移，无无穷/非数值。注意锚点精度不是实际手套表面零穿插证明。
- 左手实际中指指根与点点对应位置的最大采样误差0.282mm，未发现超出手臂可达范围。
- 空手 Idle 1002 帧检查，未改无关通道，连续性通过。
- 烘焙包重新读取，关键帧分量误差 <6.6e-7；两次运行输出哈希一致。最差关键帧中点骨骼位置差小于 2 mm 原生坐标，约 3.5 mm 网站尺寸，详见 `assets/characters/resistance_r48/equipped-bake-report.json`。
- Blender 导入实际运行时姿态 GLB，检查两名人物、五枪瞄准及重点携枪姿态；图中 reference 是点点，before 为 R47，after 为 R48。
- JavaScript 语法检查与 `git diff --check` 通过。

## 验证边界

当前环境的 Chromium 启动因 `socket() Operation not permitted` 失败，因此没有宣称完成本轮浏览器 UI / 手机布局实测。页面仍沿用原有交互，仅替换资源、缓存版本和握姿取样逻辑；实际效果通过同一运行时骨骼计算结果的 Blender 渲染检查。

手套、手指与枪体的逐三角面全动作碰撞没有穷尽验证。R47 的表面射线测试使用随拇指变形的虎口作为固定掌心锚点，也可能打中别的手部表面，不能作为本轮自然度或零穿插证明。相关探索测试保存在 `exploratory/`，不作为通过项。军装款 QCQ171 奔跑已单独修复已确认的虎口穿入，见 `qcq171-run-contact-validation.json`；其他未穷尽检查的近景仍可能有手套与枪体小幅交叠，烘焙插值也有上述毫米级误差。

## 复现

需要 Node.js 与 `three@0.180.0`。从仓库根目录：

```sh
node tools/gltf/lift_resistance_idle_r48.mjs
node tools/characters/calibrate_resistance_weapons_r48.mjs
# 校准输出先写入 work/r48/generated_weapon_attachment.json，审阅后复制至站点 assets/weapon_attachment.json
node tools/characters/fix_resistance_qcq171_run_contact_r48.mjs
node tools/qa/validate_resistance_qcq171_run_r48.mjs
node tools/qa/validate_resistance_r48.mjs
node tools/qa/validate_resistance_reference_grip_r48.mjs
node tools/qa/validate_resistance_idle_r48.mjs
node tools/gltf/bake_resistance_grips_r48.mjs
```

网站：`python -m http.server 8080`，打开 `http://localhost:8080/web/motion-labs/resistance-motion-lab/`。不要直接双击 HTML，浏览器会阻止本地模块和 GLB 读取。

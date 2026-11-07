# 修订32：握持与腕部微调（已部署）

点点、知更均完成本轮修改。基线是已部署的修订31，参数保存在 `assets/weapons/character_attachment_v31.json`；新参数归档为 `assets/weapons/character_attachment_v32.json`。本轮已部署到两个线上站点；主仓库未提交、未推送 GitHub。

## 修改范围

| 问题 | 修改 |
| --- | --- |
| QCQ171 左手虚握 | 按护木的实际位置重新对齐左掌和指根，四指环握；知更额外校正掌面朝向。覆盖待机、行走、跑步、瞄准和开火。 |
| QBZ95 瞄准左腕变细 | 在瞄准与开火时，把腕部轴向扭转分配到前臂和上臂，并小幅调整肘部方向；保持左手与枪的原接触位置。没有放大手腕、缩放骨骼或修改模型。 |
| 汉阳造右手握不住 | 以各自 M1897 的右掌朝向为基础，重新对齐木质握颈，适配中指、无名指、小指的包握；待机、行走和跑步再做掌向避让，给长枪托留出前臂空间。瞄准、开火保留 M1897 参考掌向。 |

运行代码沿用修订31的求解器。本轮实际行为变化仅来自两站 `assets/weapon_attachment.json` 的上述三把枪参数，以及配置加载的缓存版本。其他枪、装填、身体动作来源、角色/武器 GLB 和 Godot 运行时未改。

## 同机位对照

以下都是实际 Three.js 场景截图。每一对使用相同动作时刻、相机位置和观察目标，未调整图片中的人物或武器。旁边的 JSON 保存相机、骨骼与握点信息。

| 场景 | 点点：前 → 后 | 知更：前 → 后 |
| --- | --- | --- |
| QCQ171 瞄准 3.05 s，俯视左掌 | [前](diandian/before-qcq-aim.png) → [后](diandian/after-qcq-aim.png) | [前](zhigeng/before-qcq-aim.png) → [后](zhigeng/after-qcq-aim.png) |
| QCQ171 待机 3.05 s | [前](diandian/before-qcq-idle.png) → [后](diandian/after-qcq-idle.png) | [前](zhigeng/before-qcq-idle.png) → [后](zhigeng/after-qcq-idle.png) |
| QBZ95 瞄准 0.89 s，腕部下侧 | [前](diandian/before-qbz-wrist.png) → [后](diandian/after-qbz-wrist.png) | [前](zhigeng/before-qbz-wrist.png) → [后](zhigeng/after-qbz-wrist.png) |
| 汉阳造瞄准 0.89 s，右掌 | [前](diandian/before-hanyang-aim.png) → [后](diandian/after-hanyang-aim.png) | [前](zhigeng/before-hanyang-aim.png) → [后](zhigeng/after-hanyang-aim.png) |
| 汉阳造行走 0.23 s，右掌与枪托 | [前](diandian/before-hanyang-walk.png) → [后](diandian/after-hanyang-walk.png) | [前](zhigeng/before-hanyang-walk.png) → [后](zhigeng/after-hanyang-walk.png) |

## 验证

- 两人各三把枪、五种持枪动作，按 60 Hz 检查完整周期，共 4,920 帧。骨骼数值有限，手臂骨长保持，枪内握点没有随动作漂移；相邻帧手臂旋转变化最大约 5.02°。
- 336 项前后姿态对照通过：未修改的骨骼与枪体变换差为 0。95 式左手世界变换只有小于 `1e-6` 的浮点差，接触位置保持。
- 30 项暂停、重复采样、切枪后恢复检查通过，无累积变换。两站 390 px 手机页面正常加载修订32，三把枪实际播放通过，无页面脚本异常或横向溢出。
- 95 式腕部扭转：点点从约 −125° 降到 −34°，知更从约 −132° 降到 −35°。对同一批腕部蒙皮顶点测量，横截面较小主轴的 RMS 半径最小值分别从 7.44 / 6.19 mm 增至 11.26 / 13.94 mm；没有改变手腕尺寸参数。该值用于比较局部收缩，不是人体腕围。
- 汉阳造五种动作各取13帧，用真实枪托三角形与渐变半径手臂中心线检查间隙：点点最小约 9.28 mm，知更约 6.60 mm。手指接触另以近景截图核对；代理形状和有限采样不等于所有皮肤/衣物表面的穷尽碰撞检查。

详细数值见 `validation-*.json`、`wrist-skin-*.json`、`hanyang-clearance-*.json` 和 `ui-smoke.json`。

## 复查

从仓库根目录启动 `python -m http.server 8080 --bind 127.0.0.1`。检查脚本使用 Playwright 与 Chromium CDP，默认端口9222；通过 `PLAYWRIGHT_MODULE` 和 `CDP_URL` 可覆盖模块位置和连接地址。

先运行 `browser.cjs init diandian` 或 `browser.cjs init zhigeng`，再运行：

```sh
node web/motion-labs/verification_r32/browser.cjs eval diandian web/motion-labs/verification_r32/validate.js work/r32-validation.json
node web/motion-labs/verification_r32/browser.cjs eval diandian web/motion-labs/verification_r32/wrist-skin.js work/r32-wrist.json
node web/motion-labs/verification_r32/browser.cjs eval diandian web/motion-labs/verification_r32/hanyang-clearance.js work/r32-clearance.json
node web/motion-labs/verification_r32/capture.cjs diandian
node web/motion-labs/verification_r32/ui-smoke.cjs
```

知更将角色参数换为 `zhigeng`。基线参数直接从仓库内的修订31归档读取，不依赖临时目录或线上服务。

# R45 抵抗军独立动作站验证

已发布：[抵抗军动作站](https://resistance-motion-lab.expert-eagle-6942.chatgpt.site)，版本与部署记录见 `deployment.json`。

新增军装、背心两个上传角色，在一个独立站点中切换。两人各有 12 个无装备基础动作；五种装备为 QBZ95、56-1、QBU85、97式 Hawk 与 QCQ171，每种包含六个步枪基础动作，97式另有拉泵动作。

## 验证

- 资产：两人合计 1010 个姿态检查，动作绑定有效、骨段长度稳定、变形坐标有限。Blender 4.3.2 导入并检查六个代表姿态。
- 握持：两人合计 2150 个姿态采样；接触点误差小于 0.002 m，动作/装备反复切换无累积姿态偏移。换弹支撑手按源动作离枪。
- 浏览器：86 个角色/装备/动作组合通过；角色按需加载，装备范围准确，时间轴、暂停、速度、骨骼、视角及手机布局可用，无页面异常或资源加载错误。
- 最终复查：QBU85 行走支撑点、动态动作取景和死亡末帧均另做复查。背心模型一个错误的 `neutral_bone` 权重造成末帧细刺，已按同位置正常顶点修复并补充 33 动作、2013 帧的网格边长与同位置顶点重合回归；上传原件保留不变。

接触误差验证的是指定握持锚点；代表姿态截图保存在本目录。站点代码与发布版本对应关系见 `manifest.json` 和 `deployment.json`。

## 记录与复现

- `attachment-validation.json`：全部握持采样。
- `browser-validation.json`：86 个浏览器组合、请求列表和交互检查。
- `final-smoke.json`：最后调整的专项回归。
- `assets/characters/resistance_r45/skinning-validation.json`：异常顶点修复前后与邻边回归（从仓库根目录查阅）。
- `../../..` 下的 `assets/characters/resistance_r45/`：源模型、重定向动作、资产与 Blender 验证报告。
- `tools/qa/{validate_resistance_assets_r45,validate_resistance_skinning_r45,validate_resistance_r45,browser_resistance_r45,smoke_resistance_final_r45}.mjs`：相应检查入口（从仓库根目录运行）。

本次发布目标是新的抵抗军站点；原有点点、知更和坦克站点没有重新发布。GitHub 尚未同步本轮改动。

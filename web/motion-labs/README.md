# 两人动作校准室（修订21）

此目录保存已部署的点点和知更完整网页工程，包含运行代码、角色、十款武器、原动作以及新增动画包。

从仓库根目录运行 `python -m http.server 8080`，访问：
- `/web/motion-labs/diandian-classic-motion-lab/`
- `/web/motion-labs/zhigeng-motion-lab/`

修订16包含：54式、QSZ92手枪高位戒备及行走，C96、QCQ171冲锋枪、QBU85、压缩M1897；汉阳造专用待机/行走、手腕与枪托避让；56冲原臂自然待机；点点手掌90%；手枪实际握孔校准及左臂避躯干。QCQ171横向厚度为收窄前92%。

网页运行时 `weapon-attachment.js` 和各站 `assets/weapon_attachment.json` 是此版本的完整适配实现。新增动画同时整理至 `assets/animations/motion_lab_v16/`，新增武器整理至 `assets/weapons/`。`assets/weapons/character_attachment_v16.json` 保存共享适配参数。

Godot现有 `character_attachment.json` 与组件仍保留之前版本；本次归档网页成果，没有将网页新增约束自动移植到Godot运行时。

`manifest.json` 记录完整网页文件的SHA-256，可核验与已部署版本一致。二进制模型和动画使用Git LFS存储。

## 修订17：RE4霰弹枪动作

M1897覆盖原瞄准、射击与装填；新增上下瞄准极限、独立平视及单次拉泵。两人均提供13段重定向动作，上传源、报告与重现脚本整理在 `assets/animations/re4_shotgun/` 和 `tools/blender/retarget_re4_shotgun.py`。上下源端点为−57.6648°/+56.2974°，独立平视0°；M1897泵总成与前手按源曲线同步。其他武器动作保持。完整网页已同步本次部署源。

修订18修复点点、知更持枪跑步腰部缺面和M1897右拇指反折；高分辨率角色、网页模型与网页约束同时归档，证据与重现脚本见 `assets/characters/repair_r18/README.md`。

## 修订19–20：C96动作与换弹右臂

两名角色的C96待机、行走、跑步、瞄准、射击和装填已精修：握指与拇指限弯、右前臂旋转分摊、支撑腕调整、跑步枪口收幅及平滑后坐。装填采用胸前持枪、腰侧取弹、顶部补弹和回托的确定性轨迹。

修订20在C96装填时加入右肘向外引导（权重0.55），修复右臂进入胸部的问题，保持枪与握把位置。实现位于两站的 `weapon-attachment.js`、`c96-dynamics.js`、`c96-reload.js` 和 `assets/weapon_attachment.json`；共享参数归档为 `assets/weapons/character_attachment_v20.json`。这些改动属于网页运行时适配，角色GLB原始动画及Godot组件未在此轮重导出或移植。

验证记录及前后图见 `verification_r20/`：92项其他武器对照通过，两人合计732帧无异常数值；各61帧、每帧12个右臂中心线点的躯干蒙皮检查中，入体样本由44/19降至0/0。采样与图检不代表已排除所有细小体表接触。

## 修订21：97式Hawk与56-1行走

新增上传的97式Hawk模型，保留源几何、纹理和米制比例，规范为枪口−Z、上+Y、右+X。模型包围盒长约0.981m，未将其当作实枪规格。独立护木节点提供55mm展示拉泵行程。

待机、行走、跑步、瞄准和换弹沿用AR动作；开火以FiringRifle为基础，拉泵以RifleAimingIdle前0.733秒为基础。两者仅替换LeftShoulder/LeftArm/LeftForeArm/LeftHand及左指轨道，身体和全部右侧轨道保持AR源数据，随后进行枪型握持适配。生成逻辑见两站type97-motion.js。左手和真实泵柄按同一曲线同步，切换动作或武器会复位。

56-1仅调整RifleWalk：横持姿态、枪托与胸部避让、左手护木环握和拇指限弯。原上传与规范模型、规范化脚本、共享参数分别在assets/weapons/source/type97_hawk_source.glb、assets/weapons/type97hawk.glb、tools/gltf/normalize_type97_hawk.py和assets/weapons/character_attachment_v21.json。这些是网页动作适配，未自动移植到Godot游戏逻辑。

验证与截图见verification_r21：两人102项未预期改动的原武器姿态保持一致；新枪右侧与身体动画轨道精确AR，55mm机械泵移动/复位和390px手机布局通过；两人56-1行走各61帧的枪托入体采样降为0。有限采样和图检不代表对所有连续时刻的穷尽碰撞证明。

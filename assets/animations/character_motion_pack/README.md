# 角色动作包

本轮上传九个 FBX，均为 65 骨 Mixamo、30fps。点点保留原四段动作并加入九段，共十三段。知更将 woman_idle 作为默认 Idle，保留现版 Walk，并加入其余八段，共十二段。新动作已适配各自身体比例和原有手部绑定。

| 来源 | 导入名 | 点点 | 知更 |
| --- | --- | --- | --- |
| woman_idle.fbx | WomanIdle / Idle | 新增可选待机 | 替换默认 Idle |
| woman_Standing Idle.fbx | StandingIdle | 新增 | 新增 |
| Talking.fbx | Talking | 新增说话手势 | 新增说话手势 |
| Rifle Idle.fbx | RifleIdle | 新增 | 新增 |
| Rifle Aiming Idle.fbx | RifleAimingIdle | 新增 | 新增 |
| Firing Rifle.fbx | FiringRifle | 新增 | 新增 |
| Rifle Run.fbx | RifleRun | 新增 | 新增 |
| Reloading.fbx | Reloading | 新增 | 新增 |
| Pistol Idle.fbx | PistolIdle | 新增 | 新增 |

Talking 和 Reloading 单次播放，其余循环。FBX 的线性水平位移从预览动作中移除，保留髋部摆动、转身和跑步腾空。骨骼/皮肤比例沿用已完成的人物模型。当前只适配人物动作，FBX 不含枪械道具；武器可在游戏中挂到对应握持点。

## 预览与下载

- [点点动作测试](https://diandian-classic-motion-lab.expert-eagle-6942.chatgpt.site)
- [知更动作测试](https://zhigeng-motion-lab.expert-eagle-6942.chatgpt.site)
- [点点 GLB](https://github.com/752960522qq-ai/diandian/raw/refs/heads/main/assets/characters/diandian_classic/diandian_classic_fixed.glb?download=1)
- [知更 GLB](https://github.com/752960522qq-ai/diandian/raw/refs/heads/main/assets/characters/zhigeng/zhigeng_character_animated.glb?download=1)

同目录 `source/` 保留上传的原始 FBX；`sources.json` 记录文件与 SHA256。各角色目录内 `motion_pack_report.json` 记录适配结果，`motion_*_preview.png` 为本轮代表姿势。

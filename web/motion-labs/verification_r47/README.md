# R47：抵抗军握枪方向和手腿间距修复

修正两名抵抗军五把枪的右手方向，增加待机/行走的肩部打开与上臂外展；更新同一抵抗军独立网站，源码、动作资产和验证记录同步至 GitHub。

## 问题与修正

R46 右手的手腕至指根轴误沿枪把方向，接触点测试虽通过，手掌仍转错。R47以食指至小指横轴沿枪把、手掌纵轴朝扳机、掌心朝枪把重建坐标架。新增独立方向回归，避免再次只校验接触点。食指在有角度限制的求解下贴近扳机位置；QBU85待机/行走调整携枪角度与位置以保证双手可达。

Idle/Walk修正直接写入GLB：肩部后开3°，上臂在R46基础上分别外展6°/8°。用户上传男性动作的节奏和时长保留，其他31段底层动作及模型蒙皮保持不变。

## 验证

- `attachment-validation.json`：两角色全部装备/动作组合，共5246采样帧；双手锚点误差小于3mm，姿势往返切换无漂移。
- `hand-direction-validation.json`：两角色五枪各持枪动作共1302帧；掌横轴、纵轴、掌面三个方向正确，食指目标误差小于3mm。
- `surface-validation.json`：实际变形掌面至枪械接触表面检查，零射线漏检；覆盖待机、行走、跑步、瞄准、射击及97式拉泵。此项不是全身/整枪逐三角面无穿插证明。
- `asset-surface-clearance-validation.json`：60Hz逐帧实际手指/手掌三角面与裤子三角面检查。R47共1128帧，两人Idle/Walk均零相交，最小间隙原生13.32mm、网站1.75m身高下23.30mm。
- `browser-validation.json`：86个角色/装备/动作组合，切换、播放、拖动进度、速度、骨骼开关、移动端布局及加载范围检查通过。
- `final-browser-validation.json`、`final-*.png`：最终食指修正后，两角色五枪及QBU85行走、Idle/Walk浏览器复核通过。
- Blender双角色新旧动作对照与死亡蒙皮回归通过。资产校验值见 `asset-manifest.json`。

## 复现与范围

参见 [站点README](../resistance-motion-lab/README.md) 和 `assets/characters/resistance_r47/README.md`。右手握持使用独立网页现有求解架构；未修改Godot运行时或其他两个网站。

发布后的精确源码提交与部署记录分别存于 `publication.json`、`deployment.json`。

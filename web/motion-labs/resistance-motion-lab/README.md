# 抵抗军独立动作站 · R48

两位抵抗军使用点点对应枪械的实际手掌和手指姿态。修正空手 Idle 肩部下垂，保留其他无装备动作。

- 当前源码：R48，未发布线上。
- 完整结果与限制：`../verification_r48/README.md`。
- 可复用动作：`../../../assets/characters/resistance_r48/`。
- 在仓库根目录运行 `python -m http.server 8080`，访问 `/web/motion-labs/resistance-motion-lab/`。

下面保留 R47 历史说明，R48 以最新验证说明为准。

# 抵抗军独立动作站 · R47

两名抵抗军角色，12 个无装备动作，以及 QBZ95、56式（56-1）、QBU85、97式 Hawk、QCQ171 的待机、行走、奔跑、瞄准、射击、换弹；97式额外提供拉泵。

## R47 修复

- 修正两人五把枪共用的右手解剖坐标架：食指至小指横轴沿枪把，手腕至指根纵轴朝扳机方向，掌心朝枪把。R46误把掌纵轴沿枪把方向，导致接触点正确但整只手转错。
- 食指根据各枪扳机位置做有限角度贴合，保留其他手指包握与拇指约束。
- QBU85 待机、行走重新调整携枪角度与位置，在正确手掌朝向下保持左右手可达及前臂与装备包间距。
- 无装备 Idle、Walk 肩部后开，上臂适度外展；修正写入可复用动作 GLB。保留用户上传男性 FBX 的时长、摆臂节奏，以及其余 31 段底层动作。
- 网页资源增加 R47 版本参数，防止更新后仍使用旧动作或旧校准缓存。

## 资产与复现

原模型：`assets/characters/resistance_r45/*/source.glb`。用户男性 FBX：`assets/animations/resistance_r46/sources/`。R47动作与校准：`assets/characters/resistance_r47/`。回归检查、截图、发布记录：`web/motion-labs/verification_r47/`。

从仓库根目录运行：

```sh
node tools/gltf/open_resistance_arms_r47.mjs
node tools/characters/calibrate_resistance_weapons_r47.mjs
node tools/qa/validate_resistance_r47.mjs
node tools/qa/validate_resistance_hand_direction_r47.mjs
node tools/qa/validate_resistance_surfaces_r47.mjs
node tools/qa/validate_resistance_clearance_r47.mjs
python -m http.server 8086 --bind 127.0.0.1
# 另一终端
node tools/qa/browser_resistance_r47.mjs
```

预览地址 `/web/motion-labs/resistance-motion-lab/`。此目录是独立静态站点源，发布时复制为 Sites 的 `dist/`。握持求解用于网页动作站，未移植到 Godot 游戏运行时。源码、动作资产和验证记录同步至 diandian 仓库。

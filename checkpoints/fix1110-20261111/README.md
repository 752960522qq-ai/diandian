# 人物动作局部修正：暂停时的备份

这是根据用户要求暂停时的**未完成进度**，不代表全部问题已经解决或验收。基准为恢复后的提交 `b0b2aaef9c1c59e96ca86a5c7c450f82e6171972`。各人物分别按自己的骨骼修正，试验中未通过检查的候选没有接入测试站。分支不代表网站已经发布。

## 内容

- 本分支的 `web/motion-labs/` 中是此前已接入本地测试站的局部修正及其引用；人物原始模型和原始动作没有改写。
- `local-progress.zip` 包含截至暂停的脚本、逐阶段说明、候选 JSON、检查日志和预览图，也包含四个测试站的文本源码备份；不包含大型临时 GLB 或 Blender 工作文件。SHA-256：`de209bbed7c927d8cecd365cce15b003838c2ebd5444a2000f28650bf131d9e8`。
- `feedback-original.zip` 是用户上传的 `fix1110.zip`，包含问题截图。SHA-256：`69f7f807c5cefa4aadc1287642d297a9081e84e51195eafa93341626a1fa2972`。
- `RE4_Mobile_Leon_134_Raw_Animations.zip` 是用户提供的原始动作包。SHA-256：`ef0c1ba6d25181e11f1af1c376937036ffb961fbebe4cb491810215ef6d9f5d9`。
- 用户上传的 7 个原始 FBX 已逐项比较 SHA-256，与仓库既有的 `assets/animations/character_motion_pack/source/` 和 `assets/animations/motion_lab_r41/source/pistol Shooting.fbx` 一致，无需复制。

三个 ZIP 由 Git LFS 保存。备份包省略了仓库中已有的知更和点点原始对照 GLB，其 Git LFS SHA-256 分别为 `b0a0b68129e05c60be37bdc5e9c9cb5f8a5752e625d4e201979fd7e3f91dee88`、`56e47c42a14c588b492b33a0ac80d797977b3e08c0f0a09f0285a3e821dbc210`。

## 进度与恢复

知更 97 式射击左臂过高已按知更骨骼单独调整，并以背心抵抗军为参考。其他已接入的修正仍有部分握持间隙或穿模，详见 `work/fix1110/stage*.md`；例如背心抵抗军 M870 待机和林叙 56 式待机的最新候选未通过检查，没有接入。

恢复时检出本分支并执行 `git lfs pull`，将 `local-progress.zip` 解压到单独的临时目录进行查看，再按需将 `work/fix1110` 放回仓库；不要直接用未经核对的备份覆盖已有文件。大型中间 GLB 需要按脚本重新生成，运行检查需 Blender 4.3.2、Node.js 和 Three.js 0.180.0。`STAGE.md` 中提到的旧本地完整工作区路径仅为原环境记录；模型与原始动作应从仓库对应的 LFS 资源取得。

## 后续工作进度快照

`continued-progress.zip` 保存了重新开始后的会话基线、阶段34–38的检查点、预览、脚本、参数及三个背心 M870 Blender 工作文件。大小 409,938,516 字节，SHA-256 `ff799b5dc7f3802e38eb531a85c6370476dab833db81f2045cccd5b9397df6b9`；由 Git LFS 管理。ZIP 内 `MANIFEST.json` 列明各阶段包及 Blender 文件哈希。阶段38有详细已完成与未完成清单，未通过的候选仅作为研究进度保存。

本次已验收并接入的进展包括军装 QSZ92 待机和56式左腕、背心 QSZ92 瞄准、点点 M870 待机右手、林叙 QBU85 待机握持、知更97式拉泵左臂；另外完成林叙 QBZ95/97式抵肩、点点和知更 PF89、知更97射击左臂等视觉复核。其他问题仍在处理，不能把此备份视为全部完成，也没有重新部署网站。

恢复时先检出本分支并用 Git LFS 取得 ZIP；查看 `continued-progress.zip` 的 `MANIFEST.json` 和 `stages/`，按各阶段的说明恢复。外层包含的 Blender 工作文件可直接用于继续背心 M870 调整；其余可重建的临时导出 GLB 不包含在进度包中，原始模型与动作保留在仓库原有的 LFS 路径。

后续阶段39：`stage39-vest-qbu85.zip` 保存背心 QBU85 待机右掌、手腕和手指的单角色修正及证据。Terra 检查首中末及多角度，相关动画与隔离检查通过。SHA-256 `196cf03018578ccefc704ec1332e3122c6539e5a1a607a85cf6d559094a4e289`。恢复时在 `continued-progress.zip` 对应内容之后覆盖阶段39；其他未完成项目以阶段38的清单及之后记录为准。

后续阶段40：`stage40-vest-qbu85-walk.zip` 保存背心 QBU85 行走时双手与拇指的独立修正和首中末多视角证据，范围与拖动复核通过。SHA-256 `9919d4f374e66ed8297d957da5d35936b76bd8f7e8c3eedfa70ea7f3f7215518`。恢复时在阶段39之后覆盖阶段40；其余未完成问题仍需继续处理。

阶段41与42：`stage41-vest-56-fire-corrected.zip` 保存已接入的背心56射击左手修正及验证，SHA-256 `4bfc491bed7959bb917f51bcbecb79e562bd47296df4ed11468093b9ef0765c1`。旧的本地阶段41包曾夹带未通过的背心M870候选源码，请勿恢复旧包。`stage42-visual-sync.zip` 保存知更最终验收、视觉记录与未完成候选的预览记录，SHA-256 `0033e32064ec5273a4eec9984fd29c51c798453551f35db936d51071dbc12142`；其中候选不代表通过或接入。已接入的知更M870瞄准和QJZ89调整，以及背心56射击调整在本分支源码中。其余未完成事项见包内 `stage42-sync.md`；不要直接覆盖当前工作树。

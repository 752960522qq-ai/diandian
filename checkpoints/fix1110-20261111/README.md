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

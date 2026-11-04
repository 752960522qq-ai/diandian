当前GLB已应用修订23上端腰桥收入夹克修复（保留修订22下端裁面及修订18闭合）；历史.blend工程保留，重现方法和验证见 `../repair_r18/README.md`。

当前为双手修订4：重建左右手连续蒙皮，统一独立指尖与手套的绑定，修正无名指关节与动作中的手指姿态。详见[双手前后对照与下载](hands_revision4_review.md)。

当前动作包包含 **11 段**。普通待机仅保留点点自己的默认 `Idle`，移除多余的 `WomanIdle`、`StandingIdle`；走路、跑步、转头、持枪与瞄准等动作保留。详见[动作包与下载](../../animations/character_motion_pack/README.md)。

# 点点经典形象 · 恢复原头模比例

本版撤销上一版头部的非等比拉伸，使用上传的 `diandian head.glb` 原始几何，以 XYZ 均为0.125的比例整体缩放。相较v5，头部宽度收回16.67%，前后深度收回5.30%，头高与位置保留；五官和脸型恢复原模型比例。

头发、246根面部骨骼与下颌控制骨同步适配新头围，接颈以平滑过渡连接原身体。沿用已经修好的手指权重、四段动作及大臂比例。

- `diandian_classic_fixed.glb`：当前修订23完整模型，头部沿用v6比例，包含11段动作与双手修订4。`diandian_classic_fixed.blend`保留历史可编辑源文件，未回写修订18/22/23的GLB后处理。
- `diandian_classic_before.glb`：上一版v5，供头部比例对照。
- `proportion_report.json`：原始几何等比还原、头发与骨骼适配记录。
- `source_head/`、`source_hair/`、`source_animations/`：上传的原始素材。

在线查看：<https://diandian-classic-motion-lab.expert-eagle-6942.chatgpt.site>

下载模型保留高分辨率贴图；网页使用2K贴图，几何、骨骼和动作相同。当前手部近景以 `hands4_*` 图片为准；其余旧近景保留作历史记录。


## 修订22：腰部皮肤穿出裤子

QBZ95持枪跑步0.38秒时，修订18新增腰桥的前下方会翻到裤子外面。现仅移除被裤子覆盖的164个冗余补面，保留原身体和衣服、全部顶点及权重、34点腰部中缝、上半腰桥及后背闭合。正式高分辨率GLB与网页2K GLB均已修复；贴图、骨架及动画保持原数据。

重建顺序为：历史源GLB → `tools/blender/fix_character_waist.py`生成修订18腰桥 → `tools/gltf/fix_waist_clothing_overlap.py`裁掉前下方冗余面。后者需要numpy，命令格式为：

```sh
python tools/gltf/fix_waist_clothing_overlap.py path/to/diandian_fixed_r18.glb work/diandian_classic_fixed_r22.glb work/waist_formal_r22_report.json
```

先创建`work/`；勿将已修订22的GLB再次作为输入。修订18步骤和边界文件见`../repair_r18/README.md`。验证与前后对照见`../../../web/motion-labs/verification_r22/`，其中`formal_mesh_report.json`记录正式模型不变量与SHA-256。已检查报告姿态、走路、跑步和大幅扭转等代表性视角。


## 修订23：上端腰桥收回夹克

修订23已合入最终GLB与网页源码，验收记录见下文。新截图的腋下附近肤色三角来自新增腰桥上半顶盖/侧壁，与修订22移除的下端穿裤面不同。本轮仅把这部分上半延伸由原生坐标6.5cm缩至2cm，将最上端径向系数0.9收至0.75；保留原34点腰部中缝、下半补面、修订22裁面及原始服装、贴图、蒙皮权重、骨架和动画。

重现顺序为历史源GLB → 修订18腰部闭合 → 修订22下端裁面 → `tools/gltf/fix_waist_bridge_upper_overlap.py`修订23上端收缩。正式模型与站点2K模型分别使用各自对应版本；最终模型已合入，验证记录见`../../../web/motion-labs/verification_r23/`。


r23输入必须已有34点原腰部中缝与448个腰桥三角面，即已完成r22下端裁面的对应版本；需要Python 3和numpy。正式高分辨率模型与网页2K模型各自使用对应r22源，保持各自贴图规格。创建输出目录后执行：

```sh
mkdir -p work
python tools/gltf/fix_waist_bridge_upper_overlap.py path/to/diandian_fixed_r22.glb work/diandian_fixed_r23.glb work/waist_upper_r23_report.json
```

不要把已处理的r23模型再次作为输入。原始子任务报告保留交付时状态；其三动作joint试验只作过程记录，最终左臂采用仅RifleIdle的范围，最终结果以`verification_r23/FINAL_QA.md`为准。

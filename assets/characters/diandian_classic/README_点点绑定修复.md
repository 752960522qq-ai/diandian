# 点点经典形象 · 高精度头部、发型与手部适配

本版使用上传的 `diandian head.glb` 替换原低精度头，重新适配头部比例、接颈与面部蒙皮。保留夏晴来源的246根面部骨骼并按新脸位置重设；新脸权重限定在Head及其面部子骨骼，继续使用原有312根完整骨架。

黑棕短发的整体宽度由151.5毫米收至142.4毫米，约收窄6%。刘海轻微内收，按平滑头部截面保留约4.5毫米的目标间隙；原UV、发色与材质细节保留。

重新整理了双手各指节的权重，修正末端指节不自然的翻转与拇指扭曲。待机、走路和大幅扭转使用轻松微弯手型，跑步使用松弛半握手型；四段动作均保留轻微手指变化。待机时左右手与大腿、侧包的最小表面间隙约10.25毫米、9.95毫米。

上一版大臂比例继续保留：肩到肘长度为初始长度的93.1%，本次没有再缩短；小臂、手掌、手指的静态段长与粗细保持。待机手臂外展角度、双脚站稳、走路重心侧移和跑步腾空继续沿用，身体、腿脚及腕部动作曲线保持。

## 交付文件

- `diandian_classic_fixed.blend`：可编辑角色、高精度头、发型、绑定与四段动作。
- `diandian_classic_fixed.glb`：本次v5角色，贴图与Idle、Walk、Run、HeadStress四段动作内嵌。
- `diandian_classic_before.glb`：完整的上一版v4角色，用于同一动作、同一时间的版本对照。
- `source_head/`、`source_hair/`、`source_animations/`：用户上传的头部、假发与两份原始FBX动作。
- `head_replacement_report.json`、`face_binding_report.json`、`hands_report.json`、`hair_report.json`：本版几何、绑定与动作记录。
- `hair_front_preview.png`、`hair_side_preview.png`、`hair_back_preview.png`：头部正、侧、背面近景。
- `idle_left_hand.png`、`idle_right_hand.png`、`walk_right_hand.png`、`run_right_hand.png`：手部动作近景。

## 在线测试

<https://diandian-classic-motion-lab.expert-eagle-6942.chatgpt.site>

支持四动作切换、上一版/本次适配对照、播放速度与进度、骨骼显示、全身/头部/脚部/左右手特写，以及正面/侧面/背面视角。左右手特写会跟随动作移动，手机可用。

下载版GLB与Blender源文件保留原高分辨率贴图。网页使用最多2K贴图与JPEG颜色贴图压缩，几何、骨骼和动作与下载版相同；头发法线从4K缩至2K并重新归一化。

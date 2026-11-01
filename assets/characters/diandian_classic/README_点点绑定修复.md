# 点点经典形象 · 黑棕短发与自然待机

本版将上传的bob假发适配到点点头部，并用实际贴图改为黑棕色，保留暖棕亮部。处理了发际线、发旋处头皮间隙和发尾长度，头发以Head骨权重1随头部运动，UV与4K法线细节保留。

待机时左大臂外展5.5°，右大臂外展10°并轻微前移3°，让手套避开大腿与较厚的腿侧包。保留原腕、掌、手指和身体动作曲线。26个周期采样时刻，左右真实网格最小表面间隙约4.49毫米、4.18毫米；开放侧包边缘用实际射线排除法线投影误判。

两侧大臂按上一版长度再缩短2%，当前肩到肘约145.31毫米，为初始长度的93.1%。肩点固定，小臂、手掌和手指自身段长、粗细保持，整体随肘向内平移。

模型共312根骨骼，身体与头发合计128,882个顶点、75,834个三角面；四段动作Idle、Walk、Run、HeadStress均已内嵌。待机双脚接地和走路自然重心侧移继续保留。

## 交付文件

- `diandian_classic_fixed.blend`：完整可编辑角色、黑棕短发、绑定和动作。
- `diandian_classic_fixed.glb`：修复后的角色与四段动作，贴图内嵌。
- `diandian_classic_before.glb`：相同发型、比例与动作，身体使用最初上传的蒙皮权重，供绑定对照。
- `source_hair/`、`source_animations/`：上传的原始假发与两份FBX动作。
- `appearance_report.json`、`upper_arm_report.json`、`idle_clearance_report.json`、`hair_report.json`：本版修改与来源记录。
- `hair_front_preview.png`、`hair_side_preview.png`、`hair_back_preview.png`：网页头发近景。

## 在线测试

<https://diandian-classic-motion-lab.expert-eagle-6942.chatgpt.site>

下载版保留4K头发法线贴图，网页版使用2K法线贴图提升加载速度。

支持四动作切换、播放速度与进度、绑定前后对照、骨骼显示、全身/头部/脚部特写，以及正面/侧面/背面视角；适配手机。

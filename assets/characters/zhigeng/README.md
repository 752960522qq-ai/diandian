# 知更 · 十二段动作与面部微调

当前完整交付采用头部比例微调 v5，并引入用户上传的动作包。默认待机使用 `woman_Standing Idle.fbx`（Idle）；`woman_idle.fbx` 作为 WomanIdle 保留，走路保持现版。头部连同发型等比放大 4%，嘴部相对脸宽收 8%，唇部高度轻收 5%。

- 在线测试：<https://zhigeng-motion-lab.expert-eagle-6942.chatgpt.site>
- `zhigeng_character_animated.glb`：315 骨骼、十二段动作、内嵌贴图。
- `zhigeng_character_animated.blend`：同版可编辑工程。
- `zhigeng_godot_physics_demo.zip`：Godot 4.6.3 独立测试工程，动态列出全部动作。
- [动作包来源、列表与下载](../../animations/character_motion_pack/README.md)
- [脸部前后对照](concept_face_v4_review.md)

待机和跑步等循环播放，Talking、Reloading 单次播放。保留夏晴来源面部骨架、脸部控制与头发绑定；耳机和麦克风已删除，穿出发型的耳部已隐藏。

马尾使用 Godot 4.6.3 自带 SpringBoneSimulator3D，搭配颈部、背部与双肩的四个 SpringBoneCollisionCapsule3D。新动作也烘焙了三节马尾的基础避碰姿势；实时摆动由 Godot 场景或网页对应组件提供。GLB 本身保存模型、绑定和烘焙动作。

配置为 `ponytail_physics.json`，预览场景为 `godot/scenes/zhigeng_preview.tscn`。`motion_pack_report.json` 记录本轮动作来源、比例换算与落地处理。

组件文档：[SpringBoneSimulator3D](https://docs.godotengine.org/en/stable/classes/class_springbonesimulator3d.html)、[SpringBoneCollisionCapsule3D](https://docs.godotengine.org/en/stable/classes/class_springbonecollisioncapsule3d.html)，Godot 内置，MIT。

本轮已修复新增动作手指末节的方向补偿，原第1、2节及手腕动作保留。详见 [头部与手指前后对照](revision5_review.md)。

站立待机间距修订3：双大臂轻微外展3.5°，保留手指、手腕和身体摆动；整段6秒待机按实际手套与裤腿/侧袋表面检查。前后图见 `idle_revision3_*`，记录见 `idle_clearance_revision3.json`。

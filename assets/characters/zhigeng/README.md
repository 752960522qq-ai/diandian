# 知更 · 十二段动作与面部微调

当前完整交付采用概念图脸部微调 v4，并引入用户上传的动作包。默认待机换成 `woman_idle.fbx`；按用户确认，走路保留现版。另一段女性站立待机保存为 StandingIdle。

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

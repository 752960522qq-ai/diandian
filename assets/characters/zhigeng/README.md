# 知更 · 马尾物理与发型修整

耳机与麦克风已删除；头发内露出的耳部已隐藏，保留脸型与其余头部比例。沿用夏晴来源面部骨架和原有待机、走路、跑步、转头四段动作。

马尾重新贴合静止骨链，三节马尾骨接入Godot 4.6.3自带SpringBoneSimulator3D，通过颈部、背部和双肩四个胶囊碰撞体滑动避碰。碰撞半径按发束厚度配置，四段GLB动作也已烘焙马尾避碰修正。网页提供对应的实时弹簧与胶囊预览，含物理开关。

## 使用

- 在线预览：<https://zhigeng-motion-lab.expert-eagle-6942.chatgpt.site>
- `zhigeng_character_animated.glb`：角色与四段动作，315根骨骼，贴图内嵌。
- `zhigeng_character_animated.blend`：可编辑绑定、动作与材质。
- `zhigeng_godot_physics_demo.zip`：解压后用Godot 4.6.3打开project.godot，直接运行，可切换动作、马尾物理和视角。
- 仓库工程预览场景：`godot/scenes/zhigeng_preview.tscn`，配置位于`ponytail_physics.json`。

GLB保存网格、骨骼与烘焙动作，运行时物理由Godot场景中的组件提供。角色在示例中保持Skeleton3D缩放为1。

## 组件来源

- [Godot SpringBoneSimulator3D](https://docs.godotengine.org/en/stable/classes/class_springbonesimulator3d.html)：MIT，内置骨链弹簧。
- [Godot SpringBoneCollisionCapsule3D](https://docs.godotengine.org/en/stable/classes/class_springbonecollisioncapsule3d.html)：随身体骨骼移动的碰撞胶囊。
- 也调研了[Godot VRM](https://github.com/V-Sekai/godot-vrm)，本角色为普通GLB，因此采用Godot原生组件。

`godot_physics_report.json`与`web_spring_surface_report.json`记录四段动作中实际马尾蒙皮顶点的抽样间隙；角色面部控制和315骨架继续保留。

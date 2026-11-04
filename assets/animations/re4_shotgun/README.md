# RE4霰弹枪动作适配（修订17）

点点、知更 · RE4霰弹枪动作适配 · 修订17

网站：
https://diandian-classic-motion-lab.expert-eagle-6942.chatgpt.site
https://zhigeng-motion-lab.expert-eagle-6942.chatgpt.site

本包包含两名角色的完整校准网站（模型、贴图、骨架、原动作、九款武器、网页源代码）、每人13段新霰弹枪动作、原始上传FBX和重定向脚本。动画GLB只含骨架和动画；完整带蒙皮角色在同站assets/diandian_fixed.glb或zhigeng_fixed.glb。原模型和面部、头发、已有动作均保留。

使用：在本包目录运行 python -m http.server 8080，然后打开：
http://localhost:8080/sites/diandian/dist/
http://localhost:8080/sites/zhigeng/dist/
需要通过HTTP访问，直接双击HTML无法加载3D资源。

M1897：同类按钮直接使用新的霰弹枪瞄准、射击和装填动作；另有独立上瞄、下瞄、平视、拉泵按钮。上下端点分别是原始瞄准极限 +56.2974°、−57.6648°，平视为0°。连续俯仰在下瞄→平视→上瞄间做骨骼混合，滑块中间值是混合比例。其他武器仍使用原动作。

拉泵由原始前手轴向曲线驱动，移除首尾漂移并适配为85mm机械行程，M1897原有独立泵柄、连杆及前手同步后拉、前推。装填时释放左手前托约束，保留源动作。源没有手指骨，使用角色既有握姿和网站手指约束适配。

每人动作：ShotgunAimUp/Down/Level、ShotgunFireUp/Down/Level、ShotgunPumpUp/Down/Level、ShotgunReload、ShotgunCycleUp/Down/Level。Cycle是包内参考完整射击循环，网页使用独立射击和拉泵片段。瞄准上/平视0.533秒，下0.033秒；射击0.233秒；拉泵0.733秒；装填1.967秒；参考完整循环0.967秒。保留上传包标称30fps，不推断原游戏实际帧率。

重现（Blender 4.3）：
blender -b --python tools/retarget_re4_shotgun.py -- --source-dir source_fbx --sites-root sites --report-dir reports
重现导出动画后，网站的weapon_attachment.json与weapon-attachment.js保留已校准挂接和机械联动。

验证：两人各10项浏览器交互检查无页面错误；21级俯仰采样均在源极限内；平视0°；双手接触/泵柄复位、装填松开左手、其他武器恢复、暂停/seek和极限取景通过。verification目录保存数值和浏览器检查报告。射击末帧与拉泵首帧的源骨骼位置、旋转差均为0。

此次接入目标是这两个动作校准网站。Godot游戏原型脚本未自动移植网页约束。完整文件SHA-256见manifest.json。

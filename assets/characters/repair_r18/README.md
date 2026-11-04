# 角色修订18

修复两人持枪跑步腰部缺面，以及M1897右拇指反折。腰桥由原腰部开放环双向延伸，复制中环坐标和权重，下层渐变至Hips并进入裤腰，上层渐变至Spine/Spine1并进入上衣内部；原GLB BIN、节点、骨架和原动画数据保留。正式高分辨率资产与网站GLB均已修复。

M1897所有动作保留拇指根部姿态，两个指骨的最短旋转修正分别限制为35°/30°。拇指配置与实现位于两站weapon_attachment.json及weapon-attachment.js。

重现腰部修复：
```sh
python tools/blender/fix_character_waist.py path/to/character.glb assets/characters/repair_r18/waist_diandian_boundary.json work/report.json
```
知更使用waist_zhigeng_boundary.json。脚本需要numpy和Pillow；自动备份原文件到报告目录。历史.blend工程未覆盖，GLB是此修订的当前导出资产。

本目录含近景、原BIN保留报告、逐动作拇指及腰部回归验证。

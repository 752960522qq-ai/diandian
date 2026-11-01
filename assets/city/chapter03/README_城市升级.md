# 第三章城市 · 每款最多三处版

本版用 hero_13 的 **47 款不同楼体替换 126 处建筑**：37 款各用 3 次、5 款各用 2 次、5 款各用 1 次。楼型范围按用户最新授权开放，转角楼和带 `Sxx-Bxx` 来源编号的模型继续禁用。同一模型按几何指纹归类，改名、旋转或缩放不另算一款。

51 款原始候选中排除了 `urban+building+facade+10.glb`（`OLDTOWN_Corner_Shop_10`）和 `historic_facade_57b.glb`（街角楼57）；49 款可选素材经体量匹配，实际采用47款。其余2款没有落位。当前场景从用户原始 `city.glb` 构建，避免继承旧版替换物体与贴图。

## 模型与布局

- `city_hero13_detail.glb`：供 Godot 导入的静态场景，贴图内嵌。
- `city_hero13_detail.blend`：可编辑 Blender 工程，楼体按 R001～R126 分组，编辑原点位于原建筑地脚。
- `replacement_manifest.json`：每处原楼体的中心、地脚、包络、主轴与替换来源。
- `asset_selection.json`：来源、文件与几何指纹、实例次数、标记筛选及排除名单。
- `layout_summary.json`：布局对照与场景统计。

原道路、弯道、路口、高架、坡道和保留物件沿用；新楼体维持原包络中心、地脚高度和主轴，平面向内留约2%余量。原城市坐标、原点和整体缩放不变。仅替换可独立识别的楼体，原有超薄背景与特殊结构继续保留；同款楼共享网格。

场景按实例展开共 **3,909,320 个三角面**，147 张贴图全部内嵌且无缺失。布局对照确认 2,276 个受保护原始网格未改变，原物体变换误差为0；GLB中保留126个楼体分组及来源记录，单款最多3处。

预览渲染使用1024像素纹理上限；交付模型保留原始2K/4K纹理，可在Blender中提高预览纹理上限。

## 预览

- [修改后总览](city_after_overview.png) · [原始总览](city_before_overview.png)
- [修改后俯视](city_after_top.png) · [原始俯视](city_before_top.png)
- [街区近景](city_detail_corner.png) · [沿街近景](city_detail_street.png)

修改后的四张预览对应本版场景。

## 实际采用的素材

| 原始文件 | 位置数 | 源三角面 | 原贴图最高尺寸 |
| --- | ---: | ---: | ---: |
| `01-apartment-building-54.glb` | 1 | 23,183 | 4096×4096 |
| `03-hotel-building-3d-model-52.glb` | 3 | 23,374 | 4096×4096 |
| `04-office-building-3d-model-51.glb` | 3 | 22,639 | 4096×4096 |
| `05-apartment-building-50.glb` | 3 | 22,709 | 4096×4096 |
| `01-modern-storefront-building-3d-model-57.glb` | 3 | 13,012 | 2048×2048 |
| `02-building-3d-model-56.glb` | 3 | 13,467 | 2048×2048 |
| `architectural_facade_66.glb` | 3 | 22,940 | 4096×4096 |
| `city_building_62.glb` | 3 | 22,362 | 2048×2048 |
| `historic_building_59.glb` | 3 | 23,279 | 2048×2048 |
| `historic_storefront_61.glb` | 3 | 22,029 | 2048×2048 |
| `police_headquarters_65.glb` | 3 | 21,123 | 4096×4096 |
| `shopping_mall_64.glb` | 3 | 44,824 | 4096×4096 |
| `three_story_60.glb` | 3 | 21,978 | 2048×2048 |
| `urban_building_63.glb` | 3 | 21,219 | 2048×2048 |
| `urban_facade_58.glb` | 3 | 22,652 | 2048×2048 |
| `apartment+building+11.glb` | 2 | 41,858 | 4096×4096 |
| `apartment+building+2.glb` | 3 | 22,295 | 4096×4096 |
| `apartment+building+3.glb` | 3 | 22,788 | 4096×4096 |
| `apartment_14.glb` | 2 | 14,194 | 2048×2048 |
| `apartment_building_18.glb` | 2 | 10,373 | 2048×2048 |
| `cbd_office_27.glb` | 2 | 24,342 | 4096×4096 |
| `cbd_office_28.glb` | 3 | 26,914 | 4096×4096 |
| `cbd_office_29.glb` | 3 | 26,108 | 4096×4096 |
| `cbd_office_30.glb` | 1 | 27,685 | 4096×4096 |
| `city+street+building+9.glb` | 3 | 41,559 | 4096×4096 |
| `concrete_apartment_28.glb` | 3 | 9,130 | 2048×2048 |
| `glass_office_22.glb` | 3 | 21,923 | 4096×4096 |
| `glass_skyscraper_23.glb` | 3 | 23,202 | 4096×4096 |
| `historic_building_facade_15.glb` | 3 | 20,217 | 4096×4096 |
| `modern_glass_2.glb` | 3 | 53,119 | 4096×4096 |
| `modern_glass_24.glb` | 3 | 20,157 | 4096×4096 |
| `modern_glass_office_21.glb` | 2 | 20,203 | 4096×4096 |
| `modern_office_complex_26.glb` | 3 | 109,807 | 4096×4096 |
| `office_building_1.glb` | 3 | 25,960 | 4096×4096 |
| `office_building_26.glb` | 3 | 118,372 | 4096×4096 |
| `old+building+facade+6.glb` | 3 | 13,198 | 2048×2048 |
| `old+urban+building+8.glb` | 3 | 41,189 | 4096×4096 |
| `old_apartment_13.glb` | 3 | 14,463 | 2048×2048 |
| `old_building_17.glb` | 3 | 10,526 | 2048×2048 |
| `old_italian_townhouse_19.glb` | 1 | 10,633 | 2048×2048 |
| `rusty_apartment_27.glb` | 1 | 10,502 | 2048×2048 |
| `skyscraper_26.glb` | 3 | 113,784 | 4096×4096 |
| `storefront+building+7.glb` | 3 | 34,164 | 4096×4096 |
| `storefront_12.glb` | 3 | 18,373 | 2048×2048 |
| `urban+building+facade+5.glb` | 3 | 12,838 | 2048×2048 |
| `urban_building_facade_20.glb` | 1 | 10,527 | 2048×2048 |
| `urban_shopfront_13.glb` | 3 | 18,162 | 2048×2048 |

来源包括 hero_13 的 v13 原始单栋素材与 v16/v17/v18 更新包。v13 素材从原交付归档的 `huizhou_city_v13/source/buildings/` 恢复，原始归档成员与来源记录保留在来源清单中。上述文件的内容、节点及属性未发现用户指定的 `Sxx-Bxx` 编号；这项筛选仅说明未发现该标记，不代替来源授权证明。

## 建议章节

适合作为第三章《借你一会儿》的补给线街区段：街口观察通路 → 旧街绕侧推进 → 高架旁与点点协作 → 补给出口。完整工程机 Boss 场地可接在后续装卸场，当前街区无需改动楼位与路网。

当前交付为静态城市资产；游戏碰撞、导航、敌人、协作装置及剧情触发器尚未配置。

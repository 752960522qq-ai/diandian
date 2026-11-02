# 第三章城市 · 构件修复与轻量化版

本轮修正建筑的实际几何歪曲：四款楼体、11处实例的窗框、窗栏、阳台护栏、屋顶护栏、檐口和外置楼梯扶手已局部重建。建筑主体比例、原点、楼位、地脚、主轴和整体包围盒保持不变，继续使用各楼体原材质与原贴图。

## 本轮修复与压缩

- `old_apartment_13`（3处）：清除窗洞与阳台中的三角薄片，重建正面窗栅、3处侧窗、阳台护栏及窗框、窗面和过梁。
- `historic_building_59`（3处）：重建8组阳台栏杆和屋顶四周护栏，补齐屋顶黑色缺口，校直檐口饰带及阳台底沿。
- `old_building_17`（3处）：重建两层阳台栏杆和屋顶镂空护栏，保留原墩柱、女儿墙、水箱与屋顶房。
- `apartment_building_18`（2处）：重建4段楼梯斜扶手与4处平台护栏，清理重复接头面，保留原踏步和支撑。

全场景三角面从 **3,909,320降至3,593,543（减少8.08%）**。密集窗格的 `office_building_26`、`skyscraper_26`、`modern_office_complex_26` 保留原网格，避免减面改变窗线；新修复的细构件不再减面。其他楼型采用带边界、UV和法线约束的保守简化，并检查同视角渲染。

GLB从 **221.36 MB降至219.27 MB**。147张贴图均保持原分辨率；47张JPEG仅优化熵编码，逐张解码验证像素完全一致。几何位置和UV保持浮点精度，近似重复法线合并的最大角度误差为0.02865°；不依赖额外压缩扩展。Blender工程关闭1024纹理预览上限，预览使用原始贴图和64次采样。

Godot 4.6.3已实际读取GLB并生成场景；节点层级、变换、材质绑定及2,403个原有受保护网格保持一致。详细数据见 `optimization_report.json`、`validation_report.json` 与 `structural_repairs/`。

[四款构件修复预览](city_repair_details.png)（从左到右：楼梯扶手、旧楼阳台与屋顶护栏、骑楼栏杆与檐口、旧公寓窗框与窗栏）。仍保留原有风化和踏步边缘的轻微不规则，本轮未整体重建全部47款楼体。

## 素材与布局来源

本版用 hero_13 的 **47 款不同楼体替换 126 处建筑**：37 款各用 3 次、5 款各用 2 次、5 款各用 1 次。楼型范围按用户最新授权开放，转角楼和带 `Sxx-Bxx` 来源编号的模型继续禁用。同一模型按几何指纹归类，改名、旋转或缩放不另算一款。

51 款原始候选中排除了 `urban+building+facade+10.glb`（`OLDTOWN_Corner_Shop_10`）和 `historic_facade_57b.glb`（街角楼57）；49 款可选素材经体量匹配，实际采用47款。其余2款没有落位。当前场景从用户原始 `city.glb` 构建，避免继承旧版替换物体与贴图。

## 模型与布局

- `city_hero13_detail.glb`：供 Godot 导入的静态场景，贴图内嵌。
- `city_hero13_detail.blend`：可编辑 Blender 工程，楼体按 R001～R126 分组，编辑原点位于原建筑地脚。
- `replacement_manifest.json`：每处原楼体的中心、地脚、包络、主轴与替换来源。
- `asset_selection.json`：来源、文件与几何指纹、实例次数、标记筛选及排除名单。
- `layout_summary.json`：布局对照与场景统计。

原道路、弯道、路口、高架、坡道和保留物件沿用；新楼体维持原包络中心、地脚高度和主轴，平面向内留约2%余量。原城市坐标、原点和整体缩放不变。仅替换可独立识别的楼体，原有超薄背景与特殊结构继续保留；同款楼共享网格。

场景按实例展开共 **3,593,543 个三角面**，147 张贴图全部内嵌且无缺失。布局对照确认 2,276 个受保护原始网格未改变，原物体变换误差为0；GLB中保留126个楼体分组及来源记录，单款最多3处。

当前预览和交付模型均使用原始2K/4K纹理，预览不再限制为1024像素。

## 预览

- [修改后总览](city_after_overview.png) · [原始总览](city_before_overview.png)
- [修改后俯视](city_after_top.png) · [原始俯视](city_before_top.png)
- [街区近景](city_detail_corner.png) · [密集窗格近景](city_detail_street.png)

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

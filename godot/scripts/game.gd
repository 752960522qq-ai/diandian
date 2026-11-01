extends Node3D
const PlayerScript = preload("res://godot/scripts/player.gd")
const EnemyScript = preload("res://godot/scripts/enemy.gd")
const ProjectileScript = preload("res://godot/scripts/projectile.gd")
const SAVE = "user://checkpoint.json"
var weapons: Array
var chapters: Array
var chapter_index := 0
var objective_index := 0
var progress := 0
var mode := "menu"
var player: CharacterBody3D
var companion: Node3D
var world: Node3D
var marker: Node3D
var enemies := []
var ammo := {}
var slots := ["type56", "qsz92"]
var active_slot := 0
var fire_at := 0.0
var reload_until := 0.0
var elapsed := 0.0
var message := ""
var message_time := 0.0
var dialogue: Array = []
var dialogue_index := 0
var dialogue_end := "playing"
var overlay: Control
var hud: Control
var hud_label: Label
var hint: Label
var font: Font = preload("res://godot/assets/Chinese.ttf")

func _ready():
 weapons = JSON.parse_string(FileAccess.get_file_as_string("res://godot/data/weapons.json"))
 chapters = JSON.parse_string(FileAccess.get_file_as_string("res://godot/data/chapters.json"))
 for w in weapons: ammo[w.Id] = [int(w.MagazineSize), int(w.ReserveAmmo)]
 make_ui()
 show_menu()

func material(color: Color, glow := false) -> StandardMaterial3D:
 var m := StandardMaterial3D.new()
 m.albedo_color = color
 if glow:
  m.emission_enabled = true
  m.emission = color
 return m

func box(parent: Node3D, pos: Vector3, size: Vector3, color: Color, solid := true, glow := false) -> Node3D:
 var node: Node3D = StaticBody3D.new() if solid else Node3D.new()
 parent.add_child(node)
 node.position = pos
 var visual := MeshInstance3D.new()
 var mesh := BoxMesh.new()
 mesh.size = size
 visual.mesh = mesh
 visual.material_override = material(color, glow)
 node.add_child(visual)
 if solid:
  var c := CollisionShape3D.new()
  var s := BoxShape3D.new()
  s.size = size
  c.shape = s
  node.add_child(c)
 return node

func label(text: String, size: int) -> Label:
 var l := Label.new()
 l.text = text
 l.add_theme_font_override("font", font)
 l.add_theme_font_size_override("font_size", size)
 l.add_theme_color_override("font_color", Color(0.9, 0.96, 0.93))
 l.add_theme_color_override("font_shadow_color", Color.BLACK)
 l.add_theme_constant_override("shadow_offset_x", 2)
 l.add_theme_constant_override("shadow_offset_y", 2)
 l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
 return l

func make_ui():
 var layer := CanvasLayer.new()
 add_child(layer)
 hud = Control.new()
 hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
 hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
 layer.add_child(hud)
 hud_label = label("", 23)
 hud_label.position = Vector2(30, 25)
 hud_label.size = Vector2(950, 180)
 hud.add_child(hud_label)
 hint = label("", 22)
 hint.position = Vector2(300, 740)
 hint.size = Vector2(1000, 140)
 hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
 hud.add_child(hint)
 var cross := label("+", 34)
 cross.position = Vector2(785, 425)
 hud.add_child(cross)
 overlay = Control.new()
 overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
 layer.add_child(overlay)

func set_mode(value: String):
 mode = value
 hud.visible = value != "menu" and value != "ending"
 Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if value == "playing" else Input.MOUSE_MODE_VISIBLE
 if value == "playing":
  clear_overlay()
  overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE

func clear_overlay():
 for c in overlay.get_children():
  overlay.remove_child(c)
  c.queue_free()

func panel(title: String, subtitle: String):
 clear_overlay()
 overlay.mouse_filter = Control.MOUSE_FILTER_STOP
 var bg := ColorRect.new()
 bg.color = Color(0.025, 0.055, 0.075, 0.97)
 bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
 overlay.add_child(bg)
 var heading := label(title, 54)
 heading.position = Vector2(100, 80)
 heading.size = Vector2(1400, 90)
 overlay.add_child(heading)
 var sub := label(subtitle, 23)
 sub.position = Vector2(105, 175)
 sub.size = Vector2(1320, 100)
 overlay.add_child(sub)

func button(text: String, pos: Vector2, size: Vector2, action: Callable):
 var b := Button.new()
 b.text = text
 b.position = pos
 b.size = size
 b.add_theme_font_override("font", font)
 b.add_theme_font_size_override("font_size", 22)
 b.pressed.connect(action)
 overlay.add_child(b)

func show_menu():
 set_mode("menu")
 panel("点点滴滴  /  刺瑰行动", "第三人称叙事射击 · Godot 4 框架原型\n林叙与点点，从一次并肩突围开始。")
 button("开始新的旅程", Vector2(110, 320), Vector2(370, 65), func(): start_chapter(0))
 if FileAccess.file_exists(SAVE): button("继续上次进度", Vector2(110, 410), Vector2(370, 65), load_checkpoint)
 button("章节试演", Vector2(510, 320), Vector2(300, 65), show_chapters)
 button("退出", Vector2(510, 410), Vector2(300, 65), func(): get_tree().quit())

func show_chapters():
 panel("章节试演", "选择任意章节；各章目前使用同一套几何通道原型。")
 for i in chapters.size():
  var index := i
  button(chapters[i].Title, Vector2(100 + (i % 3) * 470, 300 + int(i / 3) * 105), Vector2(440, 80), func(): start_chapter(index))
 button("返回", Vector2(1180, 100), Vector2(260, 65), show_menu)

func start_chapter(index: int, restored_index := 0, restored_progress := 0, opening := true):
 chapter_index = index
 objective_index = restored_index
 progress = restored_progress
 enemies.clear()
 if is_instance_valid(world):
  remove_child(world)
  world.queue_free()
 world = Node3D.new()
 add_child(world)
 build_world()
 slots[0] = chapters[index].PrimaryWeaponId
 active_slot = 0
 reload_until = 0
 activate_objective()
 if restored_index > 0 and objective_index < chapters[index].Objectives.size():
  player.position = marker.position + Vector3(0, 0, 5)
  companion.position = player.position + Vector3(2, 0, 1)
 if opening:
  save_checkpoint()
  begin_dialogue(chapters[index].OpeningLines, "playing")
 else: set_mode("playing")

func build_world():
 var env := WorldEnvironment.new()
 var environment := Environment.new()
 environment.background_mode = Environment.BG_COLOR
 environment.background_color = Color(0.09, 0.15, 0.19)
 environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
 environment.ambient_light_color = Color(0.55, 0.63, 0.67)
 environment.ambient_light_energy = 0.75
 env.environment = environment
 world.add_child(env)
 var sun := DirectionalLight3D.new()
 sun.rotation_degrees = Vector3(-45, -35, 0)
 world.add_child(sun)
 box(world, Vector3(0, -0.3, -36), Vector3(32, 0.6, 106), Color(0.12, 0.16, 0.18))
 for side in [-1, 1]:
  box(world, Vector3(side * 15.5, 2, -36), Vector3(1, 4, 106), Color(0.16, 0.22, 0.27))
  for z in range(6):
   var h := float(10 + (z * 7 + chapter_index * 3) % 11)
   box(world, Vector3(side * 21, h / 2, -z * 16), Vector3(10, h, 13), Color(0.16, 0.22, 0.27), false)
 for zone in range(6):
  var z := -float(zone * 16)
  box(world, Vector3(-5.5, 0.65, z - 4), Vector3(3.2, 1.3, 1.1), Color(0.28, 0.34, 0.36))
  box(world, Vector3(5.5, 0.65, z - 9), Vector3(3.2, 1.3, 1.1), Color(0.18, 0.23, 0.24))
  box(world, Vector3(-9, 0.5, z - 8), Vector3(1.1, 1, 0.8), Color(1, 0.63, 0.27), true, true).add_to_group("supply")
 player = CharacterBody3D.new()
 player.set_script(PlayerScript)
 world.add_child(player)
 player.position = Vector3(0, 0.2, 0)
 player.setup(self)
 companion = Node3D.new()
 world.add_child(companion)
 companion.position = Vector3(2, 0, 1)
 var body := MeshInstance3D.new()
 var shape := CapsuleMesh.new()
 shape.radius = 0.3
 shape.height = 1.75
 body.mesh = shape
 body.position.y = 0.9
 body.material_override = material(Color(0.65, 0.75, 0.76))
 companion.add_child(body)

func current_objective() -> Dictionary:
 return chapters[chapter_index].Objectives[objective_index]

func activate_objective():
 if objective_index >= chapters[chapter_index].Objectives.size(): return
 if is_instance_valid(marker): marker.queue_free()
 var obj := current_objective()
 marker = Node3D.new()
 world.add_child(marker)
 marker.position = Vector3(-2.5 if objective_index % 2 == 0 else 3.0, 0, -10.0 - objective_index * 14.0)
 if obj.Id == "stay_here": marker.position = companion.position
 box(marker, Vector3(0, 2, 0), Vector3(0.15, 4, 0.15), Color(1, 0.63, 0.27) if obj.Kind == 3 else Color(0.2, 0.85, 0.82), false, true)
 companion.visible = chapters[chapter_index].Id != "prologue" and chapters[chapter_index].Id != "epilogue" and (chapters[chapter_index].Id != "ch01" or objective_index >= 2)
 if obj.Kind == 3:
  for i in int(obj.RequiredCount) - progress:
   var e := CharacterBody3D.new()
   e.set_script(EnemyScript)
   world.add_child(e)
   e.position = marker.position + Vector3((i % 3 - 1) * 4, 0.1, -5 - int(i / 3) * 3)
   e.setup(self, i)
   enemies.append(e)

func report(kind: int, id: String):
 if objective_index >= chapters[chapter_index].Objectives.size(): return
 var obj := current_objective()
 if obj.Kind != kind or obj.Id != id: return
 progress += 1
 if progress >= obj.RequiredCount:
  say(obj.InteractionLine)
  objective_index += 1
  progress = 0
  if objective_index < chapters[chapter_index].Objectives.size(): activate_objective()
  else:
   save_checkpoint()
   begin_dialogue(chapters[chapter_index].ClosingLines, "chapter_complete")
   return
 save_checkpoint()

func enemy_defeated(enemy):
 enemies.erase(enemy)
 report(3, "hostile")

func _process(delta):
 elapsed += delta
 message_time = maxf(0, message_time - delta)
 if mode != "playing": return
 if reload_until > 0 and elapsed >= reload_until:
  var w := current_weapon()
  var state: Array = ammo[w.Id]
  var count: int = mini(int(w.MagazineSize) - state[0], state[1])
  state[0] += count
  state[1] -= count
  reload_until = 0
 if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and current_weapon().FireMode == 1: fire()
 var obj := current_objective()
 var distance := player.global_position.distance_to(marker.global_position)
 if obj.Kind == 0 and distance < 2.5:
  report(0, obj.Id)
  if mode != "playing": return
 var desired: Vector3 = player.global_position + player.global_basis * Vector3(1.4, 0, 2.0)
 if companion.global_position.distance_to(desired) > 1:
  companion.global_position = companion.global_position.move_toward(desired, delta * (3.5 if chapters[chapter_index].Stage >= 5 else 5.5))
 update_hud()

func update_hud():
 var obj := current_objective()
 var w := current_weapon()
 var a: Array = ammo[w.Id]
 var status: String = ["身体校准中", "可以配合", "左肩受损", "等你开路", "接入协作", "陪她慢慢走", "留在她身边"][int(chapters[chapter_index].Stage)]
 hud_label.text = "%s / %s\n目标：%s  %d/%d\n林叙生命：%d    点点：%s\n%s    弹药：%d / %d%s" % [chapters[chapter_index].DayLabel, chapters[chapter_index].Title, obj.Description, progress, obj.RequiredCount, player.health, status, w.DisplayName, a[0], a[1], "  换弹中" if reload_until > 0 else ""]
 var distance := player.global_position.distance_to(marker.global_position)
 var prompt := "前往信标  %d 米" % int(distance)
 if distance < 4 and obj.Kind == 1: prompt = "E  ·  " + obj.Description
 if distance < 4 and obj.Kind == 2: prompt = "Q  ·  两拍提示，一起处理"
 if obj.Kind == 3: prompt = "消灭敌机；光学部位是弱点"
 hint.text = (message + "\n" if message_time > 0 else "") + prompt + "\nE 交互 / 补给    Q 协作    Tab 军械库    Esc 暂停"

func _unhandled_input(event):
 if event is InputEventKey and event.pressed and not event.echo:
  if event.keycode == KEY_ESCAPE:
   if mode == "playing": show_pause()
   elif mode == "pause" or mode == "armory": set_mode("playing")
   return
  if mode != "playing": return
  match event.keycode:
   KEY_TAB: show_armory()
   KEY_1: switch_slot(0)
   KEY_2: switch_slot(1)
   KEY_R: reload_weapon()
   KEY_F5: save_checkpoint(); say("当前任务段已保存")
   KEY_E: interact()
   KEY_Q: cooperate()
 if mode == "playing" and event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed: fire()

func interact():
 var obj := current_objective()
 if player.global_position.distance_to(marker.global_position) < 4 and obj.Kind == 1:
  report(1, obj.Id)
  return
 for supply in get_tree().get_nodes_in_group("supply"):
  if player.global_position.distance_to(supply.global_position) < 2.7:
   for w in weapons: ammo[w.Id] = [int(w.MagazineSize), int(w.ReserveAmmo)]
   player.health = 120
   supply.remove_from_group("supply")
   supply.queue_free()
   say("弹药与生命已补充")
   return

func cooperate():
 if chapters[chapter_index].Stage >= 5:
  say("林叙：别急，我在这里。")
  return
 say("点点：听到两下了。一起。")
 var closest = null
 var best := 28.0
 for enemy in enemies:
  if is_instance_valid(enemy):
   var d: float = enemy.global_position.distance_to(companion.global_position)
   if d < best: best = d; closest = enemy
 if closest: closest.suppressed = 4.0
 var obj := current_objective()
 if obj.Kind == 2 and player.global_position.distance_to(marker.global_position) < 4: report(2, obj.Id)

func current_weapon() -> Dictionary:
 for w in weapons:
  if w.Id == slots[active_slot]: return w
 return weapons[0]

func switch_slot(slot: int):
 active_slot = slot
 reload_until = 0

func reload_weapon():
 var w := current_weapon()
 var a: Array = ammo[w.Id]
 if reload_until == 0 and a[0] < w.MagazineSize and a[1] > 0: reload_until = elapsed + float(w.ReloadSeconds)

func fire():
 var w := current_weapon()
 var a: Array = ammo[w.Id]
 if elapsed < fire_at or reload_until > 0: return
 if a[0] <= 0:
  say("弹匣已空，按 R 换弹")
  return
 a[0] -= 1
 fire_at = elapsed + 1.0 / float(w.ShotsPerSecond)
 var cam: Camera3D = player.camera
 for i in int(w.Pellets):
  var spread: float = float(w.SpreadDegrees) * (0.22 if Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT) else 1.0) * 0.0008
  var screen_point := get_viewport().get_visible_rect().size / 2.0 + Vector2(randf_range(-1, 1), randf_range(-1, 1)) * spread * 900
  var from := cam.project_ray_origin(screen_point)
  var direction := cam.project_ray_normal(screen_point)
  var query := PhysicsRayQueryParameters3D.create(from, from + direction * float(w.Range))
  query.exclude = [player.get_rid()]
  var hit := get_world_3d().direct_space_state.intersect_ray(query)
  var target: Vector3 = hit.position if hit else from + direction * float(w.Range)
  if w.Explosive:
   var projectile := Node3D.new()
   projectile.set_script(ProjectileScript)
   world.add_child(projectile)
   projectile.global_position = player.global_position + Vector3.UP * 1.5 - player.global_basis.z * 0.7
   projectile.setup(self, w, (target - projectile.global_position).normalized())
  else:
   draw_tracer(player.global_position + Vector3.UP * 1.35 - player.global_basis.z * 0.6, target)
   if hit and hit.collider.has_method("damage"):
    hit.collider.damage(float(w.Damage), hit.position)

func draw_tracer(from: Vector3, to: Vector3):
 var mesh := ImmediateMesh.new()
 mesh.surface_begin(Mesh.PRIMITIVE_LINES)
 mesh.surface_add_vertex(from)
 mesh.surface_add_vertex(to)
 mesh.surface_end()
 var tracer := MeshInstance3D.new()
 tracer.mesh = mesh
 tracer.material_override = material(Color(1.0, 0.75, 0.2), true)
 world.add_child(tracer)
 get_tree().create_timer(0.08).timeout.connect(tracer.queue_free)

func say(text: String):
 message = text
 message_time = 5

func show_pause():
 set_mode("pause")
 panel("稍等一会儿", "当前任务在这里等你。")
 button("继续", Vector2(110, 320), Vector2(360, 65), func(): set_mode("playing"))
 button("军械库", Vector2(110, 405), Vector2(360, 65), show_armory)
 button("重试检查点", Vector2(110, 490), Vector2(360, 65), load_checkpoint)
 button("返回主菜单", Vector2(110, 575), Vector2(360, 65), show_menu)

func show_armory():
 set_mode("armory")
 panel("抵抗军军械库", "手枪装备副武器槽，其余装备主武器槽；各枪弹药独立。")
 var names := ["手枪", "步枪", "狙击枪", "冲锋枪", "霰弹枪", "重型武器"]
 for category in 6:
  var heading := label(names[category], 24)
  heading.position = Vector2(45 + category * 255, 280)
  overlay.add_child(heading)
  var row := 0
  for w in weapons:
   if w.Category != category: continue
   var item: Dictionary = w
   button(w.DisplayName, Vector2(45 + category * 255, 325 + row * 85), Vector2(235, 70), func(): equip(item))
   row += 1
 button("返回游戏", Vector2(1200, 100), Vector2(270, 65), func(): save_checkpoint(); set_mode("playing"))

func equip(w: Dictionary):
 active_slot = 1 if w.Category == 0 else 0
 slots[active_slot] = w.Id
 reload_until = 0
 say("已装备：" + w.DisplayName)

func begin_dialogue(lines: Array, next_mode: String):
 dialogue = lines
 dialogue_index = 0
 dialogue_end = next_mode
 set_mode("dialogue")
 show_dialogue()

func show_dialogue():
 panel(chapters[chapter_index].Title, dialogue[dialogue_index])
 button("继续 →", Vector2(110, 360), Vector2(340, 65), next_dialogue)

func next_dialogue():
 dialogue_index += 1
 if dialogue_index < dialogue.size(): show_dialogue()
 elif dialogue_end == "playing": set_mode("playing")
 else: show_chapter_complete()

func show_chapter_complete():
 set_mode("chapter_complete")
 panel(chapters[chapter_index].Title + "  ·  完成", chapters[chapter_index].Summary)
 button("继续往前走", Vector2(110, 360), Vector2(360, 65), func():
  if chapter_index + 1 < chapters.size(): start_chapter(chapter_index + 1)
  else: show_ending())
 button("返回主菜单", Vector2(510, 360), Vector2(360, 65), show_menu)

func show_ending():
 set_mode("ending")
 panel("点点滴滴", "两把椅子和她的名字，都还留在游戏里。\n那些一起经历过的事，已经发生过了。")
 button("返回主菜单", Vector2(110, 380), Vector2(360, 65), show_menu)

func defeat():
 set_mode("defeat")
 panel("再试一次", "从当前检查点重新开始。")
 button("重试", Vector2(110, 360), Vector2(360, 65), load_checkpoint)
 button("返回主菜单", Vector2(510, 360), Vector2(360, 65), show_menu)

func save_checkpoint():
 var f := FileAccess.open(SAVE, FileAccess.WRITE)
 f.store_string(JSON.stringify({"chapter_id": chapters[chapter_index].Id, "objective_index": objective_index, "progress": progress, "primary": slots[0], "sidearm": slots[1]}))

func load_checkpoint():
 var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(SAVE))
 for i in chapters.size():
  if chapters[i].Id == data.chapter_id:
   start_chapter(i, int(data.objective_index), int(data.progress), false)
   slots = [data.primary, data.sidearm]
   if objective_index >= chapters[chapter_index].Objectives.size(): show_chapter_complete()
   return

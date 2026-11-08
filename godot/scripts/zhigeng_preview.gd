extends Node3D

const MODEL := "res://assets/characters/zhigeng/zhigeng_character_animated.glb"
const DEFAULT_MOTION := "Idle" # standing_idle source, exported with the common Idle name.
const MOTION_LABELS := {
	"Idle": "站立待机", "Walk": "走路", "Run": "跑步", "HeadStress": "转头",
	"FiringRifle": "步枪射击",
	"Talking": "交谈", "RifleRun": "持步枪跑", "RifleAimingIdle": "步枪瞄准",
	"RifleIdle": "持步枪待机", "Reloading": "换弹", "PistolIdle": "持手枪待机"
}
const PONYTAIL := preload("res://godot/scripts/zhigeng_ponytail_physics.gd")
const WEAPON_ATTACHMENT := preload("res://godot/scripts/character_weapon_attachment.gd")
const UPLOADED_MOTIONS := preload("res://godot/scripts/uploaded_motion_library.gd")
const SCENE_PROPS := preload("res://godot/scripts/scene_prop_preview.gd")
@export_file("*.glb") var model_path := MODEL
@export_enum("zhigeng", "diandian") var character_id := "zhigeng"
var skeleton: Skeleton3D
var animation: AnimationPlayer
var motion_names: PackedStringArray
var ponytail
var weapon_attachment
var weapon_choice: OptionButton
var camera: Camera3D
var controls_panel: PanelContainer
var motion_grid: GridContainer
var uploaded_motions: Dictionary
var scene_props
var character_view: Array = []
var yaw := 0.0
var pitch := -0.04
var camera_distance := 3.1
var camera_focus := Vector3(0, 0.95, 0)

func _ready() -> void:
	var state := GLTFState.new()
	var document := GLTFDocument.new()
	var error := document.append_from_file(model_path, state)
	assert(error == OK, "Cannot load the character GLB")
	var model := document.generate_scene(state)
	add_child(model)
	var fit: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(WEAPON_ATTACHMENT.CONFIG_PATH)).characters[character_id]
	model.scale *= float(fit.target_height_m) / float(fit.native_height_m)
	skeleton = model.find_children("*", "Skeleton3D", true, false)[0]
	animation = model.find_children("*", "AnimationPlayer", true, false)[0]
	animation.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_PHYSICS
	uploaded_motions = UPLOADED_MOTIONS.install(animation, skeleton, character_id)
	uploaded_motions.merge(UPLOADED_MOTIONS.install(animation, skeleton, character_id, "res://assets/animations/emplacements_r44/"))
	scene_props = SCENE_PROPS.new()
	add_child(scene_props)
	scene_props.configure(model, character_id)
	motion_names = animation.get_animation_list()
	for name in motion_names:
		if uploaded_motions.has(name):
			continue
		animation.get_animation(name).loop_mode = Animation.LOOP_NONE if name.get_file() in ["Reloading", "Talking"] else Animation.LOOP_LINEAR
	animation.play("RifleIdle")
	animation.advance(0)
	skeleton.modifier_callback_mode_process = Skeleton3D.MODIFIER_CALLBACK_MODE_PROCESS_PHYSICS
	weapon_attachment = WEAPON_ATTACHMENT.new()
	skeleton.add_child(weapon_attachment)
	weapon_attachment.configure(skeleton, self, character_id)
	weapon_attachment.select_weapon("hanyang88")
	animation.play("RifleIdle", 0.0)
	animation.advance(0)
	if character_id == "zhigeng":
		ponytail = PONYTAIL.new()
		add_child(ponytail)
		ponytail.configure(skeleton)
	build_stage()
	build_controls()

func play_motion(name: String) -> void:
	weapon_attachment.set_motion(name)
	scene_props.set_motion(name)
	if SCENE_PROPS.TANK_LABELS.has(name):
		if character_view.is_empty():
			character_view = [yaw, pitch]
		animation.stop()
		camera_focus = Vector3(0, 1.5, 0)
		camera_distance = 19.0
		yaw = PI * 0.8
		pitch = 0.24
		update_camera()
		return
	if not character_view.is_empty():
		yaw = character_view[0]
		pitch = character_view[1]
		character_view.clear()
	animation.play(name, 0.0 if uploaded_motions.has(name) else 0.18)
	animation.advance(0)
	if name in ["QJZ89Idle", "QJZ89Aim"]:
		camera_focus = Vector3(0, 0.95, 0.5)
		camera_distance = 4.8
		update_camera()
	elif uploaded_motions.has(name):
		frame_uploaded_motion(name)
	else:
		camera_focus = Vector3(0, 0.95, 0)
		camera_distance = 3.1
		update_camera()
	sync_weapon_choice()
	if ponytail:
		ponytail.reset_motion()

func frame_uploaded_motion(name: String) -> void:
	var clip := animation.get_animation(name)
	var minimum := Vector3(INF, INF, INF)
	var maximum := Vector3(-INF, -INF, -INF)
	for sample in 25:
		animation.seek(clip.length * float(sample) / 24.0, true)
		skeleton.force_update_all_bone_transforms()
		for bone in skeleton.get_bone_count():
			var point := skeleton.global_transform * skeleton.get_bone_global_pose(bone).origin
			minimum = minimum.min(point)
			maximum = maximum.max(point)
	animation.seek(0, true)
	var size := maximum - minimum + Vector3.ONE * 0.3
	camera_focus = (minimum + maximum) * 0.5
	var viewport_size := get_viewport().get_visible_rect().size
	var aspect := viewport_size.x / maxf(1.0, viewport_size.y)
	camera_distance = maxf(size.y, maxf(size.x, size.z) / aspect) / (2.0 * tan(deg_to_rad(camera.fov * 0.5))) + size.z * 0.5
	update_camera()

func build_stage() -> void:
	var environment := WorldEnvironment.new()
	var settings := Environment.new()
	settings.background_mode = Environment.BG_COLOR
	settings.background_color = Color("242b38")
	settings.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	settings.ambient_light_color = Color("e1e7f0")
	settings.ambient_light_energy = 0.7
	environment.environment = settings
	add_child(environment)
	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-35, -25, 0)
	key.light_energy = 1.7
	add_child(key)
	var fill := OmniLight3D.new()
	fill.position = Vector3(-1.5, 1.5, 1.8)
	fill.light_energy = 1.6
	add_child(fill)
	var floor_mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(4, 4)
	floor_mesh.mesh = plane
	var material := StandardMaterial3D.new()
	material.albedo_color = Color("424b5a")
	floor_mesh.material_override = material
	add_child(floor_mesh)
	camera = Camera3D.new()
	camera.fov = 40.0
	camera.near = 0.01
	camera.far = 10.0
	add_child(camera)
	update_camera()

func build_controls() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	controls_panel = PanelContainer.new()
	layer.add_child(controls_panel)
	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 8)
	controls_panel.add_child(layout)
	var weapon_row := HBoxContainer.new()
	layout.add_child(weapon_row)
	var weapon_label := Label.new()
	weapon_label.text = "装备武器"
	weapon_row.add_child(weapon_label)
	weapon_choice = OptionButton.new()
	weapon_choice.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for id in weapon_attachment.config.weapons:
		var item: Dictionary = weapon_attachment.config.weapons[id]
		weapon_choice.add_item(item.display_name)
		weapon_choice.set_item_metadata(weapon_choice.item_count - 1, id)
	for item in [["QJZ89 固定机枪", "qjz89"], ["59D 无人坦克", "type59d"]]:
		weapon_choice.add_item(item[0])
		weapon_choice.set_item_metadata(weapon_choice.item_count - 1, item[1])
	weapon_choice.item_selected.connect(func(index: int):
		var id: String = weapon_choice.get_item_metadata(index)
		if id in ["qjz89", "type59d"]:
			play_motion("QJZ89Idle" if id == "qjz89" else "TankIdle")
			return
		var next_motion: String = weapon_attachment.select_weapon(id)
		play_motion(next_motion)
	)
	weapon_row.add_child(weapon_choice)
	sync_weapon_choice()
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	layout.add_child(scroll)
	motion_grid = GridContainer.new()
	motion_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	motion_grid.add_theme_constant_override("h_separation", 6)
	motion_grid.add_theme_constant_override("v_separation", 6)
	scroll.add_child(motion_grid)
	for name in motion_names:
		if name == "RESET":
			continue
		var button := Button.new()
		button.text = "待机" if character_id == "diandian" and name.get_file() == DEFAULT_MOTION else MOTION_LABELS.get(name.get_file(), name.get_file())
		if uploaded_motions.has(name):
			button.text = uploaded_motions[name].label
		button.custom_minimum_size.y = 40
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(play_motion.bind(name))
		motion_grid.add_child(button)
	for name in SCENE_PROPS.TANK_LABELS:
		var button := Button.new()
		button.text = SCENE_PROPS.TANK_LABELS[name]
		button.pressed.connect(play_motion.bind(name))
		motion_grid.add_child(button)
	var options := HBoxContainer.new()
	layout.add_child(options)
	if ponytail:
		var toggle := CheckButton.new()
		toggle.text = "马尾物理"
		toggle.button_pressed = true
		toggle.toggled.connect(ponytail.set_simulation_enabled)
		options.add_child(toggle)
	for item in [["正面", 0.0], ["背面", PI]]:
		var button := Button.new()
		button.text = item[0]
		button.pressed.connect(func(): yaw = item[1]; update_camera())
		options.add_child(button)
	get_viewport().size_changed.connect(resize_controls)
	resize_controls()

func sync_weapon_choice() -> void:
	if not weapon_choice:
		return
	if scene_props.gun.visible:
		weapon_choice.select(weapon_choice.item_count - 2)
		return
	for index in weapon_choice.item_count:
		if weapon_choice.get_item_metadata(index) == weapon_attachment.selected_weapon:
			weapon_choice.select(index)
			return

func resize_controls() -> void:
	var viewport_size := get_viewport().get_visible_rect().size
	controls_panel.position = Vector2(12, 12)
	controls_panel.size = Vector2(minf(viewport_size.x - 24, 560), minf(viewport_size.y * 0.45, 300))
	motion_grid.columns = 2 if viewport_size.x < 420 else 4

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		yaw -= event.relative.x * 0.008
		pitch = clampf(pitch + event.relative.y * 0.006, -0.6, 0.6)
		update_camera()
	if event is InputEventMouseButton and event.pressed:
		var tank_visible: bool = scene_props.tank != null and scene_props.tank.visible
		var zoom_step := 0.5 if tank_visible else 0.1
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			camera_distance = maxf(0.35, camera_distance - zoom_step)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			camera_distance = minf(40.0 if tank_visible else 6.0, camera_distance + zoom_step)
		update_camera()

func update_camera() -> void:
	var direction := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch))
	camera.position = camera_focus + direction * camera_distance
	camera.look_at(camera_focus)

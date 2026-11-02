extends Node3D

const MODEL := "res://assets/characters/zhigeng/zhigeng_character_animated.glb"
const MOTION_LABELS := {
	"Idle": "待机", "Walk": "走路", "Run": "跑步", "HeadStress": "转头",
	"FiringRifle": "步枪射击", "WomanIdle": "女性待机", "StandingIdle": "站立待机",
	"Talking": "交谈", "RifleRun": "持步枪跑", "RifleAimingIdle": "步枪瞄准",
	"RifleIdle": "持步枪待机", "Reloading": "换弹", "PistolIdle": "持手枪待机"
}
const PONYTAIL := preload("res://godot/scripts/zhigeng_ponytail_physics.gd")
@export_file("*.glb") var model_path := MODEL
var skeleton: Skeleton3D
var animation: AnimationPlayer
var ponytail
var camera: Camera3D
var controls_panel: PanelContainer
var motion_grid: GridContainer
var yaw := 0.0
var pitch := -0.04
var camera_distance := 1.7

func _ready() -> void:
	var state := GLTFState.new()
	var document := GLTFDocument.new()
	var error := document.append_from_file(model_path, state)
	assert(error == OK, "Cannot load the Zhigeng GLB")
	var model := document.generate_scene(state)
	add_child(model)
	skeleton = model.find_children("*", "Skeleton3D", true, false)[0]
	animation = model.find_children("*", "AnimationPlayer", true, false)[0]
	animation.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_PHYSICS
	for name in animation.get_animation_list():
		animation.get_animation(name).loop_mode = Animation.LOOP_NONE if name.get_file() in ["Reloading", "Talking"] else Animation.LOOP_LINEAR
	animation.play("Idle")
	animation.advance(0)
	ponytail = PONYTAIL.new()
	add_child(ponytail)
	ponytail.configure(skeleton)
	build_stage()
	build_controls()

func play_motion(name: String) -> void:
	animation.play(name, 0.18)
	animation.advance(0)
	ponytail.reset_motion()

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
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	layout.add_child(scroll)
	motion_grid = GridContainer.new()
	motion_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	motion_grid.add_theme_constant_override("h_separation", 6)
	motion_grid.add_theme_constant_override("v_separation", 6)
	scroll.add_child(motion_grid)
	for name in animation.get_animation_list():
		if name == "RESET":
			continue
		var button := Button.new()
		button.text = MOTION_LABELS.get(name.get_file(), name.get_file())
		button.custom_minimum_size.y = 40
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(play_motion.bind(name))
		motion_grid.add_child(button)
	var options := HBoxContainer.new()
	layout.add_child(options)
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
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			camera_distance = maxf(0.35, camera_distance - 0.1)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			camera_distance = minf(3.5, camera_distance + 0.1)
		update_camera()

func update_camera() -> void:
	var focus := Vector3(0, 0.53, 0)
	var direction := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch))
	camera.position = focus + direction * camera_distance
	camera.look_at(focus)

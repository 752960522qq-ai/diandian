extends Node3D

const MODEL := "res://assets/characters/zhigeng/zhigeng_character_animated.glb"
const PONYTAIL := preload("res://godot/scripts/zhigeng_ponytail_physics.gd")
@export_file("*.glb") var model_path := MODEL
var skeleton: Skeleton3D
var animation: AnimationPlayer
var ponytail
var camera: Camera3D
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
	for name in ["Idle", "Walk", "Run", "HeadStress"]:
		animation.get_animation(name).loop_mode = Animation.LOOP_LINEAR
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
	var panel := PanelContainer.new()
	panel.position = Vector2(20, 20)
	layer.add_child(panel)
	var buttons := HBoxContainer.new()
	buttons.add_theme_constant_override("separation", 10)
	panel.add_child(buttons)
	for item in [["待机", "Idle"], ["走路", "Walk"], ["跑步", "Run"], ["转头", "HeadStress"]]:
		var button := Button.new()
		button.text = item[0]
		button.pressed.connect(play_motion.bind(item[1]))
		buttons.add_child(button)
	var toggle := CheckButton.new()
	toggle.text = "马尾物理"
	toggle.button_pressed = true
	toggle.toggled.connect(ponytail.set_simulation_enabled)
	buttons.add_child(toggle)
	for item in [["正面", 0.0], ["背面", PI]]:
		var button := Button.new()
		button.text = item[0]
		button.pressed.connect(func(): yaw = item[1]; update_camera())
		buttons.add_child(button)

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

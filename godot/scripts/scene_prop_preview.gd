extends Node3D
## Standing fixed-emplacement operator and driverless 59D preview assets.
const TANK_LABELS := {"TankIdle":"59D 无人待机", "TankTurretAim":"59D 炮塔瞄准", "TankRecoil":"59D 主炮后坐", "TankMGAim":"59D 机枪瞄准", "TankTracks":"59D 履带与车轮"}
const TANK_CLIPS := {"TankTurretAim":"Turret_Aim_Demo", "TankRecoil":"Gun_Recoil", "TankMGAim":"MG_Aim_Demo", "TankTracks":"TankTracks"}
var gun: Node3D
var tank: Node3D
var tank_player: AnimationPlayer
var character_model: Node3D
var authoring: Dictionary
var original_character_scale := Vector3.ONE
var operator_character_scale := Vector3.ONE
var operator_skeleton: Skeleton3D

func import_model(path: String) -> Node3D:
	var document := GLTFDocument.new()
	var state := GLTFState.new()
	assert(document.append_from_file(path, state) == OK, "Cannot load scene prop " + path)
	return document.generate_scene(state)

func configure(model: Node3D, character_id: String) -> void:
	character_model = model
	authoring = JSON.parse_string(FileAccess.get_file_as_string("res://assets/animations/emplacements_r44/" + character_id + "/authoring.json"))
	original_character_scale = model.scale
	var skeleton: Skeleton3D = model.find_children("*", "Skeleton3D", true, false)[0]
	operator_skeleton = skeleton
	skeleton.skeleton_updated.connect(update_operator_mount)
	operator_character_scale = original_character_scale * float(authoring.wrapper.scale[0]) / skeleton.global_basis.get_scale().x
	gun = Node3D.new()
	gun.add_child(import_model("res://assets/weapons/qjz89.glb"))
	add_child(gun)
	var p: Array = authoring.mount.fixed_position_m
	var offset: Array = authoring.wrapper.position
	gun.position = Vector3(p[0] - offset[0], p[1] - offset[1], p[2] - offset[2])
	gun.quaternion = Quaternion(0, 1, 0, 0)
	gun.visible = false

func update_operator_mount() -> void:
	if not gun or not gun.visible:
		return
	var bone := operator_skeleton.find_bone("mixamorig_RightArm")
	var shoulder: Vector3 = operator_skeleton.global_transform * operator_skeleton.get_bone_global_pose(bone).origin
	var offset: Array = authoring.mount.shoulder_offset_weapon_m
	var butt: Array = authoring.weapon.butt_contact
	gun.global_position = shoulder + gun.global_basis * (Vector3(offset[0], offset[1], offset[2]) - Vector3(butt[0], butt[1], butt[2]))

func prepare_tank() -> void:
	if tank:
		return
	tank = import_model("res://assets/vehicles/type59d/type59d.glb")
	add_child(tank)
	tank_player = tank.find_children("*", "AnimationPlayer", true, false)[0]
	var tracks := Animation.new()
	tracks.length = 10.0
	tracks.loop_mode = Animation.LOOP_LINEAR
	for name in ["Track_L_Cycle", "Track_R_Cycle", "Wheels_Forward_Loop"]:
		var source := tank_player.get_animation(name)
		for index in source.get_track_count():
			var target := tracks.add_track(source.track_get_type(index))
			tracks.track_set_path(target, source.track_get_path(index))
			tracks.track_set_interpolation_type(target, source.track_get_interpolation_type(index))
			for cycle in int(round(tracks.length / source.length)):
				for key in source.track_get_key_count(index):
					tracks.track_insert_key(target, cycle * source.length + source.track_get_key_time(index, key), source.track_get_key_value(index, key))
	tank_player.get_animation_library("").add_animation("TankTracks", tracks)

func set_motion(name: String) -> void:
	var is_tank := TANK_LABELS.has(name)
	character_model.visible = not is_tank
	gun.visible = name in ["QJZ89Idle", "QJZ89Aim"]
	character_model.scale = operator_character_scale if gun.visible else original_character_scale
	if not is_tank:
		if tank:
			tank_player.stop()
			tank.visible = false
		return
	prepare_tank()
	tank.visible = true
	tank_player.stop()
	for skeleton in tank.find_children("*", "Skeleton3D", true, false):
		skeleton.reset_bone_poses()
	if TANK_CLIPS.has(name):
		var clip_name: String = TANK_CLIPS[name]
		tank_player.get_animation(clip_name).loop_mode = Animation.LOOP_NONE if name == "TankRecoil" else Animation.LOOP_LINEAR
		tank_player.play(clip_name)
		tank_player.advance(0)

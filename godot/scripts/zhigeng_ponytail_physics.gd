class_name ZhigengPonytailPhysics
extends Node

const CONFIG_PATH := "res://assets/characters/zhigeng/ponytail_physics.json"
var skeleton: Skeleton3D
var simulator: SpringBoneSimulator3D
var config: Dictionary
var collision_nodes: Array[SpringBoneCollisionCapsule3D] = []

func configure(target: Skeleton3D) -> void:
	skeleton = target
	config = JSON.parse_string(FileAccess.get_file_as_string(CONFIG_PATH))
	skeleton.modifier_callback_mode_process = Skeleton3D.MODIFIER_CALLBACK_MODE_PROCESS_PHYSICS
	simulator = SpringBoneSimulator3D.new()
	simulator.name = "ZhigengPonytailSpring"
	skeleton.add_child(simulator)
	simulator.setting_count = 1
	var settings: Dictionary = config.settings
	simulator.set_root_bone_name(0, bone_name(settings.root_bone))
	simulator.set_end_bone_name(0, bone_name(settings.end_bone))
	simulator.set_extend_end_bone(0, true)
	simulator.set_end_bone_direction(0, SkeletonModifier3D.BONE_DIRECTION_PLUS_Y)
	simulator.set_end_bone_length(0, settings.end_bone_length)
	simulator.set_center_from(0, SpringBoneSimulator3D.CENTER_FROM_WORLD_ORIGIN)
	simulator.set_stiffness(0, settings.stiffness)
	simulator.set_drag(0, settings.drag)
	simulator.set_gravity(0, settings.gravity)
	simulator.set_gravity_direction(0, vector(settings.gravity_direction))
	simulator.set_individual_config(0, true)
	for joint in simulator.get_joint_count(0):
		simulator.set_joint_radius(0, joint, settings.joint_radii[joint] + settings.collision_padding)
	for item in config.colliders:
		var collision := SpringBoneCollisionCapsule3D.new()
		collision.name = item.name
		simulator.add_child(collision)
		collision.bone_name = bone_name(item.bone)
		var a := vector(item.a)
		var b := vector(item.b)
		collision.radius = item.radius
		collision.height = a.distance_to(b) + 2.0 * item.radius
		collision.position_offset = (a + b) * 0.5
		collision.rotation_offset = Quaternion(Vector3.UP, (b - a).normalized())
		collision_nodes.append(collision)
	simulator.set_enable_all_child_collisions(0, true)
	simulator.reset()

func bone_name(original: String) -> String:
	# Godot's glTF importer replaces the Mixamo colon with an underscore.
	return original.replace(":", "_")

func set_simulation_enabled(enabled: bool) -> void:
	simulator.active = enabled
	if enabled:
		simulator.reset()

func reset_motion() -> void:
	simulator.reset()

func vector(value: Array) -> Vector3:
	return Vector3(value[0], value[1], value[2])

func collider_world_segment(index: int) -> Array[Vector3]:
	var item: Dictionary = config.colliders[index]
	var bone := skeleton.find_bone(bone_name(item.bone))
	var pose := skeleton.global_transform * skeleton.get_bone_global_pose(bone)
	return [pose * vector(item.a), pose * vector(item.b)]

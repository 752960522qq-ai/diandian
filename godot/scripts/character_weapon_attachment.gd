class_name CharacterWeaponAttachment
extends SkeletonModifier3D

const CONFIG_PATH := "res://assets/weapons/character_attachment.json"
const RIFLE_MOTIONS := ["RifleIdle", "RifleAimingIdle", "FiringRifle", "RifleRun", "Reloading"]
var character_id := "zhigeng"
var motion := "RifleIdle"
var selected_weapon := "qbz95"
var last_rifle := "qbz95"
var config: Dictionary
var character: Dictionary
var skeleton: Skeleton3D
var models: Dictionary = {}
var weapon_stage: Node3D
var right_hand: int
var right_arm: int
var right_forearm: int
var left_shoulder: int
var left_arm: int
var left_forearm: int
var left_hand: int
var spine_upper: int
var head: int
var palm_offset := Vector3.ZERO
var left_palm_offset := Vector3.ZERO
var last_contact_error_m := 0.0
var last_shoulder_assist_degrees := 0.0
var last_right_contact_error_m := 0.0
var last_shoulder_contact_error_m := 0.0

func configure(target: Skeleton3D, stage: Node3D, id: String) -> void:
	skeleton = target
	weapon_stage = stage
	character_id = id
	config = JSON.parse_string(FileAccess.get_file_as_string(CONFIG_PATH))
	character = config.characters[character_id]
	palm_offset = vector(character.palm_offset_native)
	left_palm_offset = vector(character.left_palm_offset_native)
	right_hand = skeleton.find_bone("mixamorig_RightHand")
	right_arm = skeleton.find_bone("mixamorig_RightArm")
	right_forearm = skeleton.find_bone("mixamorig_RightForeArm")
	left_shoulder = skeleton.find_bone("mixamorig_LeftShoulder")
	left_arm = skeleton.find_bone("mixamorig_LeftArm")
	left_forearm = skeleton.find_bone("mixamorig_LeftForeArm")
	left_hand = skeleton.find_bone("mixamorig_LeftHand")
	spine_upper = skeleton.find_bone("mixamorig_Spine2")
	head = skeleton.find_bone("mixamorig_Head")
	for id_value in config.weapons:
		var item: Dictionary = config.weapons[id_value]
		var document := GLTFDocument.new()
		var state := GLTFState.new()
		var error := document.append_from_file(item.path, state)
		assert(error == OK, "Cannot load weapon " + str(id_value))
		var model := document.generate_scene(state)
		model.name = "Equipped_" + str(id_value)
		weapon_stage.add_child(model)
		model.visible = false
		models[id_value] = model
	set_motion(motion)

func select_weapon(id: String) -> String:
	selected_weapon = id
	if config.weapons[id].type == "pistol":
		set_motion("PistolIdle")
	else:
		last_rifle = id
		set_motion(motion if motion in RIFLE_MOTIONS else "RifleIdle")
	return motion

func set_motion(value: String) -> void:
	motion = value.get_file()
	if motion == "PistolIdle":
		selected_weapon = "qsz92"
	elif motion in RIFLE_MOTIONS and selected_weapon == "qsz92":
		selected_weapon = last_rifle
	for id in models:
		models[id].visible = id == selected_weapon and (motion in RIFLE_MOTIONS or motion == "PistolIdle")

func _process_modification() -> void:
	if models.is_empty() or not (motion in RIFLE_MOTIONS or motion == "PistolIdle"):
		return
	var data: Dictionary = config.weapons[selected_weapon]
	var mount: Dictionary = character.mounts[selected_weapon].duplicate()
	mount.merge(character.mounts.get(motion, {}), true)
	mount.merge(mount.get("motions", {}).get(motion, {}), true)
	if mount.has("right_hand_quaternion_offset"):
		var base_hand := skeleton.get_bone_pose_rotation(right_hand)
		skeleton.set_bone_pose_rotation(right_hand, (base_hand * quaternion(mount.right_hand_quaternion_offset)).normalized())
		skeleton.force_update_all_bone_transforms()
	var right_world := world_pose(right_hand)
	var character_scale := skeleton.global_basis.get_scale().x
	var right_offset: Vector3 = vector(mount.palm_offset_native) if mount.has("palm_offset_native") else palm_offset
	var left_offset: Vector3 = vector(mount.left_palm_offset_native) if mount.has("left_palm_offset_native") else left_palm_offset
	var palm := right_world.origin + right_world.basis.orthonormalized() * right_offset * character_scale
	var rotation := (right_world.basis.orthonormalized().get_rotation_quaternion() * quaternion(mount.quaternion_xyzw)).normalized()
	var model_scale := float(mount.get("model_scale", 1.0))
	var gun_basis := Basis(rotation).scaled(Vector3.ONE * model_scale)
	var gun_transform := Transform3D(gun_basis, palm - gun_basis * vector(data.right_grip))
	last_shoulder_contact_error_m = 0.0
	if bool(mount.get("shoulder_contact", false)):
		# Anchor the physical buttpad to the shoulder pocket, then fit both arms.
		var shoulder := world_pose(right_arm).origin
		var across := (world_pose(left_arm).origin - shoulder).normalized()
		var up := (world_pose(head).origin - world_pose(spine_upper).origin).normalized()
		var front := across.cross(up).normalized()
		var pocket := shoulder + up * float(mount.get("shoulder_pocket_drop_m", -0.025)) + front * float(mount.get("shoulder_pocket_forward_m", 0.055))
		gun_transform.origin = pocket - gun_basis * vector(data.butt_contact)
		last_shoulder_contact_error_m = (gun_transform * vector(data.butt_contact)).distance_to(pocket)
	models[selected_weapon].global_transform = gun_transform
	if mount.has("right_hand_quaternion_weapon"):
		var grip_rotation := (rotation * quaternion(mount.right_hand_quaternion_weapon)).normalized()
		var contact_offset := vector(mount.right_contact_offset_native) * character_scale
		var contact: Vector3 = gun_transform * vector(mount.get("right_palm_target_weapon", data.right_palm_surface))
		var wrist_target: Vector3 = contact - Basis(grip_rotation) * contact_offset
		solve_arm(right_arm, right_forearm, right_hand, wrist_target, grip_rotation, mount.get("right_elbow_lift_ratio", null))
		var solved_hand := world_pose(right_hand)
		var actual_contact := solved_hand.origin + solved_hand.basis.orthonormalized() * contact_offset
		last_right_contact_error_m = actual_contact.distance_to(contact)
	else:
		last_right_contact_error_m = (gun_transform * vector(data.right_grip)).distance_to(palm)
	var right_finger_weight := float(mount.get("right_finger_pose_weight", character.get("finger_pose_weight", 0.6)))
	if mount.has("right_finger_directions_weapon"):
		fit_finger_directions("Right", mount.right_finger_directions_weapon, rotation, right_finger_weight)
	if motion in ["FiringRifle", "PistolIdle"] and bool(mount.get("trigger_finger_ik", false)):
		fit_trigger_finger(gun_transform * (vector(data.trigger) + Vector3(0.004, 0.0, 0.0)), right_finger_weight)
	if motion == "Reloading":
		last_contact_error_m = 0.0
		return
	var support_target: Vector3 = gun_transform * vector(mount.get("left_grip", data.left_grip))
	var hand_rotation := world_pose(left_hand).basis.orthonormalized().get_rotation_quaternion()
	if mount.has("left_hand_quaternion_weapon"):
		hand_rotation = (rotation * quaternion(mount.left_hand_quaternion_weapon)).normalized()
	var hand_basis := Basis(hand_rotation)
	var wrist_target := support_target - hand_basis * left_offset * character_scale
	var arm_bones: Array[int] = [left_arm, left_forearm, left_hand]
	var arm_source: Array[Quaternion] = []
	for bone in arm_bones:
		arm_source.append(skeleton.get_bone_pose_rotation(bone))
	assist_shoulder(wrist_target, float(mount.get("shoulder_assist_max_degrees", character.get("shoulder_assist_max_degrees", 8.0))))
	solve_left_arm(wrist_target, hand_rotation)
	var support_weight := float(mount.get("support_pose_weight", character.get("support_pose_weight", 0.85)))
	for index in arm_bones.size():
		var bone := arm_bones[index]
		skeleton.set_bone_pose_rotation(bone, arm_source[index].slerp(skeleton.get_bone_pose_rotation(bone), support_weight).normalized())
	skeleton.force_update_all_bone_transforms()
	var finger_source: Dictionary = {}
	var finger_weight := float(mount.get("support_finger_pose_weight", character.get("finger_pose_weight", 0.6)))
	if mount.has("support_finger_directions_weapon"):
		fit_finger_directions("Left", mount.support_finger_directions_weapon, rotation, finger_weight)
	else:
		for bone_name in mount.get("support_finger_quaternion_offsets", {}):
			var name := "mixamorig_" + str(bone_name).trim_prefix("mixamorig:").trim_prefix("mixamorig_")
			var bone := skeleton.find_bone(name)
			finger_source[bone] = skeleton.get_bone_pose_rotation(bone)
			var offset := quaternion(mount.support_finger_quaternion_offsets[bone_name])
			skeleton.set_bone_pose_rotation(bone, (skeleton.get_bone_pose_rotation(bone) * offset).normalized())
	for bone in finger_source:
		skeleton.set_bone_pose_rotation(bone, finger_source[bone].slerp(skeleton.get_bone_pose_rotation(bone), finger_weight).normalized())
	skeleton.force_update_all_bone_transforms()
	var final_hand := world_pose(left_hand)
	var support_palm := final_hand.origin + final_hand.basis.orthonormalized() * left_offset * character_scale
	last_contact_error_m = support_palm.distance_to(support_target)

func fit_finger_directions(side: String, directions: Dictionary, weapon_rotation: Quaternion, weight: float) -> void:
	var source: Dictionary = {}
	for digit in directions:
		for segment in 3:
			var configured_direction = directions[digit][segment]
			if configured_direction == null:
				continue
			var prefix := "mixamorig_" + side + "Hand" + str(digit)
			var bone := skeleton.find_bone(prefix + str(segment + 1))
			var end := skeleton.find_bone(prefix + str(segment + 2))
			source[bone] = skeleton.get_bone_pose_rotation(bone)
			var current := world_pose(end).origin - world_pose(bone).origin
			rotate_bone_toward(bone, current, weapon_rotation * vector(configured_direction))
	for bone in source:
		skeleton.set_bone_pose_rotation(bone, source[bone].slerp(skeleton.get_bone_pose_rotation(bone), weight).normalized())
	skeleton.force_update_all_bone_transforms()

func fit_trigger_finger(target: Vector3, weight: float) -> void:
	var bones: Array[int] = []
	var points: Array[Vector3] = []
	var lengths: Array[float] = []
	var source: Array[Quaternion] = []
	for segment in 4:
		var bone := skeleton.find_bone("mixamorig_RightHandIndex" + str(segment + 1))
		bones.append(bone)
		source.append(skeleton.get_bone_pose_rotation(bone))
		points.append(world_pose(bone).origin)
		if segment > 0:
			lengths.append(points[segment].distance_to(points[segment - 1]))
	var anchor := points[0]
	for iteration in 8:
		points[3] = target
		for segment in range(2, -1, -1):
			points[segment] = points[segment + 1] + (points[segment] - points[segment + 1]).normalized() * lengths[segment]
		points[0] = anchor
		for segment in range(1, 4):
			points[segment] = points[segment - 1] + (points[segment] - points[segment - 1]).normalized() * lengths[segment - 1]
	for segment in 3:
		var current := world_pose(bones[segment + 1]).origin - world_pose(bones[segment]).origin
		rotate_bone_toward(bones[segment], current, points[segment + 1] - points[segment])
	for segment in 3:
		var bone := bones[segment]
		skeleton.set_bone_pose_rotation(bone, source[segment].slerp(skeleton.get_bone_pose_rotation(bone), weight).normalized())
	skeleton.force_update_all_bone_transforms()

func assist_shoulder(target: Vector3, max_degrees: float) -> void:
	last_shoulder_assist_degrees = 0.0
	var shoulder := world_pose(left_arm).origin
	var elbow := world_pose(left_forearm).origin
	var wrist := world_pose(left_hand).origin
	var arm_reach := shoulder.distance_to(elbow) + elbow.distance_to(wrist) - 0.001
	if shoulder.distance_to(target) <= arm_reach:
		return
	var clavicle := world_pose(left_shoulder)
	var cs := shoulder - clavicle.origin
	var ct := target - clavicle.origin
	var angle := cs.angle_to(ct)
	var cosine := clampf((ct.length_squared() + cs.length_squared() - arm_reach * arm_reach) / (2.0 * ct.length() * cs.length()), -1.0, 1.0)
	var delta := clampf(angle - acos(cosine), 0.0, deg_to_rad(max_degrees))
	if delta < 0.000001:
		return
	var swing := Quaternion.IDENTITY.slerp(Quaternion(cs.normalized(), ct.normalized()), delta / angle)
	set_world_rotation(left_shoulder, (swing * clavicle.basis.orthonormalized().get_rotation_quaternion()).normalized())
	last_shoulder_assist_degrees = rad_to_deg(delta)

func solve_left_arm(target: Vector3, hand_rotation: Quaternion) -> void:
	solve_arm(left_arm, left_forearm, left_hand, target, hand_rotation)

func solve_arm(upper_arm: int, forearm: int, hand: int, target: Vector3, hand_rotation: Quaternion, elbow_lift = null) -> void:
	var shoulder := world_pose(upper_arm).origin
	var elbow := world_pose(forearm).origin
	var wrist := world_pose(hand).origin
	var upper_length := shoulder.distance_to(elbow)
	var lower_length := elbow.distance_to(wrist)
	var reach := target - shoulder
	var distance := clampf(reach.length(), absf(upper_length - lower_length) + 0.0001, upper_length + lower_length - 0.0001)
	var direction := reach.normalized()
	var bend := elbow - shoulder
	if elbow_lift != null:
		# Raise the firing elbow to support the sloped stock without folding the wrist.
		var across := (world_pose(left_arm).origin - world_pose(right_arm).origin).normalized()
		var up := (world_pose(head).origin - world_pose(spine_upper).origin).normalized()
		bend = -across + up * float(elbow_lift)
	bend -= direction * bend.dot(direction)
	if bend.length_squared() < 0.000001:
		bend = skeleton.global_basis.x - direction * skeleton.global_basis.x.dot(direction)
	bend = bend.normalized()
	var along := (upper_length * upper_length - lower_length * lower_length + distance * distance) / (2.0 * distance)
	var height := sqrt(maxf(upper_length * upper_length - along * along, 0.0))
	var desired_elbow := shoulder + direction * along + bend * height
	rotate_bone_toward(upper_arm, elbow - shoulder, desired_elbow - shoulder)
	var current_elbow := world_pose(forearm).origin
	var current_wrist := world_pose(hand).origin
	rotate_bone_toward(forearm, current_wrist - current_elbow, target - current_elbow)
	set_world_rotation(hand, hand_rotation)

func rotate_bone_toward(bone: int, from_direction: Vector3, to_direction: Vector3) -> void:
	var pose := world_pose(bone)
	var swing := Quaternion(from_direction.normalized(), to_direction.normalized())
	set_world_rotation(bone, (swing * pose.basis.orthonormalized().get_rotation_quaternion()).normalized())

func set_world_rotation(bone: int, rotation: Quaternion) -> void:
	var parent := skeleton.get_bone_parent(bone)
	var parent_basis := skeleton.global_basis.orthonormalized()
	if parent >= 0:
		parent_basis = world_pose(parent).basis.orthonormalized()
	var local := (parent_basis.get_rotation_quaternion().inverse() * rotation).normalized()
	skeleton.set_bone_pose_rotation(bone, local)
	skeleton.force_update_all_bone_transforms()

func world_pose(bone: int) -> Transform3D:
	return skeleton.global_transform * skeleton.get_bone_global_pose(bone)

func vector(value: Array) -> Vector3:
	return Vector3(value[0], value[1], value[2])

func quaternion(value: Array) -> Quaternion:
	return Quaternion(value[0], value[1], value[2], value[3])

func _exit_tree() -> void:
	for model in models.values():
		if is_instance_valid(model):
			model.queue_free()

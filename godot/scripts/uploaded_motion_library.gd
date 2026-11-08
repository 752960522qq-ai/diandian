extends RefCounted
## Import the eight animation-only clips onto an existing character skeleton.
## The source library's node paths are remapped; no character mesh is replaced.
const PACK_ROOT := "res://assets/animations/motion_lab_r42/"

static func install(player: AnimationPlayer, skeleton: Skeleton3D, character_id: String, pack_root: String = PACK_ROOT) -> Dictionary:
	var entries: Array = JSON.parse_string(FileAccess.get_file_as_string(pack_root + "catalog.json"))
	var document := GLTFDocument.new()
	var state := GLTFState.new()
	var error := document.append_from_file(pack_root + character_id + "/uploaded_motions.glb", state)
	assert(error == OK, "Cannot load uploaded motion library")
	var imported := document.generate_scene(state)
	var source: AnimationPlayer = imported.find_children("*", "AnimationPlayer", true, false)[0]
	var root := player.get_node(player.root_node)
	var target_path := str(root.get_path_to(skeleton))
	var library := player.get_animation_library("")
	var metadata := {}
	for entry in entries:
		var name: String = entry.name
		assert(not player.has_animation(name), "Uploaded clip must not replace an existing action")
		var clip: Animation = source.get_animation(name).duplicate(true)
		var rotations := {}
		var scales := {}
		# Keep only authored rotations and pelvis travel when remapping node
		# tracks onto the skeleton. Static terminal rotations are omitted by Godot.
		for track in range(clip.get_track_count() - 1, -1, -1):
			var source_path := clip.track_get_path(track)
			var bone_name := str(source_path.get_concatenated_names()).get_file()
			var kind := clip.track_get_type(track)
			if kind != Animation.TYPE_ROTATION_3D and not (bone_name == "mixamorig_Hips" and kind == Animation.TYPE_POSITION_3D) and not (kind == Animation.TYPE_SCALE_3D and bone_name in entry.get("scale_bones", [])):
				clip.remove_track(track)
				continue
			assert(skeleton.find_bone(bone_name) >= 0, "Missing target bone: " + bone_name)
			clip.track_set_path(track, NodePath(target_path + ":" + bone_name))
			if clip.track_get_type(track) == Animation.TYPE_ROTATION_3D:
				rotations[bone_name] = true
			if kind == Animation.TYPE_SCALE_3D:
				scales[bone_name] = true
		# Reintroduce the importer's omitted rest rotations as constant tracks.
		# Explicitly resetting all body bones also prevents pose inheritance when
		# switching from an older clip that animated a normally stationary joint.
		for node in imported.find_children("*", "Node3D", true, false):
			var bone_name := str(node.name)
			if not bone_name.begins_with("mixamorig_") and not bone_name in entry.get("extra_bones", []):
				continue
			if skeleton.find_bone(bone_name) < 0:
				continue
			if not rotations.has(bone_name):
				var track := clip.add_track(Animation.TYPE_ROTATION_3D)
				clip.track_set_path(track, NodePath(target_path + ":" + bone_name))
				clip.rotation_track_insert_key(track, 0.0, node.quaternion)
			if bone_name in entry.get("scale_bones", []) and not scales.has(bone_name):
				var track := clip.add_track(Animation.TYPE_SCALE_3D)
				clip.track_set_path(track, NodePath(target_path + ":" + bone_name))
				clip.scale_track_insert_key(track, 0.0, node.scale)
		clip.loop_mode = Animation.LOOP_LINEAR if entry.loop else Animation.LOOP_NONE
		library.add_animation(name, clip)
		metadata[name] = entry
	imported.free()
	return metadata

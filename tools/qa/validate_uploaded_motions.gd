extends SceneTree
## godot --headless --path . --script tools/qa/validate_uploaded_motions.gd

func _initialize() -> void:
	call_deferred("validate")

func validate() -> void:
	var catalog: Array = JSON.parse_string(FileAccess.get_file_as_string("res://assets/animations/motion_lab_r42/catalog.json"))
	assert(catalog.size() == 8)
	for character_id in ["diandian", "zhigeng"]:
		var scene: PackedScene = load("res://godot/scenes/" + character_id + "_preview.tscn")
		var preview = scene.instantiate()
		root.add_child(preview)
		await process_frame
		var player: AnimationPlayer = preview.animation
		var skeleton: Skeleton3D = preview.skeleton
		assert(preview.uploaded_motions.size() >= 8)
		for entry in catalog:
			assert(player.has_animation(entry.name))
			var clip := player.get_animation(entry.name)
			var expected_tracks := 67 if character_id == "zhigeng" and entry.name == "PistolShooting" else 66
			assert(clip.get_track_count() == expected_tracks, str(entry.name) + " tracks: " + str(clip.get_track_count()))
			assert(clip.loop_mode == (Animation.LOOP_LINEAR if entry.loop else Animation.LOOP_NONE))
			for track in clip.get_track_count():
				var path := clip.track_get_path(track)
				assert(skeleton.find_bone(str(path.get_subname(0))) >= 0)
			preview.play_motion(entry.name)
			assert(preview.camera.global_transform.is_finite())
			for fraction in [0.0, 0.25, 0.5, 0.75, 1.0]:
				player.seek(clip.length * fraction, true)
				skeleton.force_update_all_bone_transforms()
				for bone in skeleton.get_bone_count():
					assert(skeleton.get_bone_global_pose(bone).is_finite())
			assert(preview.weapon_attachment.models["qsz92"].visible == (entry.name == "PistolShooting"))
		print("GODOT_PASS ", character_id, " 8 actions, mapped body/aim tracks, 40 poses")
		preview.queue_free()
		await process_frame
	quit()

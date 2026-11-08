extends SceneTree
## godot --headless --path . --script tools/qa/validate_emplacements_r44.gd

func _initialize() -> void:
	call_deferred("validate")

func validate() -> void:
	for character_id in ["diandian", "zhigeng"]:
		var preview = load("res://godot/scenes/" + character_id + "_preview.tscn").instantiate()
		root.add_child(preview)
		await process_frame
		assert(preview.uploaded_motions.size() == 10)
		for name in ["QJZ89Idle", "QJZ89Aim"]:
			preview.play_motion(name)
			assert(preview.scene_props.gun.visible)
			assert(preview.scene_props.character_model.visible)
			var clip: Animation = preview.animation.get_animation(name)
			assert(clip.get_track_count() == (68 if character_id == "diandian" else 71))
			var max_error := 0.0
			for sample in 31:
				preview.animation.seek(clip.length * float(sample) / 30.0, true)
				preview.skeleton.force_update_all_bone_transforms()
				preview.scene_props.update_operator_mount()
				for side in ["Right", "Left"]:
					var bone: int = preview.skeleton.find_bone("mixamorig_" + side + "Hand")
					var data: Dictionary = preview.scene_props.authoring
					var offset: Array = data.mount[side.to_lower() + "_contact_offset_native"]
					var point: Vector3 = preview.skeleton.global_transform * preview.skeleton.get_bone_global_pose(bone) * Vector3(offset[0], offset[1], offset[2])
					var grip: Array = data.weapon[side.to_lower() + "_grip"]
					var target: Vector3 = preview.scene_props.gun.global_transform * Vector3(grip[0], grip[1], grip[2])
					max_error = maxf(max_error, point.distance_to(target))
				assert(preview.camera.global_transform.is_finite())
			print("GODOT_R44_GRIP ", character_id, " ", name, " ", max_error)
			assert(max_error < 0.006, "Godot fixed gun contact drift")
		for name in preview.scene_props.TANK_LABELS:
			preview.play_motion(name)
			assert(preview.scene_props.tank.visible)
			assert(not preview.scene_props.character_model.visible)
			assert(not preview.scene_props.gun.visible)
			if name != "TankIdle":
				var player: AnimationPlayer = preview.scene_props.tank_player
				var clip := player.get_animation(player.current_animation)
				for fraction in [0.0, 0.25, 0.5, 0.75, 1.0]:
					player.seek(clip.length * fraction, true)
					for skeleton in preview.scene_props.tank.find_children("*", "Skeleton3D", true, false):
						skeleton.force_update_all_bone_transforms()
						for bone in skeleton.get_bone_count():
							assert(skeleton.get_bone_global_pose(bone).is_finite())
		preview.play_motion("PistolShooting")
		assert(not preview.scene_props.tank.visible)
		assert(not preview.scene_props.gun.visible)
		assert(preview.scene_props.character_model.visible)
		assert(preview.weapon_attachment.models["qsz92"].visible)
		for side in ["Left", "Right"]:
			var bone: int = preview.skeleton.find_bone("mixamorig_" + side + "Hand")
			assert(preview.skeleton.get_bone_pose_scale(bone).is_equal_approx(Vector3.ONE * (0.9 if character_id == "diandian" else 1.0)), "Keep baked hand scale after leaving QJZ89")
		preview.weapon_attachment.select_weapon("qbu10")
		for name in ["RifleIdle", "RifleAimingIdle", "FiringRifle", "RifleRun", "Reloading"]:
			preview.play_motion(name)
			preview.animation.play(name, 0.0)
			preview.animation.advance(0)
			assert(preview.weapon_attachment.models["qbu10"].visible)
			var clip: Animation = preview.animation.get_animation(name)
			for sample in 11:
				preview.animation.seek(clip.length * float(sample) / 10.0, true)
				preview.weapon_attachment._process_modification()
				assert(preview.weapon_attachment.models["qbu10"].global_transform.is_finite())
				assert(preview.weapon_attachment.last_right_contact_error_m < 0.006)
				assert(preview.weapon_attachment.last_contact_error_m < 0.012)
		print("GODOT_R44_PASS ", character_id)
		preview.queue_free()
		await process_frame
	quit()

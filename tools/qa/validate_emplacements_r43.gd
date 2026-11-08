extends SceneTree
## godot --headless --path . --script tools/qa/validate_emplacements_r43.gd

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
				for side in ["Right", "Left"]:
					var bone: int = preview.skeleton.find_bone("mixamorig_" + side + "Hand")
					var data: Dictionary = preview.scene_props.authoring
					var offset: Array = data.mount[side.to_lower() + "_contact_offset_native"]
					var point: Vector3 = preview.skeleton.global_transform * preview.skeleton.get_bone_global_pose(bone) * Vector3(offset[0], offset[1], offset[2])
					var grip: Array = data.weapon[side.to_lower() + "_grip"]
					var target: Vector3 = preview.scene_props.gun.global_transform * Vector3(grip[0], grip[1], grip[2])
					max_error = maxf(max_error, point.distance_to(target))
				assert(preview.camera.global_transform.is_finite())
			print("GODOT_R43_GRIP ", character_id, " ", name, " ", max_error)
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
			assert(preview.skeleton.get_bone_pose_scale(bone).is_equal_approx(Vector3.ONE), "Restore original hand scale after leaving QJZ89")
		print("GODOT_R43_PASS ", character_id)
		preview.queue_free()
		await process_frame
	quit()

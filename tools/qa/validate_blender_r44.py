"""Validate the saved editable shoulder-braced scenes, not just the exporter."""
from pathlib import Path
import json
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[2]
results = []
for character in ["diandian", "zhigeng"]:
    folder = root / "assets/animations/emplacements_r44" / character
    bpy.ops.wm.open_mainfile(filepath=str(folder / "motions.blend"))
    armature = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
    mount = bpy.data.objects["QJZ89_Fixed_Standing_Mount"]
    authoring = json.loads((folder / "authoring.json").read_text())
    butt = authoring["weapon"]["butt_contact"]
    butt = Vector((butt[0], -butt[2], butt[1]))
    offset = authoring["mount"]["shoulder_offset_weapon_m"]
    # The fixed gun faces +Z in glTF / -Y in Blender.
    offset = Vector((-offset[0], offset[2], offset[1]))
    maximum = 0.0
    for name in ["QJZ89Idle", "QJZ89Aim"]:
        armature.animation_data.action = bpy.data.actions[name]
        for fraction in [0, .25, .5, .75, 1]:
            frame = armature.animation_data.action.frame_range[1] * fraction
            bpy.context.scene.frame_set(int(frame), subframe=frame % 1)
            bpy.context.view_layer.update()
            actual = mount.matrix_world @ butt
            target = armature.matrix_world @ armature.pose.bones["mixamorig:RightArm"].head + offset
            error = (actual - target).length
            maximum = max(maximum, error)
            assert error < 0.00001, (character, name, frame, error)
    results.append({"character": character, "poses": 10, "max_shoulder_error_m": maximum})
    print("BLENDER_R44_SAVED_SCENE_PASS", character, maximum, flush=True)
(root / "web/motion-labs/verification_r44/blender.json").write_text(json.dumps(results, indent=2) + "\n")

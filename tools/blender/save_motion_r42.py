"""Build editable Blender scenes from the exact R42 runtime animation data.

Run after node tools/gltf/refine_motion_r42.mjs:
    blender -b --python tools/blender/save_motion_r42.py
"""
import copy
import json
import math
from pathlib import Path
import struct

import bpy

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "assets/animations/motion_lab_r42"
WORK = ROOT / "work/motion-r42"


def read_glb(path):
    data = path.read_bytes()
    size = struct.unpack_from("<I", data, 12)[0]
    return json.loads(data[20:20 + size]), data[28 + size:]


def write_glb(path, gltf, binary):
    document = json.dumps(gltf, separators=(",", ":")).encode()
    document += b" " * (-len(document) % 4)
    binary += b"\0" * (-len(binary) % 4)
    data = struct.pack("<III", 0x46546C67, 2, 28 + len(document) + len(binary))
    data += struct.pack("<I4s", len(document), b"JSON") + document
    data += struct.pack("<I4s", len(binary), b"BIN\0") + binary
    path.write_bytes(data)


def merge_for_editing(character, folder):
    model, body = read_glb(ROOT / f"web/motion-labs/{folder}/assets/{character}_fixed.glb")
    library, motion = read_glb(PACK / character / "uploaded_motions.glb")
    assert len(model["buffers"]) == len(library["buffers"]) == 1
    body += b"\0" * (-len(body) % 4)
    view_offset = len(model["bufferViews"])
    accessor_offset = len(model["accessors"])
    for source in library["bufferViews"]:
        view = copy.deepcopy(source)
        view["byteOffset"] = view.get("byteOffset", 0) + len(body)
        model["bufferViews"].append(view)
    for source in library["accessors"]:
        accessor = copy.deepcopy(source)
        assert "sparse" not in accessor
        accessor["bufferView"] += view_offset
        model["accessors"].append(accessor)
    nodes = {node["name"]: index for index, node in enumerate(model["nodes"]) if "name" in node}
    model["animations"] = copy.deepcopy(library["animations"])
    for action in model["animations"]:
        for sampler in action["samplers"]:
            sampler["input"] += accessor_offset
            sampler["output"] += accessor_offset
        for channel in action["channels"]:
            target = channel["target"]
            target["node"] = nodes[library["nodes"][target["node"]]["name"]]
    binary = body + motion
    model["buffers"] = [{"byteLength": len(binary)}]
    merged = WORK / f"{character}-editable.glb"
    write_glb(merged, model, binary)
    return merged


WORK.mkdir(parents=True, exist_ok=True)
catalog = json.loads((PACK / "catalog.json").read_text())
for character, folder in [("diandian", "diandian-classic-motion-lab"), ("zhigeng", "zhigeng-motion-lab")]:
    merged = merge_for_editing(character, folder)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 60
    bpy.ops.import_scene.gltf(filepath=str(merged))
    armature = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
    for action in bpy.data.actions:
        action.name = action.name.removesuffix("_" + armature.name)
    actions = {action.name: action for action in bpy.data.actions}
    assert set(actions) == {entry["name"] for entry in catalog}, list(actions)
    for action in actions.values():
        action.use_fake_user = True
        for curve in action.fcurves:
            assert all(math.isfinite(value) for key in curve.keyframe_points for value in key.co)
    for track in armature.animation_data.nla_tracks:
        track.mute = True
    armature.animation_data.action = actions["WalkingBackwards"]
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = round(actions["WalkingBackwards"].frame_range[1])
    bpy.context.scene.frame_set(0)
    bpy.ops.file.pack_all()
    armature["revision"] = "R42"
    armature["motion_source"] = "Exact imported R42 uploaded_motions.glb; select actions in the Action Editor."
    armature["pistol_base"] = "Original PistolIdle at 0s, shown as PistolAimingIdle in the web preview."
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    output = PACK / character / "motions.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(output), compress=True)
    report = {
        "character": character,
        "blender": bpy.app.version_string,
        "fps": bpy.context.scene.render.fps,
        "body_bones": sum(bone.name.startswith("mixamorig:") for bone in armature.data.bones),
        "actions": {name: {"curves": len(action.fcurves), "frames": list(action.frame_range)} for name, action in actions.items()},
        "source": f"assets/animations/motion_lab_r42/{character}/uploaded_motions.glb",
        "output": str(output.relative_to(ROOT)),
    }
    (PACK / character / "blender_report.json").write_text(json.dumps(report, indent=2) + "\n")
    print("BLENDER_R42_SAVED", character, len(actions), flush=True)

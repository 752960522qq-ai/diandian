"""Persist the existing 90% hand size in the character GLBs and their clips."""
from pathlib import Path
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    "assets/characters/diandian_classic/diandian_classic_fixed.glb",
    "web/motion-labs/diandian-classic-motion-lab/assets/diandian_fixed.glb",
    "web/motion-labs/diandian-classic-motion-lab/assets/diandian_before.glb",
]
report = []
for filename in FILES:
    path = ROOT / filename
    original = path.read_bytes()
    assert original[:4] == b"glTF", f"Hydrate the GLB first: {filename}"
    json_length = struct.unpack_from("<I", original, 12)[0]
    document = json.loads(original[20:20 + json_length])
    if document.get("asset", {}).get("extras", {}).get("hand_scale_baked") == 0.9:
        print("Already baked", filename)
        continue
    backup = ROOT / "work/r44-baseline" / filename
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        backup.write_bytes(original)
    binary = bytearray(original[28 + json_length:])
    hands = {}
    for index, node in enumerate(document["nodes"]):
        if node.get("name") in ["mixamorig:LeftHand", "mixamorig:RightHand"]:
            assert "matrix" not in node
            node["scale"] = [value * 0.9 for value in node.get("scale", [1, 1, 1])]
            node.setdefault("extras", {})["hand_scale_baked"] = 0.9
            hands[index] = node["scale"]
    assert len(hands) == 2
    channels = 0
    for animation in document.get("animations", []):
        for channel in animation["channels"]:
            target = channel["target"]
            if target["node"] not in hands or target["path"] != "scale":
                continue
            # A sampler or output accessor can also serve another bone. Append
            # a private constant scale track, leaving all shared data intact.
            sampler = dict(animation["samplers"][channel["sampler"]])
            count = document["accessors"][sampler["input"]]["count"]
            values = hands[target["node"]] * count
            sampler["interpolation"] = "LINEAR"
            while len(binary) % 4:
                binary.append(0)
            view = len(document["bufferViews"])
            offset = len(binary)
            binary.extend(struct.pack("<" + "f" * len(values), *values))
            document["bufferViews"].append({"buffer": 0, "byteOffset": offset, "byteLength": len(values) * 4})
            sampler["output"] = len(document["accessors"])
            document["accessors"].append({"bufferView": view, "componentType": 5126, "count": count, "type": "VEC3"})
            channel["sampler"] = len(animation["samplers"])
            animation["samplers"].append(sampler)
            channels += 1
    document["buffers"][0]["byteLength"] = len(binary)
    document["asset"].setdefault("extras", {}).update(hand_scale_baked=0.9, hand_scale_revision="R44")
    encoded = json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    result = struct.pack("<4sII", b"glTF", 2, 28 + len(encoded) + len(binary))
    result += struct.pack("<I4s", len(encoded), b"JSON") + encoded
    result += struct.pack("<I4s", len(binary), b"BIN\0") + binary
    path.write_bytes(result)
    report.append({"file": filename, "source_sha256": hashlib.sha256(original).hexdigest(), "sha256": hashlib.sha256(result).hexdigest(), "hand_scale": 0.9, "scale_channels": channels, "geometry_and_skin_inverse_data_preserved": True})
    print("BAKED_HANDS", filename, channels)
if report:
    output = ROOT / "assets/characters/diandian_classic/hand_scale_r44.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")

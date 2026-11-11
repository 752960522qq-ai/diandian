from pathlib import Path
import hashlib,json,shutil
root=Path(__file__).resolve().parent
m=json.loads((root/"manifest.json").read_text())
for r in m["parts"]:
 p=root/r["filename"]
 assert p.stat().st_size==r["bytes"] and hashlib.sha256(p.read_bytes()).hexdigest()==r["sha256"],p
with (root/m["archive_name"]).open("wb") as output:
 for r in m["parts"]:
  with (root/r["filename"]).open("rb") as source:shutil.copyfileobj(source,output)
print(root/m["archive_name"])

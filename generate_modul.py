import json, os, re

base = "/home/vrz1668/Desktop/KB-sasing-26/public/assetMatkul"
out_path = "/home/vrz1668/Desktop/KB-sasing-26/public/data/data-modul.json"

def slug(name):
    m = re.search(r"Modul(\d+)", name, re.I)
    if not m:
        return "Module 00"
    num = int(m.group(1))
    return f"Module {num:02d}"

def title_from_folder(path):
    return os.path.basename(os.path.dirname(path))

modules = []
for root, dirs, files in os.walk(base):
    for fn in sorted(files):
        path = os.path.join(root, fn)
        if not os.path.isfile(path):
            continue
        rel = os.path.relpath(path, base)
        asset = "/assetMatkul/" + rel
        label = slug(fn)
        folder_title = title_from_folder(path)
        desc = f"{label} — {folder_title}"
        modules.append({
            "title": folder_title,
            "description": desc,
            "eyebrow": f"{folder_title} module",
            "label": label,
            "duration": "Self-paced",
            "level": "Foundational",
            "asset": asset,
            "highlights": [label, folder_title, "Learning material"],
        })

modules.sort(key=lambda m: (m["title"], int(re.search(r"\d+", m["label"]).group())))

with open(out_path, "w") as f:
    json.dump(modules, f, indent=3)

print(f"Generated {len(modules)} entries → {out_path}")

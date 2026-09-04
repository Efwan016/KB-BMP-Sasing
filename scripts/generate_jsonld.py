#!/usr/bin/env python3
"""
generate_jsonld.py — Generate JSON-LD Course/LearningResource schema
buat semua modul dari data-modul.json.

Output:
  - public/jsonld-modules.json  : array JSON-LD per modul (Course schema)
  - public/jsonld-course_list.json : ItemList schema berisi semua modul

Schema: https://schema.org/Course
        https://schema.org/LearningResource
        https://schema.org/ItemList

Cocok buat:
  1. Dimasukkin ke index.html sebagai script tambahan
  2. Digunakan oleh App.tsx buat inject JSON-LD per halaman modul yang dibuka

Cara pakai:
    python3 scripts/generate_jsonld.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
DATA_FILE = PUBLIC / "data" / "data-modul.json"
OUTPUT_MODULES = PUBLIC / "jsonld-modules.json"
OUTPUT_LIST = PUBLIC / "jsonld-course_list.json"

BASE_URL = "https://efwan016.github.io/KB-BMP-Sasing"

with open(DATA_FILE, "r", encoding="utf-8") as f:
    modules = json.load(f)

# Pemetaan mata kuliah ke mata pelajaran yang lebih deskriptif
SUBJECT_MAP = {
    "Basic_Reading": "Basic Reading",
    "Basic_Writting": "Basic Writing",
    "Bahasa_Indonesia": "Bahasa Indonesia",
    "PKN": "Pendidikan Kewarganegaraan (PKN)",
    "Cybermedia": "Cybermedia",
    "Pancasila": "Pancasila",
}

courses = []
for mod in modules:
    title = mod.get("title", "").replace("_", " ")
    subject = SUBJECT_MAP.get(mod.get("title", ""), title)

    course = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": f"{title} Modul {mod.get('label', '')}".strip(),
        "description": mod.get("description", ""),
        "provider": {
            "@type": "Organization",
            "name": "Universitas Terbuka — KB-BMP Sasing",
            "url": BASE_URL,
        },
        "courseCode": mod.get("label", ""),
        "courseMode": "Self-paced",
        "educationalLevel": "Foundational",
        "inLanguage": "id",
        "teaches": subject,
        "hasPart": {
            "@type": "LearningResource",
            "name": f"Modul {mod.get('label', '')} — {title}",
            "learningResourceType": "Text",
            "url": f"{BASE_URL}{mod.get('asset', '')}",
            "inLanguage": "id",
        },
        "url": f"{BASE_URL}/?module={mod.get('label', '')}",
    }
    courses.append(course)

# Write per-modul JSON
with open(OUTPUT_MODULES, "w", encoding="utf-8") as f:
    json.dump(courses, f, indent=2, ensure_ascii=False)

# Write ItemList (semua modul dalam satu list)
item_list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": [
        {
            "@type": "ListItem",
            "position": i + 1,
            "url": c["url"],
            "name": c["name"],
        }
        for i, c in enumerate(courses)
    ],
    "numberOfItems": len(courses),
}

with open(OUTPUT_LIST, "w", encoding="utf-8") as f:
    json.dump(item_list, f, indent=2, ensure_ascii=False)

print(f"JSON-LD modules generated: {OUTPUT_MODULES} ({len(courses)} moduls)")
print(f"JSON-LD ItemList generated: {OUTPUT_LIST}")

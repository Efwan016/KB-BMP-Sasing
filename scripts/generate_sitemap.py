#!/usr/bin/env python3
"""
generate_sitemap.py — Generate sitemap.xml dinamis dari data-modul.json + aset PDF.

Cocok buat dijalankan sebelum deploy GitHub Pages / Vercel, atau via CI.
Output: public/sitemap.xml

Cara pakai:
    python3 scripts/generate_sitemap.py

Atau via npm (kalau udah dimasukin ke package.json):
    npm run sitemap
"""

import json
import os
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
DATA_FILE = PUBLIC / "data" / "data-modul.json"
OUTPUT = PUBLIC / "sitemap.xml"

BASE_URL = "https://efwan016.github.io/KB-BMP-Sasing"

# Baca data modul
with open(DATA_FILE, "r", encoding="utf-8") as f:
    modules = json.load(f)

# URL root
urls = [{
    "loc": f"{BASE_URL}/",
    "lastmod": datetime.date.today().isoformat(),
    "changefreq": "weekly",
    "priority": "1.0",
}]

# URL tiap modul PDF
seen = set()
for mod in modules:
    asset_path = mod.get("asset", "")
    if not asset_path:
        continue
    # Normalisasi: apus leading slash biar clean, tapi gas diulang
    loc = f"{BASE_URL}{asset_path}"
    if loc in seen:
        continue
    seen.add(loc)
    urls.append({
        "loc": loc,
        "lastmod": mod.get("lastmod", datetime.date.today().isoformat()),
        "changefreq": "monthly",
        "priority": "0.8",
    })

# Build XML
lines = []
lines.append('<?xml version="1.0" encoding="UTF-8"?>')
lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
for u in urls:
    lines.append('  <url>')
    lines.append(f'    <loc>{u["loc"]}</loc>')
    lines.append(f'    <lastmod>{u["lastmod"]}</lastmod>')
    lines.append(f'    <changefreq>{u["changefreq"]}</changefreq>')
    lines.append(f'    <priority>{u["priority"]}</priority>')
    lines.append('  </url>')
lines.append('</urlset>')

xml = "\n".join(lines) + "\n"

# Write ke public/sitemap.xml
with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write(xml)

print(f"Sitemap generated: {OUTPUT} ({len(urls)} URLs)")

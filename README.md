# KB-BMP-Sasing

Kumpulan modul pembelajaran Bahasa Inggris: Basic Writing dan Basic Reading untuk mahasiswa Sasing Ganjil 26.

Platform belajar mandiri berbasis React 19 + Vite 5 + TypeScript. Menyediakan akses bahan ajar berupa PDF dan latihan soal interaktif (pilihan ganda, isian singkat, essay, aplikasi konteks) untuk 6 mata kuliah.

## Link Penting

- **Aplikasi langsung**: https://efwan016.github.io/KB-BMP-Sasing/
- **Repo**: https://github.com/Efwan016/KB-BMP-Sasing

## Fitur

- Menjelajahi modul berdasarkan mata kuliah dan nomor modul.
- Membuka atau mengunduh bahan ajar dalam format PDF.
- Mengerjakan latihan soal dengan 30 soal per modul.
- Mendukung pilihan ganda, isian singkat, essay, dan aplikasi konteks.
- Menampilkan progres jumlah soal yang sudah dijawab.
- Menghitung nilai otomatis untuk pilihan ganda dan aplikasi konteks.
- Menampilkan kunci jawaban dan penjelasan setelah latihan selesai.
- Menyimpan riwayat modul yang pernah dibuka di browser.
- Mendukung light mode dan dark mode.
- Tampilan responsif untuk desktop dan perangkat mobile.

## Teknologi

- React 19
- TypeScript
- Vite 5
- Tailwind CSS 4
- @vercel/analytics (opsional)
- localStorage (riwayat baca + tema)

## Mata Kuliah

6 mata kuliah, masing-masing 1–9 modul:

- **Basic_Reading** (9 modul)
- **Basic_Writting** (9 modul)
- **Bahasa_Indonesia** (6 modul)
- **PKN** (6 modul)
- **Cybermedia** (9 modul)
- **Pancasila** (6 modul)

## Cara Menjalankan Secara Lokal

### Prasyarat

- Node.js >= 20
- npm

### Instalasi

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Aplikasi tersedia di http://localhost:5173.

### Build

```bash
npm run build
```

Output ada di folder `dist/`.

### Preview Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Struktur Data

- Data katalog modul: `public/data/data-modul.json`
- Data latihan soal: `public/data/latihan_soal_*.json`
- Aset PDF: `public/assetMatkul/`

## SEO & Distribusi

### GitHub Pages

Aplikasi di-deploy ke GitHub Pages lewat GitHub Actions.

**Enable GitHub Pages** (kalau belum):

1. Buka repo di GitHub → Settings → Pages
2. Source: **GitHub Actions** (workflow `ci.yml` sudah handle deploy ke `gh-pages` branch)
3. Atau pilih Branch: `gh-pages` (kalau workflow belum jalan)

Setelah di-deploy, akses lewat:

```
https://efwan016.github.io/KB-BMP-Sasing/
```

### Sitemap

Sitemap di-generate secara dinamis lewat script `scripts/generate_sitemap.py`. Output: `public/sitemap.xml`.

Jalankan sebelum build:

```bash
python3 scripts/generate_sitemap.py
```

### JSON-LD Structured Data

Script `scripts/generate_jsonld.py` menghasilkan:

- `public/jsonld-modules.json` — array Course schema per modul
- `public/jsonld-course_list.json` — ItemList schema seluruh modul

Jalankan sebelum build:

```bash
python3 scripts/generate_jsonld.py
```

File JSON-LD bisa diintegrasikan ke `index.html` (bikin script tambahan di head) untuk dirender oleh search engine.

### robots.txt

Sudah disediakan di `public/robots.txt`. Mengizinkan semua crawler, kecuali folder `assetMatkul/` dan `data/`.

## Project Structure

```
.
├── public/
│   ├── assetMatkul/     # PDF modul per mata kuliah
│   ├── data/            # data-modul.json + latihan_soal_*.json
│   ├── index.html       # template HTML (Vite entry)
│   ├── robots.txt
│   └── sitemap.xml     # di-generate oleh script
├── src/
│   ├── component/       # React components
│   ├── App.tsx          # root + routing + state
│   ├── index.css        # global styles + theme
│   └── types.ts         # type definitions
├── scripts/
│   ├── generate_sitemap.py
│   └── generate_jsonld.py
├── .github/workflows/
│   └── ci.yml          # lint + build + deploy GitHub Pages
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Catatan

- Riwayat modul dan preferensi tema disimpan di `localStorage`.
- Navigasi pakai hash URL (`#module-detail=...`, `#quiz=...`).
- Essay dan isian singkat tidak diberi nilai otomatis.
- Semua konten dan aset di-drive dari file JSON di `public/data/`. Jangan hardcode.

## Lisensi

Project ini tersedia untuk keperluan pembelajaran. Kursus dan modul bersifat edukatif.

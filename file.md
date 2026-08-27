# Web: KB Sasing Ganjil 26

Website interaktif berbasis React 19 + Vite 5 + TypeScript. Tema: "read with intention" — platform pembelajaran modul (reading, writing, PKN, Bahasa Indonesia).

## Tech Stack

- **React 19** (SPA, client-side routing via hash)
- **Vite 5** (build tool, dev server)
- **TypeScript** (strict-ish)
- **Tailwind CSS 4** (styling, utility-first)
- **@vercel/analytics** (optional, Vercel integration)
- **localStorage** (client-side reading history)

## Fitur Utama

1. **Halaman Utama (MainContent)**
   - Hero section: headline "Read with intention", visual orbit animation, CTA ke section #module
   - Module section: detail modul pertama (label, format PDF/Self-paced, level Foundational, highlights)
   - Catalog section: daftar modul terkategori (Basic Reading, Basic Writing, PKN, Bahasa Indonesia), search, tombol "Show all"
   - CTA section: tombol "Read module" ke file asset pertama

2. **Halaman Detail (ModuleDetail)**
   - Detail satu modul: badge, label, description, tombol "Open {PDF/DOCX}", highlights grid
   - Related modules: modul sejenis (sama title, beda asset)
   - Back button ke library

3. **Search**
   - Filter real-time berdasarkan title, description, label, level, highlights
   - Placeholder: "Try reading, vocabulary, or module 06"

4. **Reading History (localStorage)**
   - Setiap user yang buka modul → record ke localStorage (`sasing-reading-history`)
   - Format: `{ asset, label, title, timestamp }`
   - Tampilkan di section #module: "Recently read" list, urutan terbaru dulu
   - Batasi 20 item terbaru (pop item tertua kalau kelewatan)
   - Tombol "Clear history" untuk reset

## Struktur Folder

```
.
├── public/
│   ├── assetMatkul/
│   │   ├── Basic_Reading/     (PDF + DOCX + PPTX)
│   │   ├── Basic_Writting/
│   │   ├── PKN/
│   │   └── Bahasa_Indonesia/
│   └── data/
│       └── data-modul.json    # registry 26 modul
├── src/
│   ├── App.tsx                # root: fetch JSON, hash routing, global state
│   ├── App.css                # global styles
│   ├── component/
│   │   ├── Layout.tsx
│   │   ├── Footer.tsx
│   │   ├── Navigation.tsx
│   │   ├── MainContent.tsx    # hero + module-section + catalog + cta
│   │   └── ModuleDetail.tsx   # detail + related
│   └── types.ts               # Module, ReadingHistoryItem
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts (jika ada)
```

## Data: `data-modul.json`

Array of `Module`:

```typescript
type Module = {
  title: string;           // "Basic Reading", "Basic Writing", "PKN", "Bahasa Indonesia"
  description: string;
  eyebrow: string;         // "English learning module", "Indonesian language module", dll
  label: string;           // "Module 01" - "Module 09"
  duration: string;        // "Self-paced"
  level: string;           // "Foundational"
  asset: string;           // path relatif, contoh: "/assetMatkul/Basic_Reading/BasicReading_Modul1_Heri.pdf"
  highlights: string[];    // 3 kata kunci
};
```

Penting: `asset` harus cocok dengan file di `public/assetMatkul/`. Kalau ada mismatch, re-run generator atau fix manual.

## Routing

Hash-based (`#module-detail=<encoded-asset>`):

- `openModule(module)` → `window.location.hash = \`module-detail=${encodeURIComponent(module.asset)}\``
- `closeDetail()` → `window.history.back()`
- `useEffect` di App: listen `hashchange` → sinkronisasi `selectedAsset`

## State Global (App.tsx)

- `data: Module[] | null` — fetch `/data/data-modul.json`, fallback ke `fallbackData` (1 modul dummy)
- `searchTerm: string`
- `selectedAsset: string | null` — dari hash
- `readingHistory: ReadingHistoryItem[]` — dari localStorage

## Component: ModuleDetail → Open button

Saat user klik "Open {PDF/DOCX}":
1. Panggil `onRecordRead(module)` → simpan ke localStorage
2. Buka file di tab baru (`target="_blank"`)

## Component: MainContent → section #module

Ganti dari static detail → tampilkan:
- Jika history ada: "Recently read" list (5-10 modul terakhir, tapi kalau lebih dari 20 diminimalin)
- Jika kosong: fallback ke static modul pertama (seperti sebelumnya)
- Tombol "Clear history"

## Data Files

- `public/assetMatkul/` — folder berisi modul asli (PDF/DOCX/PPTX)
  - 4 subfolder: Basic_Reading, Basic_Writting, PKN, Bahasa_Indonesia
  - Total: 26 file (setelah cleanup)
- `public/data/data-modul.json` — registry, jadi satu-persatu dengan folder di atas

## Perintah

```bash
npm run dev       # dev server (Vite)
npm run build     # tsc -b && vite build → dist/
npm run preview   # preview build
npm run lint      # eslint .
```

## Catatan development

- ESLint: hanya lint .ts/.tsx (belum ada style lint untuk CSS)
- Vite build: JS + CSS chunk, asset folder public/ tetap di-copy ke dist/ secara otomatis
- TypeScript strict mode: serendah mungkin, tapi belum full strict (check tsconfig)
- Responsif: belum dicek mobile, tapi Tailwind default-nya responsive-friendly

## Changelog singkat (dari session)

1. Generate `data-modul.json` dari folder `assetMatkul/` (27 → 26 entries setelah cleanup)
2. Ganti teks tombol "View all modules" → "Show all"
3. Tambah fitur reading history (localStorage)
4. Hapus script Python yang nggak dipakai (`check_consistency.py`, `generate_modul.py`)

## TODO

- [ ] Verifikasi semua asset path di JSON masih valid (cek tiap deploy)
- [ ] Mobile responsive check
- [ ] SEO: metadata per halaman (belum ada)
- [ ] Dark mode / theme toggle (optional)
- [ ] Error handling kalau file PDF tidak ada / rusak
- [ ] Pagination / infinite scroll kalau module terlalu banyak (sekarang cuma 26, feel free skip)

===== CATATAN =====
    
    - Jangan hardcode konten, gunakan data JSON
    - Component QuizPage harus bisa handle semua modul (dinamis, berbasis props)
    - Jika project pakai TypeScript strict mode, pastikan types di-definisi dengan benar
    - Kalau ada component yang sudah ada untuk halaman detail modul, tambahkan button di sana, jangan buat dari nol
    
     ===== INFO TAMBAHAN =====
    
    - React + TypeScript project (bukan static HTML)
    - Component-based architecture (bukan file HTML per halaman)
    - Gunakan React Router untuk routing (jika project sudah pakai)
    - Jika project belum pakai React Router, bisa pakai state-based navigation atau query params
    - File JSON soal bisa di-load dengan fetch() atau import langsung (jika pakai bundler seperti Vite/Webpack)
    - Styling: ikuti convention project yang ada (CSS Module, styled-components, Tailwind, atau inline)
    - Responsif: mobile-friendly
    
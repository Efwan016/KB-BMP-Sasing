# Web: KB Sasing Ganjil 26

Website interaktif berbasis React 19 + Vite 5 + TypeScript. Tema: "read with intention" — platform pembelajaran modul (reading, writing, PKN, Bahasa Indonesia, Cybermedia, Pancasila) dengan fitur latihan soal.

## Tech Stack

- **React 19** (SPA, client-side routing via hash)
- **Vite 5** (build tool, dev server)
- **TypeScript** (strict-ish)
- **Tailwind CSS 4** (styling, utility-first)
- **@vercel/analytics** (optional, Vercel integration)
- **localStorage** (client-side reading history + theme persistence)

## Mata Kuliah

6 mata kuliah, masing-masing 1–9 modul:

- **Basic_Reading** (9 modul: Heri, Najwa, Zahra, Syazz, Bayu, Evan, Maria, Putri, Ayu)
- **Basic_Writting** (9 modul: Nillawati, Zaen, Sayu, Ocha, Puput, Kholis, Fauziah, Nillawati, Bayu)
- **Bahasa_Indonesia** (6 modul: Qoni, Lua, Thomas, Kiran, April, Lia)
- **PKN** (6 modul: Kiran, Repita, Evi, Herlin, Fahrezi, Zidan)
- **Cybermedia** (9 modul: hasna, Andra, Satya, Keisya, Medina, Indri, Wendy, Enji, Satya)
- **Pancasila** (6 modul: Rosyid, Atsilah, Fara, Via, Putri, LatifaChairanni)

## Fitur Utama

### 1. Halaman Utama (MainContent)

- Hero section: headline "Read with intention", visual orbit animation, CTA ke section #module
- Module section: detail modul pertama (label, format PDF/Self-paced, level Foundational, highlights)
- Catalog section: daftar modul terkategori (Basic_Reading, Basic_Writting, Bahasa_Indonesia, PKN, Cybermedia), search, tombol "Show all"
- CTA section: tombol "Read module" ke file asset pertama

### 2. Halaman Detail (ModuleDetail)

- Detail satu modul: badge, label, description, tombol:
  - **"Open {PDF}"** → buka file di tab baru + rekam reading history
  - **"Download {PDF}"** → download file
  - **"Latihan Soal"** → buka halaman quiz (`#quiz=...)`
- Related modules: modul sejenis (sama title, beda asset)
- Back button ke library
- Self-paced learning hint

### 3. Halaman Latihan Soal (QuizPage)

- Route: `#quiz=<mataKuliah>/<nomorModul>`
- Load data soal dari `public/data/latihan_soal_<mataKuliah>.json`
- 4 jenis soal:
  - **Bagian A: Pilihan Ganda** (multiple choice)
  - **Bagian B: Isian Singkat** (short answer)
  - **Bagian C: Essay** (uraian)
  - **Bagian D: Aplikasi Konteks** (context application)
- Fitur:
  - Tampilkan/sembunyikan kunci jawaban
  - Cetak (window.print)
  - Nilai otomatis untuk soal objektif (PG + Aplikasi Konteks)
  - Progress: "X dari Y soal terjawab"
  - Tombol "Selesai & Lihat Nilai"

### 4. Search

- Filter real-time berdasarkan title, description, label, level, highlights
- Placeholder: "Try reading, vocabulary, or module 06"

### 5. Reading History (localStorage)

- Setiap user yang buka modul → record ke localStorage (`sasing-reading-history`)
- Format: `{ asset, label, title, timestamp }`
- Tampilkan di section #module: "Recently read" list, urutan terbaru dulu
- Batasi 20 item terbaru (pop item tertua kalau kelewatan)
- Tombol "Clear history" untuk reset

### 6. Dark Mode

- Toggle di Navigation (icon ☼/☾)
- Simpan preference di localStorage (`sasing-theme`)
- Fallback ke `prefers-color-scheme` jika belum ada saved theme

## Struktur Folder

```text
.
├── public/
│   ├── assetMatkul/
│   │   ├── Basic_Reading/     (9 PDF)
│   │   ├── Basic_Writting/    (9 PDF)
│   │   ├── Bahasa_Indonesia/  (6 PDF)
│   │   ├── PKN/               (6 PDF)
│   │   ├── Cybermedia/        (9 PDF)
│   │   └── Pancasila/         (6 PDF)
│   ├── data/
│   │   ├── data-modul.json            # registry 45 modul
│   │   ├── latihan_soal_basic_reading.json
│   │   ├── latihan_soal_basic_writting.json
│   │   ├── latihan_soal_bahasa_indonesia.json
│   │   ├── latihan_soal_pkn.json
│   │   ├── latihan_soal_cybermedia.json
│   │   └── latihan_soal_pancasila.json
│   └── thumbnail.png          # og:image
├── src/
│   ├── App.tsx                # root: fetch JSON, hash routing, global state
│   ├── App.css                # global styles
│   ├── component/
│   │   ├── Layout.tsx
│   │   ├── Footer.tsx
│   │   ├── Navigation.tsx     # brand + dark mode toggle
│   │   ├── MainContent.tsx    # hero + module-section + catalog + cta
│   │   ├── ModuleDetail.tsx   # detail + related
│   │   └── QuizPage/
│   │       ├── QuizPage.tsx       # orchestrator soal
│   │       ├── SoalPilihanGanda.tsx
│   │       ├── SoalIsianSingkat.tsx
│   │       ├── SoalEssay.tsx
│   │       ├── SoalAplikasiKonteks.tsx
│   │       └── types.ts          # LatihanSoalData, SoalPG, SoalIsian, SoalEssay, SoalAplikasiKonteks
│   ├── types.ts               # Module, ReadingHistoryItem
│   └── index.css              # CSS variables (theme light/dark)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── file.md                    # dokumentasi ini
```

## Data: `data-modul.json`

Array of `Module`:

```typescript
type Module = {
  title: string;           // "Basic_Reading", "Basic_Writting", "Bahasa_Indonesia", "PKN", "Cybermedia", "Pancasila"
  description: string;     // "Module XX — <title>"
  eyebrow: string;         // "<title> module"
  label: string;           // "Module 01" - "Module 09"
  duration: string;        // "Self-paced"
  level: string;           // "Foundational"
  asset: string;           // path relatif, contoh: "/assetMatkul/Basic_Reading/BasicReading_Modul1_Heri.pdf"
  highlights: string[];    // 3 kata kunci
};
```

Penting: `asset` harus cocok dengan file di `public/assetMatkul/`. Kalau ada mismatch, re-run generator atau fix manual.

## Data Soal: `latihan_soal_*.json`

Masing-masing mata kuliah punya file soal terpisah di `public/data/`. Format:

```typescript
type LatihanSoalData = {
  moduls: Array<{
    modul: number;
    judul: string;
    soal: {
      pilihanGanda: SoalPG[];
      isianSingkat: SoalIsian[];
      essay: SoalEssay[];
      aplikasiKonteks: SoalAplikasiKonteks[];
    };
  }>;
};
```

QuizPage load file berdasarkan mataKuliah dari hash, render 4 bagian soal, hitung nilai otomatis untuk soal objektif.

## Routing

Hash-based:

- `#module-detail=<encoded-asset>` → tampilkan ModuleDetail
- `#quiz=<mataKuliah>/<nomorModul>` → tampilkan QuizPage
- Tanpa hash → tampilkan MainContent

Implementasi di App.tsx:

```typescript
useEffect(() => {
  const syncDetail = () => {
    const hash = window.location.hash;
    if (hash.startsWith("#module-detail=")) {
      setSelectedAsset(decodeURIComponent(hash.replace("#module-detail=", "")));
      setSelectedQuiz(null);
    } else if (hash.startsWith("#quiz=")) {
      // parse mataKuliah + modul dari hash
      setSelectedAsset(null);
      setSelectedQuiz({ mataKuliah, modul, judul });
    } else {
      setSelectedAsset(null);
      setSelectedQuiz(null);
    }
  };
  syncDetail();
  window.addEventListener("hashchange", syncDetail);
  return () => window.removeEventListener("hashchange", syncDetail);
}, []);
```

## State Global (App.tsx)

- `data: Module[] | null` — fetch `/data/data-modul.json`, fallback ke `fallbackData` (1 modul dummy)
- `searchTerm: string`
- `selectedAsset: string | null` — dari hash
- `selectedQuiz: { mataKuliah, modul, judul } | null` — dari hash
- `readingHistory: ReadingHistoryItem[]` — dari localStorage
- `recordRead(module)` — simpan ke localStorage, batasi 20 item
- `clearHistory()` — reset localStorage

## Component: ModuleDetail

Saat user klik tombol:

1. **"Open {PDF}"**: panggil `onRecordRead(module)` → simpan ke localStorage, buka file di tab baru (`target="_blank"`)
2. **"Download {PDF}"**: buka file dengan `download` attribute
3. **"Latihan Soal"**: set hash `#quiz=<mataKuliah>/<nomorModul>`, navigate ke QuizPage

## Component: Navigation

- Brand: "UT" + "BMP UT."
- Link: "Find a module" ke `#modules`
- Dark mode toggle: simpan ke localStorage, apply ke `document.documentElement.dataset.theme`

## Perintah

```bash
npm run dev       # dev server (Vite)
npm run build     # tsc -b && vite build → dist/
npm run preview   # preview build
npm run lint      # eslint .
```

## Catatan Development

- ESLint: hanya lint .ts/.tsx (belum ada style lint untuk CSS)
- Vite build: JS + CSS chunk, asset folder public/ tetap di-copy ke dist/ secara otomatis
- TypeScript strict mode: serendah mungkin, tapi belum full strict (check tsconfig)
- Responsif: belum dicek mobile, tapi Tailwind default-nya responsive-friendly
- QuizPage: handle semua mata kuliah (dinamis, berbasis props), load data soal dari JSON
- ModuleDetail: tombol "Latihan Soal" navigasi ke QuizPage via hash

## Changelog

### 2026-08-27

- Tambah fitur dark mode (Navigation.tsx + localStorage theme)
- Tambah tombol Download PDF di ModuleDetail
- Tambah halaman QuizPage (soal latihan per mata kuliah)
- Tambah file soal latihan: latihan_soal_basic_reading.json, latihan_soal_basic_writting.json, latihan_soal_bahasa_indonesia.json, latihan_soal_pkn.json, latihan_soal_cybermedia.json, latihan_soal_pancasila.json
- Tambah modul Pancasila (6 modul) ke data-modul.json

### 2026-08-26

- Tambah modul PKN dan update Basic Writting
- Tambah CyberMedia file, update data-modul.json, MainContent.tsx
- Tambah fitur download PDF di ModuleDetail

### 2026-08-25

- Tambah reading history (localStorage)
- Update data-modul.json (27 → 45 modul)
- Tambah file.md

### 2026-08-23

- Fix meta tag
- Gunakan public/thumbnail.png sebagai og:image
- Tambah og meta tags + og-image untuk share preview

### 2026-08-22

- Install dan konfigurasi Vercel Web Analytics
- Vercel setting

### 2026-08-21

- Initial commit: KB-BMP-Sasing

## TODO

- [ ] Verifikasi semua asset path di JSON masih valid (cek tiap deploy)
- [ ] Mobile responsive check
- [ ] SEO: metadata per halaman (belum ada)
- [ ] Error handling kalau file PDF tidak ada / rusak
- [ ] Pagination / infinite scroll kalau module terlalu banyak (sekarang cuma 45, feel free skip)
- [ ] Verifikasi semua file soal latihan valid dan match dengan modul di data-modul.json

===== CATATAN =====

- Jangan hardcode konten, gunakan data JSON
- Component QuizPage harus bisa handle semua mata kuliah (dinamis, berbasis props)
- Jika project pakai TypeScript strict mode, pastikan types di-definisi dengan benar
- Kalau ada component yang sudah ada untuk halaman detail modul, tambahkan button di sana, jangan buat dari nol

===== INFO TAMBAHAN =====

- React + TypeScript project (bukan static HTML)
- Component-based architecture (bukan file HTML per halaman)
- Gunakan hash routing (`#module-detail=`, `#quiz=`) — bukan React Router
- File JSON soal bisa di-load dengan fetch() dari public/data/
- Styling: Tailwind CSS 4, ikuti convention project yang ada
- Responsif: mobile-friendly
- Dark mode tersimpan di localStorage (`sasing-theme`)
- Reading history tersimpan di localStorage (`sasing-reading-history`), maks 20 item

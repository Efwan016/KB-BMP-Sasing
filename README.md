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
- Simulasi ujian gabungan per mata kuliah untuk keenam mata kuliah, dengan 30 soal ujian tersendiri, timer, penyimpanan otomatis, guard pelanggaran, dan hasil di Supabase.
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

## Mode Ujian (MVP)

Mode Ujian tersedia satu kali per mata kuliah dan menggabungkan cakupan beberapa modul. Setiap ujian memiliki bank 30 soal pilihan ganda tersendiri, berbeda dari bank Latihan Soal. Konfigurasi jumlah soal, durasi, pengacakan, aturan, dan batas pelanggaran ada pada properti `exam` di modul pertama tiap mata kuliah dalam `public/data/data-modul.json`.

Mode ini memerlukan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Bank latihan dan ujian dimuat dari RPC Supabase, bukan file JSON di `public/data`. Untuk migrasi bank soal, jalankan `supabase/migrations/20261102000000_question_bank_storage.sql` setelah skema ujian dan sesi yang digunakan proyek. Kemudian buat SQL impor lokal dengan `npm run questions:seed-sql` dan salin isi `supabase/question_bank_seed.sql` ke SQL Editor. Bank sumber berada di `supabase/seed/question-banks/` dan kedua lokasi ini diabaikan Git: jangan deploy atau commit data seed. Jika belum diterapkan, jalankan migrasi leaderboard `20261031000000_exam_leaderboard.sql` sebelum `20261101000000_raise_exam_violation_limit.sql`. Setelah migrasi sesi, aktifkan **Allow anonymous sign-ins** di Supabase Dashboard → Authentication → Settings. Tabel bank soal berada di schema `private` dengan akses langsung dicabut. RPC latihan menyajikan bank latihan; RPC ujian hanya menyajikan soal untuk attempt yang terikat ke peserta dan menghapus kunci/penjelasan dari respons. Soal yang sudah dikirim ke browser tetap dapat diamati peserta melalui DevTools/network. RPC ujian juga menerbitkan ID attempt dan waktu mulai/kedaluwarsa, memvalidasi pelanggaran, menghitung skor di server, serta mewajibkan sesi Supabase yang terikat ke peserta. Login dibatasi di server per sesi anonim, ditambah rate limit Auth per IP. Batas pelanggaran untuk keenam ujian mata kuliah adalah lima.

Hasil ujian bisa diunduh sebagai JSON atau dicetak/disimpan ke PDF. Leaderboard tersedia per mata kuliah dan menampilkan nama samaran, skor terbaik, serta durasi 10 peserta teratas; NIM tidak dipublikasikan. Pemantauan kamera/mikrofon meminta izin sebelum ujian, menganalisis perubahan gambar dan tingkat suara di perangkat, serta tidak merekam, menyimpan, atau mengunggah media mentah. Sensor hanya memberi peringatan dan tidak otomatis dihitung sebagai pelanggaran karena gerakan/suara normal dapat memicu deteksi; sensor tidak mengenali identitas orang, foto, kata, atau sumber suara. Lima pelanggaran guard ujian yang dicatat server menghentikan ujian. Nilai lokal yang belum tersinkron masih bersifat sementara; nilai tersimpan dihitung oleh RPC Supabase. Form login tetap memakai nama sebagai username dan NIM sebagai password. Sesi Auth mengikat panggilan RPC ke peserta dan mengurangi pemalsuan payload, tetapi pasangan nama+NIM bukan bukti identitas yang kuat: siapa pun yang mengetahui keduanya masih dapat mencoba masuk, dan sesi anonim tidak memverifikasi kepemilikan identitas. Kunci ujian tidak dikirim sebelum attempt, tetapi soal yang disajikan ke browser dapat diamati peserta aktif. Jangan gunakan Mode Ujian untuk penilaian resmi sampai autentikasi peserta yang lebih kuat dan penyajian bank soal privat dituntaskan. Jangan pernah menggunakan service role key di frontend.

## Struktur Data

- Data katalog modul: `public/data/data-modul.json`
- Data latihan dan ujian lokal untuk impor: `supabase/seed/question-banks/` (diabaikan Git, bukan aset build)
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
│   ├── data/            # katalog data-modul.json
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

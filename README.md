# BMP Sasing

Platform belajar mandiri untuk mengakses bahan ajar dan latihan soal Sastra Inggris Universitas Terbuka.

## Akses Aplikasi

Kunjungi aplikasi melalui [bmpsasing.adzanitech.web.id](https://bmpsasing.adzanitech.web.id).

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

## Alur Penggunaan

1. Buka [bmpsasing.adzanitech.web.id](https://bmpsasing.adzanitech.web.id).
2. Cari mata kuliah atau modul menggunakan kolom pencarian.
3. Pilih **View module** untuk melihat detail modul.
4. Dari halaman detail, buka atau unduh PDF, atau pilih **Latihan Soal**.
5. Jawab soal, kemudian pilih **Selesai & Lihat Nilai**.
6. Periksa nilai otomatis, kunci jawaban, dan penjelasan yang tersedia.

Setiap modul berisi 30 soal. Nilai otomatis dihitung dari soal pilihan ganda dan aplikasi konteks. Soal isian singkat dan essay tetap tersedia untuk latihan, tetapi perlu diperiksa secara manual.

## Teknologi

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Vercel Analytics

## Menjalankan Secara Lokal

### Prasyarat

- Node.js versi 20 atau lebih baru
- npm

### Instalasi

```bash
npm install
```

### Development server

```bash
npm run dev
```

Aplikasi tersedia di `http://localhost:5173`.

### Validasi dan build

```bash
npm run lint
npm run build
```

Untuk menjalankan hasil build secara lokal:

```bash
npm run preview
```

## Struktur Data

Data katalog modul berada di `public/data/data-modul.json`.

Data latihan soal berada di `public/data/latihan_soal_*.json`.

Bahan ajar PDF dan aset modul berada di `public/assetMatkul/`.

## Struktur Utama Project

```text
src/
├── component/
│   ├── MainContent.tsx
│   ├── ModuleDetail.tsx
│   ├── Navigation.tsx
│   └── QuizPage/
├── App.tsx
├── App.css
├── index.css
└── types.ts
public/
├── assetMatkul/
└── data/
```

## Catatan

- Riwayat modul dan preferensi tema disimpan menggunakan `localStorage` pada browser pengguna.
- Aplikasi menggunakan hash URL untuk navigasi detail modul dan latihan soal.
- Essay dan isian singkat tidak diberi nilai otomatis karena membutuhkan penilaian berdasarkan konteks jawaban.

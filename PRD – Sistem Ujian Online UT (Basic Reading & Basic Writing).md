# PRD – Mode Ujian Online di KB-BMP-Sasing

**Matkul:** 6 matkul (Basic Reading, Basic Writing, Bahasa Indonesia, PKN, Cybermedia, Pancasila), Sasing Ganjil 26 **Versi:** 0.3 (Draft) | **Tanggal:** 25 Oktober 2026 | **Status:** Draft untuk review

Mode Ujian menambahkan simulasi ujian berwaktu ke aplikasi KB-BMP-Sasing untuk 6 matkul dan 45 modul yang sudah ada. Peserta cukup mendaftar dengan nama dan NIM, hasil disimpan di Supabase, dan ada larangan dengan sistem 3 kali pelanggaran yang berujung submit otomatis dan cooldown 4 jam, termasuk pelanggaran membuka tab lain.

## 1. Konteks Aplikasi Saat Ini

Berdasarkan [README repo](https://github.com/Efwan016/KB-BMP-Sasing), aplikasi ini adalah platform belajar mandiri yang terbuka untuk semua orang tanpa login:

- **Stack:** React 19, Vite 5, TypeScript, Tailwind CSS 4; deploy ke GitHub Pages dan Vercel.
- **Konten:** dibaca dari `public/data/data-modul.json` dan `public/data/latihan_soal_*.json`; PDF di `public/assetMatkul/`. README menegaskan konten tidak boleh di-hardcode.
- **Latihan soal:** 30 soal per modul; tipe pilihan ganda, isian singkat, essay, dan aplikasi konteks; nilai otomatis hanya untuk pilihan ganda dan aplikasi konteks; kunci dan penjelasan tampil setelah selesai.
- **State:** riwayat modul dan tema di `localStorage`; navigasi lewat hash URL (`#module-detail=...`, `#quiz=...`).

**Asumsi PRD ini:** Mode Ujian adalah simulasi/tryout untuk latihan, bukan pengganti ujian resmi UT. Mode Latihan yang ada tetap terbuka tanpa daftar; hanya Mode Ujian yang meminta identitas.

## 2. Tujuan, Non-Tujuan, dan Metrik

**Tujuan**

- Menambah mode ujian berwaktu di atas latihan soal yang ada, tanpa mengubah mode Latihan.
- Peserta teridentifikasi sederhana lewat nama dan NIM, dan hasilnya tersimpan permanen di Supabase.
- Menerapkan larangan dengan pelanggaran yang transparan, berujung cooldown 4 jam bila dilanggar berulang.
- Mengikuti pola yang sudah ada: konfigurasi ujian dari file JSON, bisa diperbarui tanpa mengubah kode.

**Non-tujuan (v1)**

- Login dengan kata sandi dan proctoring kamera; identitas cukup nama dan NIM.
- Penilaian otomatis essay dan isian singkat (tetap manual atau self-check dengan kunci).
- Menjamin anti-curang penuh; v1 bersifat edukatif (lihat bagian 8).

**Metrik sukses**

- 100% pelanggaran buka tab tercatat dengan waktu dan durasi.
- Kurang dari 2% pelanggaran palsu (mis. notifikasi sistem) pada uji internal.
- 0 jawaban hilang saat refresh, tab tertutup, atau koneksi putus sementara.
- Cooldown tidak bisa dilewati dengan hapus cache atau ganti browser (dicek di server).
- Modul atau matkul baru dapat dipakai di Mode Ujian hanya dengan menambah JSON.

## 3. Cakupan Matkul

Mode Ujian berlaku untuk semua matkul di katalog. Jumlah modul diambil dari README; total soal dihitung dari 30 soal per modul.

| Matkul | Modul | Total soal latihan |
| --- | --- | --- |
| Basic Reading | 9 | 270 |
| Basic Writing (folder `Basic_Writting`) | 9 | 270 |
| Bahasa Indonesia | 6 | 180 |
| PKN | 6 | 180 |
| Cybermedia | 9 | 270 |
| Pancasila | 6 | 180 |
| **Total** | **45** | **1.350** |

**Tipe soal ujian dan penilaian (MVP)**

- Ujian menggunakan 30 soal pilihan ganda baru per matkul, dinilai otomatis. Bank ujian tidak memakai ulang soal latihan.
- Isian singkat dan essay tetap tersedia hanya di Mode Latihan; tidak termasuk bank ujian MVP.

**Cara ujian dibentuk (keputusan)**

- **Satu ujian per matkul:** cakupan menggabungkan materi beberapa modul pada matkul tersebut; peserta tidak memilih modul ujian.
- Setiap ujian berisi 30 soal pilihan ganda yang disusun khusus untuk ujian dan berbeda dari bank Latihan Soal. Soal mencakup modul-modul matkul secara merata sejauh memungkinkan.
- Durasi default 60 menit; jumlah soal, pengacakan, aturan, batas pelanggaran, dan lama cooldown diatur di JSON, bukan di kode.

## 4. Alur Ujian

1. **Daftar atau masuk:** peserta baru mengisi form daftar (nama dan NIM); peserta yang sudah terdaftar cukup memasukkan NIM dan nama. Tanpa password.
2. **Pilih ujian:** memilih salah satu dari enam matkul dan menekan **Ujian Mata Kuliah**; ujian mencakup materi lintas modul.
3. **Cek persiapan:** pengecekan cooldown (tombol mulai nonaktif jika masih berlaku), ukuran layar, dukungan fullscreen, dan pemberitahuan bahwa jawaban sementara tersimpan di perangkat dan hasil akhir dikirim ke Supabase.
4. **Halaman aturan:** daftar larangan dan konsekuensinya; wajib centang persetujuan sebelum mulai.
5. **Ujian berjalan:** timer mundur, mode layar penuh aktif, jawaban tersimpan otomatis, penghitung pelanggaran (mis. 1/3) tampil di header.
6. **Pelanggaran** memunculkan modal peringatan dan langsung dicatat ke server (bagian 5).
7. **Selesai:** submit manual, waktu habis, atau otomatis pada pelanggaran ketiga (disusul cooldown 4 jam).
8. **Hasil:** skor otomatis, status soal yang menunggu penilaian, kunci dan penjelasan, serta ringkasan pelanggaran. Hasil muncul di riwayat peserta.

## 5. Larangan, Pelanggaran, dan Cooldown

Pelanggaran dihitung per ujian. Pada pelanggaran ketiga ujian otomatis di-submit dan peserta kena cooldown 4 jam. Batas dan lama cooldown bisa diubah per ujian lewat JSON.

| Kode | Larangan | Cara deteksi di browser | Dihitung pelanggaran |
| --- | --- | --- | --- |
| L-01 | **Membuka tab, jendela, atau aplikasi lain** | `visibilitychange`, `window.blur`, `document.hidden` | Ya |
| L-02 | Keluar dari mode layar penuh | `fullscreenchange` | Ya |
| L-03 | Copy, cut, paste, klik kanan, dan blok teks di area soal | event `copy`, `cut`, `paste`, `contextmenu` | Tidak, hanya peringatan |
| L-04 | Membuka DevTools atau melihat sumber halaman | shortcut (F12, Ctrl+Shift+I, Ctrl+U) dan selisih ukuran jendela; hanya indikasi | Tidak, hanya peringatan dan log |
| L-05 | Membuka ujian yang sama di tab lain | kunci sesi lewat `localStorage` dan `BroadcastChannel` | Tab kedua diblokir |
| L-06 | Mencetak halaman soal | blokir Ctrl+P dan CSS `@media print` | Tidak, hanya peringatan |
| L-07 | Menyebarkan soal, kunci, atau bekerja sama | aturan etik; tidak dapat dideteksi otomatis | Tidak berlaku |

**Eskalasi untuk L-01 dan L-02**

| Pelanggaran ke- | Tindakan |
| --- | --- |
| 1 | Modal penuh: "Anda meninggalkan halaman ujian. Pelanggaran 1 dari 3." Timer tetap berjalan. |
| 2 | Modal peringatan keras dan penghitung berubah merah di header: "Satu pelanggaran lagi, ujian dihentikan dan cooldown 4 jam dimulai." |
| 3 | Ujian otomatis di-submit dengan status **Dihentikan karena pelanggaran**, lalu cooldown 4 jam dimulai. |

**Ketentuan**

- Setiap kejadian mencatat waktu mulai, waktu kembali, dan durasi menjauh.
- Menjauh kurang dari 2 detik tidak dihitung (mengurangi pelanggaran palsu dari notifikasi sistem).
- L-01 dan L-02 yang terjadi bersamaan (mis. keluar fullscreen karena pindah tab) dihitung sebagai satu pelanggaran.
- Penghitung pelanggaran dan alasannya selalu terlihat oleh peserta, dan ringkasannya muncul di halaman hasil.
- Batas teknis: browser hanya tahu halaman kehilangan fokus, bukan isi tab lain. Split-screen, jendela mengambang, atau HP kedua tidak terdeteksi.

**Cooldown 4 jam**

- Setelah ujian dihentikan karena pelanggaran ketiga, peserta tidak bisa memulai ujian lagi selama 4 jam.
- Cooldown dihitung dari waktu penghentian memakai jam server Supabase, bukan jam perangkat, dan disimpan di server agar tidak lolos dengan hapus cache atau ganti browser.
- Selama cooldown, tombol Mulai Ujian nonaktif dengan hitung mundur; Mode Latihan tetap bisa dipakai.
- Cakupan default: ujian (matkul dan modul) yang dilanggar; bisa diubah ke seluruh Mode Ujian lewat `cooldownScope` di JSON.
- Sanksi dari sistem hanya cooldown; hasil ujian yang dihentikan tetap tercatat dengan status khusus.
- Pengelola dapat mencabut cooldown jika pelanggaran disebabkan masalah teknis (peserta mengajukan lewat banding).
- Setiap pelanggaran dikirim ke server saat terjadi, bukan hanya saat submit, supaya menutup tab atau memutus koneksi tidak menghindari hitungan dan cooldown.

## 6. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-01 | Satu tombol Ujian Mata Kuliah untuk setiap matkul, terpisah dari Latihan Soal per modul | P0 |
| FR-02 | Konfigurasi ujian dari JSON: durasi, jumlah soal, acak, batas pelanggaran, lama cooldown | P0 |
| FR-03 | Timer mundur yang tahan refresh (berbasis waktu mulai, bukan hitungan interval) | P0 |
| FR-04 | Simpan jawaban otomatis ke `localStorage` dan pulihkan setelah refresh | P0 |
| FR-05 | Halaman aturan dan persetujuan wajib sebelum mulai | P0 |
| FR-06 | Deteksi L-01 dan L-02 dengan penghitung 3 kali, modal, log, dan submit otomatis pada pelanggaran ketiga | P0 |
| FR-07 | Mode layar penuh, blokir copy/paste/klik kanan di area soal (L-02, L-03) | P0 |
| FR-08 | Bank ujian khusus 30 soal pilihan ganda per matkul, berbeda dari Latihan Soal dan mencakup beberapa modul | P0 |
| FR-09 | Halaman hasil: skor otomatis, kunci, penjelasan, dan ringkasan pelanggaran | P0 |
| FR-10 | Form daftar peserta (nama dan NIM, NIM unik, tanpa password) | P0 |
| FR-11 | Masuk dengan NIM dan nama; identitas aktif diingat di browser sampai keluar | P0 |
| FR-12 | Simpan hasil, jawaban, dan log pelanggaran ke Supabase; jika gagal, simpan lokal dan kirim ulang otomatis | P0 |
| FR-13 | Cooldown 4 jam setelah ujian dihentikan; dicek di server saat masuk dan saat mulai, dengan hitung mundur di UI | P0 |
| FR-14 | Riwayat ujian per peserta dari Supabase (tanggal, skor, jumlah pelanggaran) | P1 |
| FR-15 | Deteksi L-04 sampai L-06 dan blokir tab ganda (L-05) | P1 |
| FR-16 | Navigasi nomor soal dan tanda ragu-ragu | P1 |
| FR-17 | Light/dark mode dan tampilan mobile tetap berfungsi di mode ujian | P1 |
| FR-18 | Pencabutan cooldown oleh pengelola untuk kasus teknis, dengan alasan tertulis | P1 |
| FR-19 | Ekspor hasil dan log pelanggaran (JSON/PDF) | P2 |

## 7. Perubahan Teknis

Perubahan mengikuti struktur repo yang ada (`src/component/`, `src/types.ts`, `public/data/`) dan prinsip "konten dari JSON".

| Area | Perubahan |
| --- | --- |
| `public/data/data-modul.json` | Tambah satu blok `exam` per matkul untuk durasi, jumlah soal, pengacakan, batas pelanggaran, cooldown, dan aturan |
| `public/data/ujian_*.json` | Bank soal ujian baru, 30 pilihan ganda per matkul dari gabungan modul; terpisah dari bank Latihan Soal |
| `public/data/latihan_soal_*.json` | Tetap khusus untuk Mode Latihan dan tidak digunakan sebagai bank ujian |
| `src/types.ts` | Tipe baru: `ExamConfig`, `ExamAttempt`, `Violation`, `ViolationCode`, `Peserta` |
| `src/component/` | Komponen baru: `ExamRegister`, `ExamLogin`, `ExamRules`, `ExamRunner`, `ExamTimer`, `ViolationModal`, `CooldownNotice`, `ExamResult` |
| `src/hooks/useExamGuard.ts` | Hook satu-satunya tempat listener `visibilitychange`, `blur`, `fullscreenchange`, `copy`, `paste`, `contextmenu`; dilepas saat unmount |
| `src/lib/supabase.ts` | Klien `@supabase/supabase-js`; memanggil fungsi RPC (bagian di bawah) |
| Environment | `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Daftar file repo menampilkan `.env`; pastikan isinya hanya anon key dan tidak pernah service role key |
| Routing hash | Rute baru `#exam-register`, `#exam-rules=...`, `#exam=...`, `#exam-result=...` di samping `#quiz=...` |
| `localStorage` | `exam:peserta` (identitas aktif), `exam:attempt:<matkul>:0` (jawaban sementara ujian matkul), antrean kirim ulang |
| SEO | Rute ujian di-`noindex`; tidak perlu masuk sitemap |

**Contoh log pelanggaran (disimpan dengan attempt)**

```json
{
  "kode": "L-01",
  "mulai": "2026-10-25T09:14:03Z",
  "kembali": "2026-10-25T09:14:19Z",
  "durasiDetik": 16,
  "ke": 1
}
```

**Skema Supabase (usulan)**

```sql
create table peserta (
  id uuid primary key default gen_random_uuid(),
  nim text not null unique,
  nama text not null,
  created_at timestamptz default now()
);

create table hasil_ujian (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid not null references peserta(id),
  matkul text not null,
  modul int,
  mulai timestamptz not null,
  selesai timestamptz not null,
  skor numeric,
  status text not null, -- selesai | waktu_habis | dihentikan_pelanggaran
  jawaban jsonb not null,
  pelanggaran jsonb not null default '[]',
  jumlah_pelanggaran int not null default 0
);

create table cooldown (
  id uuid primary key default gen_random_uuid(),
  peserta_id uuid not null references peserta(id),
  matkul text not null,
  modul int,
  dimulai timestamptz not null default now(),
  berakhir timestamptz not null default now() + interval '4 hours',
  hasil_id uuid references hasil_ujian(id),
  dicabut boolean not null default false
);

alter table peserta enable row level security;
alter table hasil_ujian enable row level security;
alter table cooldown enable row level security;
-- tanpa policy untuk anon: semua akses lewat fungsi security definer
```

Karena tidak ada login Supabase, RLS tidak bisa membedakan peserta. Maka semua tabel tertutup untuk `anon`, dan klien hanya memanggil fungsi RPC berikut:

- `daftar_peserta(nim, nama)`: membuat peserta; menolak NIM yang sudah ada.
- `masuk_peserta(nim, nama)`: mengembalikan data peserta jika NIM dan nama cocok.
- `cek_cooldown(nim, nama, matkul, modul)`: mengembalikan waktu berakhir cooldown (jam server) atau kosong.
- `catat_pelanggaran(nim, nama, attempt, kode, durasi)`: dipanggil setiap ada pelanggaran; server menghitung jumlahnya dan membuat cooldown saat pelanggaran ketiga.
- `simpan_hasil(nim, nama, hasil)`: hanya menambah baris, tidak mengubah hasil lama; mencocokkan jumlah pelanggaran dengan log di server.
- `riwayat_peserta(nim, nama)`: mengembalikan hasil milik peserta tersebut saja.

## 8. Keamanan dan Keterbatasan

Aplikasi ini statis; Supabase hanya menyimpan data peserta, hasil, dan cooldown, sedangkan logika ujian tetap berjalan di browser peserta. Konsekuensinya perlu diterima secara sadar:

| Risiko | Dampak | Mitigasi v1 | Mitigasi v2 |
| --- | --- | --- | --- |
| Kunci jawaban ada di file JSON di `public/data/` yang bisa diunduh siapa pun | Peserta bisa melihat kunci tanpa membuka tab lain terdeteksi | Beri label Mode Ujian sebagai simulasi latihan; jangan dipakai untuk nilai resmi | Kirim soal tanpa kunci; kunci dinilai di server (Supabase Edge Function) |
| Masuk hanya dengan NIM dan nama, tanpa password | Orang lain bisa memakai NIM temannya dan melihat riwayatnya; peserta kena cooldown bisa daftar dengan NIM lain | Masuk wajib cocok NIM dan nama; hasil hanya bisa ditambah; peringatan privasi saat daftar | Tambah PIN atau tautan masuk lewat email, atau validasi NIM ke daftar resmi |
| Anon key Supabase terlihat di kode frontend | Siapa pun bisa memanggil API, termasuk mengirim hasil palsu | Tabel tertutup untuk anon, akses hanya lewat fungsi RPC; batasi laju dan ukuran data; service role key tidak pernah di repo | Edge Function sebagai satu-satunya jalur tulis, dengan validasi di server |
| Peserta menutup tab atau memutus koneksi sebelum hasil terkirim agar lolos dari cooldown | Pelanggaran dan cooldown tidak tercatat | Kirim tiap pelanggaran ke server saat terjadi, dan sisa log lewat `pagehide`/`sendBeacon`; ujian tanpa heartbeat lewat batas waktu dianggap ditinggalkan | Heartbeat server dan timer server menentukan status ujian |
| `localStorage` bisa diedit lewat DevTools | Timer dan jawaban sementara bisa dimanipulasi | Hash sederhana pada attempt; tandai attempt tidak valid jika tidak konsisten | Waktu mulai disimpan di server |
| Perangkat kedua atau split-screen tidak terdeteksi | Pelanggaran tidak tercatat | Acak soal dan opsi; jelaskan keterbatasan di halaman aturan | Bank soal lebih besar, soal berbasis kasus |
| Pelanggaran palsu (notifikasi, telepon masuk) | Peserta dirugikan | Ambang 2 detik; tombol "laporkan masalah teknis"; pengelola bisa mencabut cooldown | Peninjauan pengelola sebelum sanksi |

Repo sudah memuat folder `supabase/` dan rencana Supabase di `prd.md` (Photo Booth), sehingga integrasi Supabase memakai infrastruktur yang sudah dikenal.

## 9. Kebutuhan Non-Fungsional dan Kasus Tepi

**Non-fungsional**

- **Kinerja:** halaman ujian tampil kurang dari 2 detik; hanya JSON modul yang dipilih yang dimuat.
- **Kompatibilitas:** Chrome, Edge, Firefox, Safari terbaru; di iOS Safari fullscreen terbatas, jadi L-02 tidak dihitung di perangkat yang tidak mendukungnya.
- **Aksesibilitas:** navigasi keyboard, kontras terjaga di light dan dark mode, ukuran teks mengikuti sistem.
- **Privasi:** data yang disimpan di Supabase hanya nama, NIM, jawaban, skor, log pelanggaran, dan cooldown; tanpa kamera dan mikrofon; perlu pernyataan privasi singkat saat daftar dan cara meminta penghapusan data.
- **Pemeliharaan:** semua aturan dan angka ada di JSON; komponen ujian terpisah dari komponen latihan.

**Kasus tepi**

- Refresh atau tab tertutup tidak sengaja: ujian dilanjutkan dari sisa waktu; pemulihan itu sendiri tidak dihitung pelanggaran.
- Perangkat tidur atau jam diubah: sisa waktu dihitung dari waktu mulai dan dibandingkan dengan jam saat ini; selisih tidak wajar menandai attempt.
- Waktu habis saat mengisi essay: isi terakhir disimpan lalu submit.
- Submit ganda: hanya yang pertama dihitung.
- Ujian dibuka di dua tab: tab kedua menampilkan pesan dan tidak bisa mengerjakan.
- Koneksi ke Supabase gagal saat submit: hasil disimpan lokal dan dikirim ulang otomatis; peserta melihat status "belum tersinkron".
- Dua orang mendaftar dengan NIM yang sama: pendaftaran kedua ditolak dengan pesan jelas; pemulihan dilakukan pengelola.
- Cooldown dan jam perangkat: sisa cooldown selalu dihitung dari jam server, jadi mengubah jam perangkat tidak berpengaruh.
- Peserta kena cooldown mencoba mulai lewat URL hash langsung: halaman ujian mengecek cooldown ke server sebelum memuat soal.

## 10. Rilis

| Fase | Isi | Perkiraan |
| --- | --- | --- |
| MVP | FR-01 s.d. FR-13 untuk enam matkul; satu ujian gabungan dan bank soal khusus per matkul | 3–4 minggu |
| Penyempurnaan | FR-14 s.d. FR-18, uji di mobile dan Safari | +1–2 minggu |
| v2 (opsional) | Penguatan Supabase: kunci jawaban di server, timer server, validasi NIM, FR-19 | +3–4 minggu |

Perkiraan waktu bersifat kasar untuk satu pengembang dan perlu disesuaikan dengan ketersediaan.

## 11. Pertanyaan Terbuka

1. Mode Ujian murni simulasi latihan, atau akan dipakai untuk penilaian sungguhan? Jawabannya menentukan perlu tidaknya v2 sejak awal.
2. Apakah batas 3 kali pelanggaran dan cooldown 4 jam sudah final, dan berlaku untuk modul yang dilanggar saja, satu matkul, atau seluruh Mode Ujian?
3. Format ujian: per modul, per matkul, atau keduanya? Berapa durasi dan jumlah soal per matkul?
4. Apakah essay dan isian singkat perlu penilaian (manual oleh siapa), atau cukup self-check dengan kunci?
5. Apakah NIM perlu divalidasi dengan format NIM UT atau daftar resmi, atau cukup angka bebas? Bagaimana koreksi kalau salah ketik nama?
6. Siapa yang boleh melihat data hasil seluruh peserta dan mencabut cooldown, dan lewat apa (dashboard sederhana atau langsung di Supabase)?
7. Berapa lama data peserta disimpan dan bagaimana permintaan penghapusan ditangani?

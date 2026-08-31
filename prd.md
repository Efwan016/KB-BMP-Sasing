# PRD - Photo Booth Virtual Page

## 1. Ringkasan

**Project:** Sasing Ganjil 26 - Photo Booth Virtual
**Nama Page:** Photo Booth
**Tujuan:** Halaman interaktif berisi photo booth virtual yang bisa digunakan user untuk mengambil foto pakai webcam, kasih efek/overlay, terus upload hasilnya ke Supabase Storage.

---

## 2. Fitur Utama

### 2.1 Frontend (React + Vite + Tailwind)

| Fitur | Keterangan |
|---|---|
| **Camera Preview** | `navigator.mediaDevices.getUserMedia()` buat tampilkan kamera live di halaman |
| **Photo Capture** | Klik tombol capture → tangkap frame dari `<video>` ke `<canvas>` → convert jadi blob |
| **Overlay / Filter** | Tampilkan overlay (sticker, teks, border, frame) di atas preview sebelum capture. Bisa pakai CSS filter atau canvas compositing |
| **Retake / Regenerate** | User bisa capture ulang tanpa reload halaman |
| **Upload ke Supabase** | Hasil capture di-upload ke Supabase Storage bucket `photo-booth` |
| **Feed Foto Terakhir** | Tampilkan foto terakhir yang udah diupload (pencarian ke tabel `photos`) |

### 2.2 Supabase (Backend / Storage)

| Komponen | Keterangan |
|---|---|
| **Storage Bucket** | Nama: `photo-booth` — public read, authenticated write (atau public kalau ga butuh login) |
| **Tabel `photos`** | Nyimpen metadata: id, url, nama file, timestamp, event, user_id (opsional) |
| **RLS Policy** | Kalau user nggak login: buat policy supabase anon key bisa insert. Kalau login: batasin biar user cuma liat foto mereka sendiri (atau biar semua liat semua kalau mau feed publik) |

---

## 3. Alur User (User Flow)

```
[Load Page]
   |
   v
[Permintaan akses webcam] --> [Denied] --> Tampilkan pesan "Buka akses kamera"
   |
  [Granted]
   |
   v
[Tampilkan preview kamera] <---------+
   |                                 |
   v                                 |
[Pilih overlay / filter]             |
   |                                 |
   v                                 |
[Click Capture]                      |
   |                                 |
   v                                 |
[Canvas 캡처 → Blob]                  |
   |                                 |
   v                                 |
[Preview hasil foto]                 |
   |                                 |
   v                                 |
[Upload ke Supabase Storage] --------+
   |
   v
[Insert metadata ke tabel photos]
   |
   v
[Tampilkan foto di feed]
```

---

## 4. Teknis

### 4.1 Tech Stack

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS 4
- **Database / Storage:** Supabase (JS client: `@supabase/supabase-js`)
- **TypeScript:** Ya (tsconfig udah ada)

### 4.2 Install Dependencies Tambahan

```bash
npm install @supabase/supabase-js
```

### 4.3 Environment Variables

Masukkan di `.env` (dan add ke `.gitignore`):

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### 4.4 Supabase Setup (Manual, di dashboard)

```sql
-- Buat storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('photo-booth', 'photo-booth', true);

-- Policy: semua user (anon) boleh insert
CREATE POLICY "Allow anon upload" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'photo-booth');

-- Policy: semua boleh read
CREATE POLICY "Allow anon read" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'photo-booth');
```

```sql
-- Buat tabel metadata
CREATE TABLE photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_id TEXT,        -- opsional: kaitin sama event (misal: "sasing-ganjil-26")
  user_id TEXT          -- opsional: kaitin sama user (kalau nanti ada auth)
);
```

```sql
-- Policy tabel photos
CREATE POLICY "Allow anon insert" ON photos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select" ON photos FOR SELECT TO anon USING (true);
```

### 4.5 Struktur File (Direkomendasikan)

```
src/
├── lib/
│   └── supabase.ts          # Client initialization
├── components/
│   ├── PhotoBooth.tsx       # Komponen utama: preview + capture + upload
│   ├── OverlaySelector.tsx  # Widget pilih overlay/filter
│   └── PhotoFeed.tsx        # Tampilkan foto-foto yang udah diupload
├── pages/
│   └── PhotoBoothPage.tsx   # Halaman lengkap (route: /photo-booth)
└── App.tsx                  # Routing: tambahin route /photo-booth
```

---

## 5. UI / UX

### 5.1 Layout

- **Left/Top:** Preview kamera (besar, centering)
- **Bottom/Right:** Kontrol — tombol capture, pemilih overlay, tombol retake, tombol download (bisa download lokal juga)
- **Side/Feed:** Grid foto-foto hasil sebelumnya (kalau ada)

### 5.2 State

| State | Nilai |
|---|---|
| `cameraLoading` | Loading izin kamera |
| `cameraError` | Gagal akses kamera |
| `previewReady` | Kamera siap |
| `capturedBlob` | Blob hasil capture (BLANK kalau belum capture) |
| `uploading` | Sedang upload ke Supabase |
| `uploadedPhoto` | Data foto setelah sukses upload |
| `feedPhotos` | List foto dari tabel `photos` |

---

## 6. Scope & Batasan (V1)

**Dalam scope:**
- Webcam capture pakai browser
- Overlay sederhana: frame border, teks, sticker (pakai gambar atau teks biasa)
- Upload ke Supabase Storage
- Tabel metadata
- Feed foto terakhir di halaman yang sama

**Diam 의문 di luar scope V1:**
- Login/auth user (bisa ditambahkan nanti kalo perlu)
- Video booth / GIF booth
- Multi-camera (front/back)
- Real-time feed pakai Supabase Realtime (bisa lanjutannya)
- Filter webcam live (bisa pakai CSS filter dulu, nanti kalau mau pakai WebGL/WebCodecs baru）

---

## 7. Checklist

- [ ] Install `@supabase/supabase-js`
- [ ] Setup `.env` dengan Supabase URL + anon key
- [ ] Buat bucket `photo-booth` + tabel `photos` + RLS policy di Supabase dashboard
- [ ] Buat `src/lib/supabase.ts`
- [ ] Implementasi `PhotoBooth.tsx` — preview, capture, blob, upload
- [ ] Implementasi `OverlaySelector.tsx` — pilihan overlay sederhana
- [ ] Implementasi `PhotoFeed.tsx` — load dan tampilkan daftar foto
- [ ] Rutekan di `App.tsx` → `/photo-booth`
- [ ] Test di browser: izin kamera, capture, upload, feed
- [ ] Push ke repo

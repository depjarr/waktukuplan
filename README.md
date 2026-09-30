# waktukuplan

Jurnal jadwal bergaya planner. Jadwal bisa ditulis **manual** di web, lewat **AI** (kotak perintah), atau dengan
**chat WhatsApp** ke bot. Semuanya berujung di database yang sama.

**Teknologi:** Next.js 15 (App Router, TypeScript) · Supabase (database, login, storage, realtime) ·
Claude API (tool use) · WhatsApp Cloud API · Vercel (hosting).

---

## Tahapan membuatnya jalan

### Tahap 1. Siapkan akun & alat (± 15 menit)
- Node.js 20 atau lebih baru, dan editor kode (VS Code).
- Akun **Supabase** (supabase.com), gratis.
- Akun **Anthropic Console** (console.anthropic.com) untuk API key Claude.
- Akun **GitHub** dan **Vercel** (nanti, untuk online).
- Akun **Meta for Developers** (nanti, hanya untuk bot WhatsApp).

### Tahap 2. Database di Supabase (± 10 menit)
1. Supabase Dashboard → **New project**. Catat password database-nya.
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/migrations/0001_init.sql`, klik **Run**.
   Ini membuat semua tabel, aturan keamanan (RLS), bucket gambar, dan realtime.
3. **Authentication → Providers → Email**: untuk tahap coba-coba, matikan **Confirm email** supaya bisa langsung masuk.
4. **Project Settings → API**: salin `Project URL`, `anon key`, dan `service_role key`.

### Tahap 3. Jalankan di komputer (± 10 menit)
```bash
npm install
cp .env.example .env.local     # lalu isi nilainya (lihat komentar di dalam file)
npm run dev                    # buka http://localhost:3000
```
Isi minimal supaya web jalan: tiga kunci Supabase. Isi `ANTHROPIC_API_KEY` supaya kotak AI jalan.
Daftar akun di halaman `/login`, lalu coba: tambah jadwal manual, tambah stiker, ketik ke kotak AI.

### Tahap 4. Online di Vercel (± 15 menit)
1. Push folder ini ke repository GitHub (`.env.local` sudah otomatis diabaikan).
2. Vercel → **Add New Project** → pilih repository → tambahkan semua variabel dari `.env.example` di **Environment Variables**.
3. Setelah dapat alamat (misal `waktukuplan.vercel.app`), buka Supabase → **Authentication → URL Configuration**,
   isi **Site URL** dengan alamat itu dan tambahkan `https://alamatmu/auth/callback` ke **Redirect URLs**.

### Tahap 5. Bot WhatsApp (bagian paling lama, biasanya 1-2 hari karena urusan Meta)
1. developers.facebook.com → **Create App** (tipe *Business*) → tambahkan produk **WhatsApp**.
2. Di **WhatsApp → API Setup** ada nomor uji dari Meta. Salin **Phone number ID** dan **Temporary access token**
   ke `WHATSAPP_PHONE_NUMBER_ID` dan `WHATSAPP_TOKEN`. Salin juga **App Secret** (App settings → Basic) ke `WHATSAPP_APP_SECRET`.
   Nomor bot (tanpa `+`) diisi ke `NEXT_PUBLIC_WA_BOT_NUMBER`.
3. **WhatsApp → Configuration → Webhook**: Callback URL = `https://alamatmu/api/whatsapp`,
   Verify token = isi `WHATSAPP_VERIFY_TOKEN`-mu. Klik verifikasi, lalu **subscribe** ke field `messages`.
4. Deploy ulang di Vercel supaya variabel baru terbaca.
5. Di web waktukuplan klik **Hubungkan WhatsApp** → **Buat kode** → kirim kode 6 digit itu ke nomor bot.
   Setelah terhubung, kirim pesan biasa, misalnya *"besok jam 7 malam meeting desain di kantor"*.

Catatan penting soal WhatsApp:
- Token sementara dari Meta habis dalam ±24 jam. Untuk pemakaian terus-menerus, buat **System User token** permanen.
- Nomor uji Meta hanya bisa berbalas dengan maksimal 5 nomor yang kamu daftarkan sebagai penerima uji.
  Untuk dipakai umum, kamu perlu nomor bisnis sendiri dan **verifikasi bisnis** Meta.
- Bot membalas pesan bebas hanya dalam 24 jam setelah user terakhir mengirim pesan (aturan WhatsApp).

---

## Peta folder: mau ubah apa, buka file mana

| Mau ubah… | Buka |
|---|---|
| Tampilan warna, font, ukuran | `src/styles/base.css` (warna & font ada di bagian `:root`), lalu file css lain per bagian |
| Kalender bulanan (kotak tanggal) | `src/components/planner/MonthGrid.tsx`, `DayCell.tsx` |
| Stiker / gambar / teks ngambang | `StickerLayer.tsx` |
| Corat-coret pensil & penghapus | `DrawLayer.tsx` |
| Tampilan itinerari (kolom hari) | `ItineraryView.tsx`, `EventCard.tsx` |
| Form tambah jadwal manual | `EventDialog.tsx` |
| Jam flip, daftar "Segera hadir" | `Clock.tsx`, `SoonList.tsx` |
| Kalender mini & pengingat | `MiniCalendar.tsx`, `Reminders.tsx` |
| Catatan | `NotesPanel.tsx` |
| Kotak AI di atas | `AiBar.tsx` |
| Toolbar (tombol alat) | `Toolbar.tsx` |
| Kategori & ikonnya | `src/lib/categories.ts` (+ warna di `base.css`, cari `.cat-`) |
| Cara AI berpikir (prompt, tool) | `src/server/agent.ts` |
| Aturan menambah/ubah/hapus jadwal | `src/server/eventService.ts` |
| Webhook & balasan WhatsApp | `src/app/api/whatsapp/route.ts`, `src/server/whatsapp.ts` |
| Struktur tabel database | `supabase/migrations/` (buat file baru `0002_...sql` tiap ada perubahan, jangan edit yang lama) |
| State & data aplikasi (semua hook) | `PlannerProvider.tsx`, `src/hooks/` |

### Cara kerja satu kalimat per lapisan
- **Web manual:** komponen → `PlannerProvider` → hook `useTable` → Supabase (dibatasi RLS: user hanya melihat datanya sendiri).
- **AI di web:** `AiBar` → `/api/ai` → `agent.ts` (Claude memilih tool) → `eventService.ts` → Supabase.
- **WhatsApp:** Meta → `/api/whatsapp` (cek tanda tangan) → `agent.ts` → `eventService.ts` → Supabase → balasan ke WhatsApp.
- **Realtime:** perubahan dari WhatsApp/AI otomatis muncul di web yang sedang terbuka.

> Bedanya dengan rencana awal: bagian AI dan webhook ditaruh di **Next.js API routes** (bukan Supabase Edge Functions).
> Hasilnya sama, tapi seluruh kode ada dalam satu proyek sehingga lebih mudah dirawat dan di-debug.

---

## Yang sudah dan belum

**Sudah ada:** login email, kalender bulanan, 12 kartu bulan berikut gambar sendiri, itinerari, detail hari, form manual lengkap,
stiker/gambar/teks ngambang (geser, besarkan, putar, hapus), pensil & penghapus, catatan checklist (kanan / ngambang / sembunyi),
jam flip, segera hadir (maks 5), kalender mini + pengingat ★, AI (tambah, ubah, hapus, selesaikan, cari jadwal, catatan, dengan Urungkan),
bot WhatsApp dengan verifikasi kode.

**Belum ada (langkah berikutnya):**
1. **Pengingat terkirim otomatis.** Pilihan "10 menit sebelumnya" sudah tersimpan di jadwal, tapi belum ada yang mengirimnya.
   Cara: Vercel Cron atau pg_cron yang tiap menit mencari jadwal yang mendekati waktunya, lalu kirim pesan WhatsApp.
   (Catatan: pesan yang dikirim bot lebih dari 24 jam setelah pesan terakhir user harus memakai *message template* yang disetujui Meta.)
2. **Pembatasan pemakaian AI.** Belum ada batas jumlah pesan per user. Sebelum dibuka ke banyak orang, tambahkan batas harian
   (tiap pesan memanggil Claude dan itu berbiaya).
3. **Gambar privat.** Bucket `images` bersifat publik (nama file acak). Kalau butuh privat, ganti ke signed URL.
4. **Memuat semua jadwal sekaligus.** Cukup untuk pemakaian pribadi. Kalau sudah ribuan jadwal, muat per rentang bulan saja.
5. **Tes otomatis** dan zona waktu per user (saat ini default `Asia/Jakarta` di tabel `profiles`).

## Cek cepat sebelum commit
```bash
npm run typecheck   # cek tipe
npm run build       # build produksi
```

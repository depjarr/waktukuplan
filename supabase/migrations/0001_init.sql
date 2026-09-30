-- =====================================================================
-- waktukuplan: skema database
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > tempel semua > Run
-- =====================================================================

-- ---------- Profil user (1 baris per akun) ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone     text not null default 'Asia/Jakarta',
  wa_number    text unique,                       -- nomor WhatsApp yang sudah terverifikasi
  ui           jsonb not null default '{}'::jsonb, -- pengaturan tampilan (catatan, panel, dll)
  created_at   timestamptz not null default now()
);

-- Otomatis bikin profil saat ada user baru mendaftar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- wa_number hanya boleh diubah lewat server (proses verifikasi kode), bukan langsung dari browser.
-- Kalau tidak, orang bisa mengklaim nomor WhatsApp orang lain.
create or replace function public.protect_wa_number()
returns trigger language plpgsql as $$
begin
  if new.wa_number is distinct from old.wa_number and auth.role() <> 'service_role' then
    raise exception 'wa_number hanya bisa diubah lewat verifikasi WhatsApp';
  end if;
  return new;
end $$;

create trigger protect_wa_number_trg
  before update on public.profiles
  for each row execute function public.protect_wa_number();

-- ---------- Jadwal ----------
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  date          date not null,
  start_time    text check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time      text check (end_time   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  category      text not null default 'Lainnya'
                check (category in ('Meeting','Liburan','Konser','Makan','Tugas','Personal','Lainnya')),
  category_name text,                              -- nama kategori buatan sendiri (kalau "Lainnya")
  place         text,
  note          text,
  image_url     text,
  done          boolean not null default false,
  starred       boolean not null default false,    -- tampil di "Pengingat bulan ini"
  remind        text,                              -- '', '10m', '1h', '1d'
  kind          text not null default 'event' check (kind in ('event','text')),
  source        text not null default 'web',       -- 'web' | 'ai' | 'wa'
  created_at    timestamptz not null default now()
);
create index events_user_date_idx on public.events (user_id, date);

-- ---------- Catatan (checklist) ----------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Catatan',
  items      jsonb not null default '[]'::jsonb,   -- [{ "t": "isi", "ck": true, "done": false }]
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index notes_user_idx on public.notes (user_id);

-- ---------- Stiker / gambar / teks ngambang (per bulan) ----------
create table public.stickers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  ym           text not null check (ym ~ '^[0-9]{4}-[0-9]{2}$'),  -- contoh: '2026-09'
  type         text not null check (type in ('emoji','text','img')),
  ch           text,            -- emoji
  text_content text,            -- isi teks
  src          text,            -- url gambar
  x            real not null default 40,   -- posisi dalam % dari lebar kalender
  y            real not null default 10,   -- posisi dalam % dari tinggi kalender
  w            real,            -- lebar gambar (%)
  fs           real,            -- ukuran font (px)
  rot          real not null default 0,
  z            int not null default 1,
  color        text
);
create index stickers_user_ym_idx on public.stickers (user_id, ym);

-- ---------- Coretan pensil (1 baris per bulan) ----------
create table public.drawings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  ym         text not null,
  strokes    jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, ym)
);

-- ---------- Gambar sampul tiap bulan (Januari..Desember) ----------
create table public.month_covers (
  user_id   uuid not null references auth.users(id) on delete cascade,
  month     int  not null check (month between 0 and 11),
  image_url text not null,
  primary key (user_id, month)
);

-- ---------- Judul hari di tampilan itinerari ----------
create table public.day_titles (
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  title   text not null default '',
  primary key (user_id, date)
);

-- ---------- Khusus server: verifikasi & anti-duplikat WhatsApp ----------
create table public.wa_link_codes (
  code       text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create table public.wa_processed (
  message_id text primary key,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Keamanan (Row Level Security): user hanya bisa menyentuh datanya sendiri
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.events        enable row level security;
alter table public.notes         enable row level security;
alter table public.stickers      enable row level security;
alter table public.drawings      enable row level security;
alter table public.month_covers  enable row level security;
alter table public.day_titles    enable row level security;
alter table public.wa_link_codes enable row level security;  -- tanpa policy = hanya service role
alter table public.wa_processed  enable row level security;  -- tanpa policy = hanya service role

create policy "profil sendiri (baca)"  on public.profiles for select using (auth.uid() = id);
create policy "profil sendiri (ubah)"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "events milik sendiri"       on public.events       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes milik sendiri"        on public.notes        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "stickers milik sendiri"     on public.stickers     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "drawings milik sendiri"     on public.drawings     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "covers milik sendiri"       on public.month_covers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "day_titles milik sendiri"   on public.day_titles   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Penyimpanan gambar
-- Bucket publik: siapa pun yang tahu URL-nya bisa melihat gambar. Nama file berupa UUID acak
-- sehingga tidak bisa ditebak. Kalau mau lebih privat, ganti ke signed URL (lihat README).
-- =====================================================================
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;

create policy "upload ke folder sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "hapus file sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Realtime: tampilan web ikut berubah saat jadwal ditambah lewat WhatsApp
-- =====================================================================
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.notes;

# Deploy UTC NextGen ke Vercel

Project ini sudah disiapkan untuk deploy ke Vercel. Ikuti langkah berikut secara berurutan.

## Yang sudah saya konfigurasi

- `package.json` — tambah script `vercel-build` (run `prisma generate && prisma migrate deploy && next build`) dan `postinstall` (run `prisma generate`).
- `prisma/schema.prisma` — tambah `binaryTargets` untuk Vercel (rhel-openssl-3.0.x) dan `directUrl` untuk migrasi.
- `vercel.json` — region Singapore, framework Next.js, maxDuration API 30 detik.
- `.env.production.example` — template env untuk production.
- `.vercelignore` — exclude file lokal.

## Langkah 1 — Siapkan Database PostgreSQL (Pilih SATU)

Vercel serverless function butuh database yang support **connection pooling** karena tiap request bisa spawn koneksi baru. PostgreSQL biasa tanpa pooler akan cepat habis connection. Rekomendasi (urutan dari paling mudah):

### Opsi A — Neon (REKOMENDASI utama, gratis, paling cepat setup)

1. Daftar di [neon.tech](https://neon.tech) (login pakai GitHub).
2. Create project: pilih region **Singapore (ap-southeast-1)** biar dekat user Indonesia.
3. Di dashboard Neon, copy **dua** connection string:
   - **Pooled connection** (ada `-pooler` di hostname) -> ini buat `DATABASE_URL`
   - **Direct connection** (tanpa `-pooler`) -> ini buat `DIRECT_URL`
4. Pastikan `DATABASE_URL` ditambah parameter `?sslmode=require&pgbouncer=true&connection_limit=1`
5. Pastikan `DIRECT_URL` ditambah `?sslmode=require`

Contoh:
```
DATABASE_URL="postgresql://utc_owner:xxx@ep-cool-name-pooler.ap-southeast-1.aws.neon.tech/utc_nextgen?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://utc_owner:xxx@ep-cool-name.ap-southeast-1.aws.neon.tech/utc_nextgen?sslmode=require"
```

**Kenapa Neon paling cocok untuk project ini:**
- Free tier 0.5GB storage cukup buat ribuan user.
- Auto-pause kalau idle (hemat resource).
- Branch database (bisa bikin DB terpisah untuk preview/staging tanpa biaya).
- Native serverless driver — latency kecil dari Vercel.

### Opsi B — Supabase

1. Daftar di [supabase.com](https://supabase.com), create project, pilih region Singapore.
2. Settings -> Database -> Connection string.
3. Ambil dua koneksi:
   - **Transaction pooler** (port 6543) -> `DATABASE_URL`, tambah `?pgbouncer=true&connection_limit=1`
   - **Session/direct** (port 5432) -> `DIRECT_URL`

Kelebihan: dapat bonus storage, auth, dan realtime kalau nantinya butuh. Free tier 500MB.

### Opsi C — Vercel Postgres (Neon-managed)

Setup paling cepat (terintegrasi langsung dari Vercel dashboard), tapi free tier lebih kecil (256MB compute hours).

1. Vercel dashboard -> Storage -> Create -> Postgres.
2. Vercel akan auto-inject `DATABASE_URL`, `DIRECT_URL`, `POSTGRES_URL_NON_POOLING`, dll ke project.
3. Tidak perlu copy-paste manual.

---

## Langkah 2 — Push code ke GitHub

```bash
cd D:\Latsar\utc-nextgen
git add .
git commit -m "chore: prepare for vercel deployment"
git push origin main
```

Pastikan `.env` dan `node_modules` tidak ke-push (sudah di `.gitignore`).

## Langkah 3 — Import project di Vercel

1. Buka [vercel.com/new](https://vercel.com/new), login pakai GitHub.
2. Import repo `utc-nextgen`.
3. Vercel auto-detect Next.js — biarkan default.
4. **Jangan klik Deploy dulu** — buka section **Environment Variables**.

## Langkah 4 — Isi Environment Variables di Vercel

Buka project -> Settings -> Environment Variables. Copy dari `.env.production.example` dan isi:

| Variable | Value | Catatan |
|----------|-------|---------|
| `DATABASE_URL` | pooled connection string | Wajib pakai pooler URL |
| `DIRECT_URL` | direct connection string | Untuk migrasi |
| `AUTH_SECRET` | hasil `openssl rand -base64 32` | Generate fresh, jangan reuse dev |
| `AUTH_URL` | `https://your-app.vercel.app` | Update setelah dapat domain |
| `AUTH_TRUST_HOST` | `true` | |
| `RESEND_API_KEY` | dari [resend.com](https://resend.com/api-keys) | |
| `EMAIL_FROM` | `UTC NextGen <noreply@domain-anda.com>` | Domain harus verified di Resend |
| `NEXT_PUBLIC_APP_NAME` | `UTC NextGen` | |
| `NEXT_PUBLIC_APP_URL` | sama dengan `AUTH_URL` | |
| `GEMINI_API_KEY` | dari [aistudio.google.com](https://aistudio.google.com/app/apikey) | Opsional |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |

Set scope: **Production**, **Preview**, **Development** (centang semua atau minimal Production).

## Langkah 5 — Deploy

Klik **Deploy**. Build akan jalan `npm run vercel-build`:
1. `prisma generate` — bikin client
2. `prisma migrate deploy` — apply semua migrasi ke DB production
3. `next build` — bundle Next.js

Lihat build log. Kalau ada error migrasi, biasanya karena `DIRECT_URL` belum di-set atau salah.

## Langkah 6 — Seed data awal (sekali saja)

Setelah deploy sukses, DB sudah punya tabel tapi kosong. Seed dari mesin lokal yang nge-point ke DB production:

```bash
# Di terminal lokal, di folder project
$env:DATABASE_URL="<DIRECT_URL production>"
npm run db:seed
```

> Pakai `DIRECT_URL`, bukan pooler URL, biar seed yang panjang gak putus.
> Setelah selesai, **hapus** env var DATABASE_URL dari shell lokal Anda biar gak salah arah.

## Langkah 7 — Update `AUTH_URL` ke domain final

Kalau pakai custom domain (mis. `utc.unsri.ac.id`):
1. Vercel -> Settings -> Domains -> Add domain.
2. Update DNS sesuai instruksi Vercel.
3. Update env `AUTH_URL` dan `NEXT_PUBLIC_APP_URL` ke domain baru.
4. **Re-deploy** (Deployments -> tiga titik -> Redeploy).

## Troubleshooting umum

| Gejala | Solusi |
|--------|--------|
| Build gagal: `Can't reach database server` saat migrate | `DIRECT_URL` belum diset atau salah |
| Login berhasil tapi session hilang | `AUTH_SECRET` beda antara preview/production, atau `AUTH_URL` salah |
| `prisma: command not found` di build | Pastikan `prisma` ada di `devDependencies` (sudah) |
| Error `PrismaClientInitializationError: connection limit` | `DATABASE_URL` belum pakai pooler / belum tambah `connection_limit=1` |
| Email verifikasi tidak masuk | Domain di Resend belum verified, atau `EMAIL_FROM` pakai domain non-verified |
| Function timeout di proctor / analytics | Tingkatkan `maxDuration` di `vercel.json` (max 60s di Hobby, 300s di Pro) |

## Cara update setelah pertama deploy

Setiap kali push ke branch `main`, Vercel auto-deploy. Kalau ada migrasi DB baru:
1. Bikin migrasi lokal: `npm run db:migrate -- --name nama_migrasi`
2. Commit folder `prisma/migrations/...` ke git.
3. Push -> `prisma migrate deploy` di vercel-build akan apply otomatis.

## Catatan biaya (Hobby tier)

- Vercel Hobby: **gratis** untuk personal project, 100GB bandwidth/bulan.
- Neon Free: 0.5GB storage, autosuspend, satu project. Cukup untuk demo & POC.
- Resend Free: 3000 email/bulan, 100/hari.
- Gemini Free: ada quota harian, cukup untuk dipakai admin lab.

Total: **Rp 0** sampai traffic naik signifikan.

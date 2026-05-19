# UTC NextGen — Unsri Training Center

Sistem Training Center Terpusat Berbasis Gamifikasi untuk 8 lab Fakultas Ilmu Komputer Universitas Sriwijaya.

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Prisma 5** + **PostgreSQL 16** (lokal via Docker)
- **NextAuth.js v5** (JWT strategy, Credentials provider)
- **Tailwind CSS v3** + **shadcn/ui** + **Font Awesome 6** (tanpa emoji)
- **Resend** untuk email transactional
- **Sonner** untuk toast, **react-hook-form + Zod** untuk form

## Status pengerjaan

- [x] **Fase 1** — Foundation + Modul 1 (Auth & Onboarding)
- [x] **Fase 2** — Modul 2 Lab Management
  - Daftar lab + halaman detail (overview, anggota, TOR, proker, aset)
  - Members: tambah by email/NIM, hapus, assign/lepas admin lab
  - TOR: list + Tiptap rich-text editor (bold/italic/underline/heading/list/link/code) + workflow draft → submitted → approved (oleh superadmin) / rejected
  - Proker: kanban 4 kolom (TODO/IN_PROGRESS/REVIEW/DONE) drag-drop dengan @dnd-kit, milestone toggle, tracking budget vs realisasi
  - Aset: tabel inventaris CRUD dengan kondisi GOOD/NEEDS_REPAIR/BROKEN/DISPOSED + nilai total
  - Permission: helper terpusat di [src/lib/perms.ts](src/lib/perms.ts) (`canManageLab`, `canViewLab`)
- [ ] **Fase 2.5** — TODO: export laporan lab ke PDF (digabung dengan Modul 8 Analytics)
- [x] **Fase 3** — Modul 3 Course / LMS + Quiz per Section
  - Katalog `/courses` dengan filter per lab + indikator terdaftar
  - Detail course dengan struktur section/lesson + tombol daftar (gratis / bayar poin)
  - Halaman `/my/courses` untuk mahasiswa: progres % per course
  - Learning interface `/courses/[slug]/learn`: sidebar section/lesson list, tombol tandai selesai (+10 poin), section yang ter-gate
  - Lesson player adaptif: VIDEO (iframe), PDF (object), TEXT (whitespace-pre-line)
  - Section quiz runner: MCQ + true/false + essay, randomisasi soal & pilihan, history percobaan, max attempt enforced server-side
  - Auto-grade MCQ/TF + manual grading flag untuk essay (akan ditangani Modul 6 Proktor)
  - Section gating: section berikutnya hanya unlock jika quiz section sebelumnya lulus (≥ minScore)
  - Course admin di tab "Course" lab: create + editor lengkap (section/lesson/quiz CRUD inline) + question editor (MCQ/TF/Essay)
  - Points: lesson_complete +10, quiz_pass +5, exam_pass +50 (siap pakai untuk Modul 5 final exam)
- [x] **Fase 4** — Modul 4 Gamifikasi lanjutan + admin tooling
  - Tiptap rich-text editor untuk lesson type TEXT (toolbar lengkap, auto-save 800ms, render readonly di learn page)
  - Badge auto-award engine: `first_course`, `quiz_streak` (5 quiz beda berturut-turut), `lab_master` (semua course di sebuah lab selesai), `top_learner` (top 10 leaderboard mingguan). Otomatis dipanggil dari `awardPoints()` setelah event positif.
  - Leaderboard `/leaderboard` — podium top 3, tabel top 50, filter scope (Global / per lab) × timeframe (Minggu ini / Bulan ini / All-time)
  - Tukar Poin `/redeem` — katalog dengan tipe **Barang fisik** dan **Voucher digital**, dialog konfirmasi (pilih ambil sendiri di kantor / kirim biaya tanggung sendiri), kode penukaran unik `UTC-RDM-XXXXXXXX` untuk verifikasi, history penukaran lengkap dengan status & kode voucher
  - Admin merchandise `/admin/merch` — CRUD barang & voucher, kelola stok & status
  - Admin penukaran `/admin/redemptions` — list semua penukaran, filter status, kirim kode voucher digital, update nomor resi pengiriman, refund poin oleh superadmin
  - Lab CRUD oleh superadmin, Badge management oleh superadmin
  - **Asisten Lab**: anggota lab bisa dipromosikan jadi asisten (banyak per lab), punya hak edit konten lab seperti lab admin (TOR/Proker/Aset/Course)
  - Topbar realtime points: custom event `utc:points-changed` + JWT update via NextAuth `session.update({points})` — saldo update instan tanpa reload setelah redeem / lesson complete / quiz pass / enroll
  - Native scrollbar disembunyikan di sidebar dan main scroll area (tetap scrollable dengan wheel/touch)
  - Mahasiswa yang bukan asisten lab tidak melihat menu **Lab** di sidebar
- [x] **Fase 5** — Modul 5 Pretest & Final Exam + anti-cheating
  - Schema: `Quiz.webcamEnabled` / `webcamIntervalSec` / `maxViolations`, plus `ExamSession` + `ExamViolation` + `WebcamSnapshot` (pre-existing) sekarang aktif dipakai
  - Course editor: dua card baru "Pretest" dan "Final Exam" dengan tombol Buat / Edit; toggle "Wajib lulus pretest sebelum mulai belajar" di course meta
  - Quiz editor: untuk PRETEST/FINAL muncul card "Anti-cheat" — Max pelanggaran, interval webcam (detik), aktifkan webcam snapshot
  - Mahasiswa flow:
    - `/courses/[slug]/exam/pretest` dan `/courses/[slug]/exam/final` — instruksi anti-cheat → tombol mulai → fullscreen + (opsional) webcam stream
    - **Anti-cheat lengkap di client**: `requestFullscreen`, `visibilitychange`/blur (TAB_SWITCH), `fullscreenchange` (FULLSCREEN_EXIT), `copy`/`cut`/`paste` (COPY_PASTE), `contextmenu` (RIGHT_CLICK) — masing-masing tercatat sebagai violation server-side
    - Timer countdown live (mm:ss) dengan auto-submit saat 00:00; force-end + auto-submit bila violation count ≥ maxViolations
    - Webcam snapshot tiap N detik (data URL JPEG 60% quality, max 480×360) — disimpan di `WebcamSnapshot` untuk Phase 6 proktor
    - Riwayat sesi ujian (status, violation count, skor, lulus/tidak)
  - APIs: `/api/courses/[id]/exam` (create idempotent), `/api/quizzes/[id]/exam-sessions` (start), `/api/exam-sessions/[id]/violation`, `/api/exam-sessions/[id]/snapshot`, `/api/exam-sessions/[id]/submit` — submit auto-grade MCQ/TF, defer essay, +50 poin saat lulus FINAL via `awardPoints(EXAM_PASS)`
  - Pretest gating: bila `course.requirePretest && pretest exists && belum lulus` → mahasiswa di-redirect dari `/learn` ke `/exam/pretest`
  - Course detail: card baru "Pretest" dan "Final Exam" untuk mahasiswa enrolled dengan status & tombol mulai
- [x] **Fase 6** — Modul 6 Proktor Dashboard (polling 5s, no Socket.io)
  - List sesi `/proctor/sessions` (Aktif / Riwayat) + detail `/proctor/sessions/[id]`
  - Per sesi: timer live, violation count, log violation, gallery snapshot webcam
  - Aksi proktor: kirim peringatan, tambah waktu, force-end sesi
  - Mahasiswa heartbeat: peringatan toast live, auto-submit saat force-end, sync timer saat extend
  - Penilaian essay `/proctor/grading` — auto re-compute skor attempt + ExamSession + award EXAM_PASS saat lulus FINAL
- [x] **Fase 7** — Modul 7 Sertifikat + verify publik
  - Auto-issue saat lulus FINAL (submit + essay grading) + 100 poin CERT_EARNED idempotent
  - Cert number custom per course: `Course.certNumberPrefix` + `certNumberPattern` token `{PREFIX} {YEAR} {MONTH} {SEQ} {SEQ4}`; SEQ monotonik per course (mis. `FASILKOM-PEL/2025/0001`)
  - Print-friendly `/certificates/[number]` (owner/staff) + list `/certificates` + admin per-course `/labs/[slug]/courses/[id]/edit/certificates`
  - Public verify `/cert/[number]` (no auth, middleware whitelisted) — render dokumen + banner verified
  - QR via api.qrserver.com → payload = `${APP_URL}/cert/${certNumber}`
  - **Template designer per course** `/labs/[slug]/courses/[id]/edit/certificates/template` — upload background URL + drag-to-position fields, edit per-field (text/x/y/font/color/align/width/qrSize). Field types: title, recipientName, certNumber, courseTitle, qr, custom, dst.
  - **Backfill** sertifikat untuk mahasiswa yang sudah lulus final exam tapi belum dapat sertifikat (idempotent + award CERT_EARNED 100 poin)
  - **Admin manage** `/admin/certificates` (LAB_ADMIN + SUPERADMIN) — list semua course dengan tombol Template + Backfill, list semua sertifikat lintas course; nav "Kelola Sertifikat" untuk admin, "Sertifikat" personal khusus mahasiswa
- [~] **Fase 8** — Modul 8 Analytics + export CSV (kompatibel Excel)
  - Landing `/analytics` (LAB_ADMIN + SUPERADMIN) — stat agregat + grafik (line tren sertifikat 12 bulan, bar top course) + nav 3 sub-laporan
  - Grafik SVG inline (zero-dep) — `LineChart`, `BarChart`, `Donut` di [src/components/charts.tsx](src/components/charts.tsx)
  - **Analisa AI** (Google Gemini) — endpoint `POST /api/analytics/ai-insights` mengirim snapshot agregat (tanpa PII) ke model, mengembalikan: program prioritas, program unggulan, saran konkret untuk manajer lab (konten/operasional/kolaborasi/asesmen), saran untuk pencapaian IKU (IKU 1/2/6/7/8), dan risiko. UI di [src/components/ai-insights.tsx](src/components/ai-insights.tsx). Aktifkan dengan mengisi `GEMINI_API_KEY` di `.env` (dapat gratis di https://aistudio.google.com/app/apikey, model default `gemini-2.0-flash`).
  - **Mahasiswa Bersertifikasi** `/analytics/certified` — daftar penerima sertifikat + filter lab/course/tanggal/pencarian + export CSV
  - **Laporan per Pelatihan** `/analytics/per-course` — agregasi per course: enrollment, sertifikat terbit, % kelulusan, attempt final, lulus final, avg skor, total pelanggaran + export CSV
  - **Custom Report** `/analytics/custom` — pilih dataset (mahasiswa / enrollment / sertifikat / sesi ujian) + parameter lab, course, rentang tanggal, status, search + export CSV
  - Scope otomatis: superadmin lihat semua lab; LAB_ADMIN dan asisten hanya lab yang dikelola
  - Export endpoint terpadu `/api/analytics/export?type=certified|per-course|custom` (CSV UTF-8 BOM)
- [x] **Fase 9** — Modul 9 Kelola Pengguna, Role, Rule, & Policy (flexible RBAC)
  - **Schema RBAC** baru: `Permission`, `Policy`, `PolicyPermission`, `CustomRole`, `CustomRolePermission` (rule per role), `CustomRolePolicy`, `UserCustomRole`. Field `User.isActive` untuk soft-disable akun.
  - **Katalog terpusat** di [src/lib/rbac-catalog.ts](src/lib/rbac-catalog.ts): 50+ permission (kategori: Pengguna, Role&Policy, Lab, TOR&Proker, Course, Quiz&Exam, Proctor, Sertifikat, Merch&Poin, Badge, Analytics), 6 policy bawaan, 4 system custom role (mirroring base role).
  - **ABAC resolver** di [src/lib/abac.ts](src/lib/abac.ts): `getUserPermissions(userId)` menggabungkan system role (base) + assigned custom roles → policies → permissions, dengan aturan **DENY menang atas ALLOW**.
  - **Kelola Pengguna** `/admin/users` — list dengan filter (search/role/status), stat per role, CRUD penuh:
    - Buat akun (otomatis email-verified), assign multiple custom role saat create
    - Edit data + role bawaan + assignment custom role dalam satu dialog
    - Toggle aktif/non-aktif (akun non-aktif tidak bisa login & permission-nya kosong)
    - Reset password (dengan validasi min 8 char)
    - Hapus akun (terkunci untuk diri sendiri & superadmin terakhir)
  - **Kelola Role Custom** `/admin/roles` — buat role dengan key/name/baseRole; halaman edit `/admin/roles/[id]` dengan dua tab:
    - **Policies**: pilih bundle policy reusable
    - **Rules per permission**: override per-permission (ALLOW/DENY) tri-state — klik tombol untuk berputar Tidak diatur → ALLOW → DENY; bulk per-kategori dan pencarian
    - Preview **permission efektif** real-time (sudah resolve DENY)
  - **Kelola Policy** `/admin/policies` — buat policy dengan key + nama; halaman edit dengan tri-state editor permission yang identik UX-nya dengan editor rule role
  - **Katalog Permission** `/admin/permissions` — view semua permission per kategori; admin bisa menambah permission custom di luar katalog bawaan (untuk fitur internal)
  - **Lock keamanan**: role/policy/permission `isSystem: true` tidak bisa dihapus (resolver kode bergantung padanya). Key prefix `system.` direservasi.
  - **Endpoint** terpusat di `/api/admin/{users|roles|policies|permissions}/...` — semua dijaga dengan `userCan(session.user.id, "<permission>")` bukan hardcoded role check.
  - **Backward-compat**: base role enum tetap (SUPERADMIN/LAB_ADMIN/PROCTOR/MAHASISWA) → sidebar nav, gating lama, dan helper `perms.ts` tetap jalan. RBAC baru adalah layer di atas, opsional untuk delegasi granular.

## Setup pertama kali

### 1. Install dependensi

Disarankan pakai **pnpm**, tapi `npm` / `yarn` juga jalan.

```bash
pnpm install
```

### 2. Jalankan PostgreSQL via Docker

```bash
docker compose up -d
```

Database akan tersedia di `localhost:5432` dengan user `utc` / password `utc_dev_password` / db `utc_nextgen`.

### 3. Konfigurasi environment

```bash
cp .env.example .env
```

Lalu edit `.env`:

- `AUTH_SECRET` — generate dengan `openssl rand -base64 32`
- `RESEND_API_KEY` — opsional. Kalau kosong, link verifikasi akan di-log ke console (memudahkan dev tanpa email).
- `UPLOADTHING_TOKEN` — placeholder, dipakai mulai Modul 3.

### 4. Migrasi & seed

```bash
pnpm db:migrate     # buat tabel dari schema.prisma (akan minta nama migrasi)
pnpm db:seed        # isi data awal
```

### 5. Jalankan dev server

```bash
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Akun bawaan (password: `password123`)

| Role        | Email                              |
| ----------- | ---------------------------------- |
| Superadmin  | `superadmin@utc.unsri.ac.id`       |
| Lab Admin   | `admin.si@utc.unsri.ac.id`         |
| Lab Admin   | `admin.jk@utc.unsri.ac.id`         |
| Proctor     | `proctor1@utc.unsri.ac.id`         |
| Proctor     | `proctor2@utc.unsri.ac.id`         |
| Mahasiswa   | `mhs1@student.unsri.ac.id` … `mhs15` |

## Skrip yang berguna

| Skrip                | Fungsi                                       |
| -------------------- | -------------------------------------------- |
| `pnpm dev`           | Dev server                                   |
| `pnpm build`         | Production build                             |
| `pnpm lint`          | ESLint                                       |
| `pnpm typecheck`     | `tsc --noEmit`                               |
| `pnpm db:generate`   | Generate Prisma client                       |
| `pnpm db:migrate`    | `prisma migrate dev`                         |
| `pnpm db:seed`       | Jalankan seed                                |
| `pnpm db:studio`     | Buka Prisma Studio                           |
| `pnpm db:reset`      | Drop + migrate + seed (destruktif!)          |

## Struktur folder

```
prisma/
  schema.prisma           # Skema DB lengkap (semua 9 modul)
  seed.ts                 # Data awal
src/
  app/
    layout.tsx            # Root layout (theme + session + toaster)
    page.tsx              # Landing publik
    (auth)/               # Group route untuk halaman auth
      layout.tsx
      login/
      register/
      verify-email/
    (dashboard)/          # Group route untuk area login
      layout.tsx          # Sidebar + topbar
      dashboard/
      profile/
    verify/[token]/       # Email verification handler
    api/
      auth/[...nextauth]/ # NextAuth handlers
      register/
      profile/
  auth.ts                 # NextAuth config
  middleware.ts           # Auth gate
  components/
    ui/                   # shadcn primitives (button, input, label, card, ...)
    sidebar.tsx
    topbar.tsx
    theme-provider.tsx
    theme-toggle.tsx
    session-provider.tsx
  lib/
    prisma.ts             # Prisma singleton
    utils.ts
    zod-schemas.ts
    email.ts              # Resend wrapper
    points.ts             # Award helper + transactional ledger
    nav.ts                # Sidebar items by role
    fontawesome.ts        # FA SSR config
  types/
    next-auth.d.ts        # Augmentasi session/token
docker-compose.yml
.env.example
```

## Catatan keamanan

- Password di-hash dengan **bcryptjs** (cost 10).
- Token verifikasi 32-byte hex, valid 24 jam, single-use.
- Semua mutasi memakai validasi Zod di server.
- `awardPoints()` selalu transactional (ledger + balance konsisten).

## Lanjut ke Fase 2

Setelah Anda verifikasi Fase 1 berjalan (register → cek email/console → verify → login → dashboard → edit profil), beri perintah untuk lanjut **Modul 2: Lab Management**.
"# utc-nextgen" 

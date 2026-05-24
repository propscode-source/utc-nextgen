/**
 * RBAC catalog — sumber tunggal untuk Permission, Policy, dan built-in CustomRole.
 * Dipakai oleh:
 *  - `prisma/seed.ts` untuk membuat baris awal di DB
 *  - `src/lib/abac.ts` untuk resolver permission
 *  - UI admin sebagai default label kategori
 *
 * Skema permission: "<resource>.<action>" — lowercase + dot + snake_case.
 * Untuk menambah permission baru: tambahkan di PERMISSION_CATALOG (jangan
 * mengganti key yang sudah ada — itu akan memutus assignment lama).
 */

export type PermissionDef = {
  key: string;
  category: string;
  label: string;
  description: string;
};

export const PERMISSION_CATALOG: PermissionDef[] = [
  // ---- Pengguna & RBAC ----
  { key: "user.view", category: "Pengguna", label: "Lihat daftar pengguna", description: "Akses ke halaman daftar pengguna." },
  { key: "user.create", category: "Pengguna", label: "Buat pengguna baru", description: "Menambahkan akun pengguna baru beserta role-nya." },
  { key: "user.edit", category: "Pengguna", label: "Edit data pengguna", description: "Ubah nama, email, NIM, prodi, status aktif." },
  { key: "user.set_role", category: "Pengguna", label: "Ubah role pengguna", description: "Mengganti base role (SUPERADMIN/LAB_ADMIN/PROCTOR/MAHASISWA)." },
  { key: "user.reset_password", category: "Pengguna", label: "Reset password pengguna", description: "Mengeset ulang password pengguna ke nilai sementara." },
  { key: "user.delete", category: "Pengguna", label: "Hapus pengguna", description: "Menghapus akun pengguna secara permanen." },
  { key: "user.assign_custom_role", category: "Pengguna", label: "Assign custom role ke pengguna", description: "Memberi/menarik custom role yang sudah didefinisikan." },

  { key: "role.view", category: "Role & Policy", label: "Lihat role custom", description: "Akses ke halaman role custom." },
  { key: "role.manage", category: "Role & Policy", label: "Kelola role custom", description: "Buat, edit, hapus custom role + atur rules-nya." },
  { key: "policy.manage", category: "Role & Policy", label: "Kelola policy", description: "Buat, edit, hapus policy + atur permission di dalamnya." },
  { key: "permission.manage", category: "Role & Policy", label: "Kelola permission custom", description: "Menambah permission baru di luar katalog bawaan." },

  // ---- Lab ----
  { key: "lab.view", category: "Lab", label: "Lihat lab", description: "Akses halaman /labs dan detail lab." },
  { key: "lab.create", category: "Lab", label: "Buat lab", description: "Tambah lab baru." },
  { key: "lab.edit", category: "Lab", label: "Edit lab", description: "Ubah profil/anggota lab yang dikelola." },
  { key: "lab.delete", category: "Lab", label: "Hapus lab", description: "Menghapus lab beserta data turunannya." },
  { key: "lab.assign_admin", category: "Lab", label: "Tunjuk lab admin", description: "Menetapkan user sebagai admin sebuah lab." },
  { key: "lab.member.manage", category: "Lab", label: "Kelola anggota lab", description: "Tambah/hapus anggota lab." },
  { key: "lab.assistant.toggle", category: "Lab", label: "Promosi/turun asisten", description: "Mengangkat anggota sebagai asisten lab." },

  // ---- TOR / Proker / Aset ----
  { key: "tor.view", category: "TOR & Proker", label: "Lihat TOR", description: "Lihat daftar dan detail TOR lab." },
  { key: "tor.manage", category: "TOR & Proker", label: "Kelola TOR (CRUD)", description: "Buat, edit, hapus TOR." },
  { key: "tor.submit", category: "TOR & Proker", label: "Submit TOR", description: "Ajukan TOR untuk disetujui superadmin." },
  { key: "tor.approve", category: "TOR & Proker", label: "Setujui / tolak TOR", description: "Approve atau reject TOR yang masuk." },
  { key: "project.manage", category: "TOR & Proker", label: "Kelola proker", description: "CRUD project & milestone." },
  { key: "asset.manage", category: "TOR & Proker", label: "Kelola aset lab", description: "CRUD aset lab." },

  // ---- Course / LMS ----
  { key: "course.view", category: "Course", label: "Lihat course", description: "Akses katalog course." },
  { key: "course.manage", category: "Course", label: "Kelola course (CRUD)", description: "Buat, edit, hapus course di lab yang dikelola." },
  { key: "section.manage", category: "Course", label: "Kelola section", description: "CRUD section pada course." },
  { key: "lesson.manage", category: "Course", label: "Kelola lesson", description: "CRUD lesson, upload materi." },
  { key: "course.enroll_self", category: "Course", label: "Daftar course (sendiri)", description: "Mendaftarkan diri ke course." },

  // ---- Quiz & Exam ----
  { key: "quiz.manage", category: "Quiz & Exam", label: "Kelola quiz & soal", description: "CRUD quiz, soal, pilihan jawaban." },
  { key: "quiz.attempt", category: "Quiz & Exam", label: "Mengerjakan quiz", description: "Mahasiswa boleh mengerjakan quiz." },
  { key: "exam.attempt", category: "Quiz & Exam", label: "Mengerjakan ujian", description: "Mulai & submit pretest/final exam." },

  // ---- Proctor ----
  { key: "proctor.view", category: "Proctor", label: "Lihat sesi ujian", description: "Akses dashboard proctor." },
  { key: "proctor.act", category: "Proctor", label: "Aksi proctor", description: "Kirim peringatan, force-end, tambah waktu sesi ujian." },
  { key: "essay.grade", category: "Proctor", label: "Nilai essay", description: "Memberi skor manual untuk soal essay." },

  // ---- Sertifikat ----
  { key: "cert.view_own", category: "Sertifikat", label: "Lihat sertifikat sendiri", description: "Mahasiswa melihat dan cetak sertifikatnya." },
  { key: "cert.view_all", category: "Sertifikat", label: "Lihat semua sertifikat", description: "Akses ke /admin/certificates dan list lintas course." },
  { key: "cert.template", category: "Sertifikat", label: "Edit template sertifikat", description: "Mendesain layout sertifikat per course." },
  { key: "cert.backfill", category: "Sertifikat", label: "Backfill sertifikat", description: "Generate sertifikat untuk yang sudah lulus tapi belum diterbitkan." },

  // ---- Merchandise & Poin ----
  { key: "merch.view", category: "Merch & Poin", label: "Lihat katalog merch", description: "Akses halaman /redeem." },
  { key: "merch.manage", category: "Merch & Poin", label: "Kelola merchandise", description: "CRUD item, voucher, stok." },
  { key: "merch.redeem", category: "Merch & Poin", label: "Tukar poin", description: "Mahasiswa boleh menukar poin dengan merch." },
  { key: "redemption.process", category: "Merch & Poin", label: "Proses penukaran", description: "Update status, kirim kode voucher, kirim resi." },

  // ---- Badge ----
  { key: "badge.view", category: "Badge", label: "Lihat badge", description: "Akses daftar badge." },
  { key: "badge.manage", category: "Badge", label: "Kelola badge", description: "Tambah, edit, hapus badge custom." },
  { key: "badge.award", category: "Badge", label: "Award badge manual", description: "Memberi badge ke mahasiswa tertentu." },

  // ---- Analytics ----
  { key: "analytics.view", category: "Analytics", label: "Akses analytics", description: "Lihat dashboard analytics." },
  { key: "analytics.export", category: "Analytics", label: "Export CSV analytics", description: "Mengunduh laporan analytics." },
  { key: "analytics.ai", category: "Analytics", label: "Analisa AI", description: "Memanggil Gemini untuk insight AI." },

  // ---- Event / Campaign ----
  { key: "event.view", category: "Event", label: "Lihat event", description: "Akses daftar event/kampanye." },
  { key: "event.manage", category: "Event", label: "Kelola event (CRUD)", description: "Buat, edit, hapus event/kampanye." },
  { key: "event.attendance.manage", category: "Event", label: "Kelola presensi event", description: "Tandai kehadiran peserta dan finalisasi pemberian poin." },
  { key: "event.attend", category: "Event", label: "Isi presensi event", description: "Peserta mengisi presensi pada event yang sedang berlangsung." },
];

export type PolicyDef = {
  key: string;
  name: string;
  description: string;
  permissionKeys: string[]; // keys from PERMISSION_CATALOG
};

const ALL_KEYS = PERMISSION_CATALOG.map((p) => p.key);

export const POLICY_CATALOG: PolicyDef[] = [
  {
    key: "policy.superadmin_full",
    name: "Akses penuh Superadmin",
    description: "Semua permission. Hanya untuk role Superadmin.",
    permissionKeys: ALL_KEYS,
  },
  {
    key: "policy.lab_admin_default",
    name: "Default Lab Admin",
    description: "Kelola lab miliknya: course, TOR, proker, aset, sertifikat, analytics lab.",
    permissionKeys: [
      "lab.view",
      "lab.edit",
      "lab.member.manage",
      "lab.assistant.toggle",
      "tor.view",
      "tor.manage",
      "tor.submit",
      "project.manage",
      "asset.manage",
      "course.view",
      "course.manage",
      "section.manage",
      "lesson.manage",
      "quiz.manage",
      "cert.view_all",
      "cert.template",
      "cert.backfill",
      "merch.view",
      "merch.manage",
      "redemption.process",
      "badge.view",
      "analytics.view",
      "analytics.export",
      "analytics.ai",
      "user.view",
      "event.view",
      "event.manage",
      "event.attendance.manage",
    ],
  },
  {
    key: "policy.proctor_default",
    name: "Default Proctor",
    description: "Memantau sesi ujian dan menilai essay.",
    permissionKeys: [
      "lab.view",
      "course.view",
      "proctor.view",
      "proctor.act",
      "essay.grade",
      "merch.view",
      "badge.view",
    ],
  },
  {
    key: "policy.mahasiswa_default",
    name: "Default Mahasiswa",
    description: "Belajar, ikut quiz/exam, tukar poin.",
    permissionKeys: [
      "course.view",
      "course.enroll_self",
      "quiz.attempt",
      "exam.attempt",
      "cert.view_own",
      "merch.view",
      "merch.redeem",
      "badge.view",
      "event.view",
      "event.attend",
    ],
  },
  {
    key: "policy.user_management",
    name: "Kelola Pengguna",
    description: "Bundle khusus untuk delegasi manajemen user (tanpa hak root lain).",
    permissionKeys: [
      "user.view",
      "user.create",
      "user.edit",
      "user.set_role",
      "user.reset_password",
      "user.assign_custom_role",
    ],
  },
  {
    key: "policy.rbac_management",
    name: "Kelola Role & Policy",
    description: "Mengelola katalog RBAC: role custom, policy, permission.",
    permissionKeys: ["role.view", "role.manage", "policy.manage", "permission.manage"],
  },
];

export type CustomRoleDef = {
  key: string;
  name: string;
  description: string;
  baseRole: "SUPERADMIN" | "LAB_ADMIN" | "PROCTOR" | "MAHASISWA";
  policyKeys: string[];
};

export const SYSTEM_ROLE_CATALOG: CustomRoleDef[] = [
  {
    key: "system.superadmin",
    name: "Superadmin",
    description: "Role bawaan dengan akses penuh ke seluruh sistem.",
    baseRole: "SUPERADMIN",
    policyKeys: ["policy.superadmin_full"],
  },
  {
    key: "system.lab_admin",
    name: "Lab Admin",
    description: "Role bawaan untuk admin lab.",
    baseRole: "LAB_ADMIN",
    policyKeys: ["policy.lab_admin_default"],
  },
  {
    key: "system.proctor",
    name: "Proctor",
    description: "Role bawaan untuk pengawas ujian.",
    baseRole: "PROCTOR",
    policyKeys: ["policy.proctor_default"],
  },
  {
    key: "system.mahasiswa",
    name: "Mahasiswa",
    description: "Role bawaan untuk peserta pelatihan.",
    baseRole: "MAHASISWA",
    policyKeys: ["policy.mahasiswa_default"],
  },
];

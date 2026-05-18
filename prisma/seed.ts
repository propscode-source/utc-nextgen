import {
  PrismaClient,
  Role,
  LessonType,
  QuizKind,
  QuestionType,
  PointEvent,
  TorStatus,
  ProjectStatus,
  AssetCondition,
  MerchKind,
  LabMemberRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding UTC NextGen…");

  // ---------- BADGES ----------
  const badgesData = [
    { code: "first_course", name: "First Course", description: "Menyelesaikan course pertama", iconClass: "fa-solid fa-graduation-cap" },
    { code: "quiz_streak", name: "Quiz Streak", description: "Lulus 5 quiz berturut-turut", iconClass: "fa-solid fa-fire" },
    { code: "lab_master", name: "Lab Master", description: "Menyelesaikan semua course di sebuah lab", iconClass: "fa-solid fa-flask" },
    { code: "top_learner", name: "Top Learner", description: "Masuk top 10 leaderboard mingguan", iconClass: "fa-solid fa-crown" },
  ];
  for (const b of badgesData) {
    await prisma.badge.upsert({ where: { code: b.code }, update: b, create: b });
  }

  // ---------- USERS ----------
  const passwordHash = await bcrypt.hash("password123", 10);
  const now = new Date();

  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@utc.unsri.ac.id" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@utc.unsri.ac.id",
      password: passwordHash,
      role: Role.SUPERADMIN,
      emailVerified: now,
      points: 100,
    },
  });

  const labAdmin1 = await prisma.user.upsert({
    where: { email: "admin.si@utc.unsri.ac.id" },
    update: {},
    create: {
      name: "Admin Lab SI",
      email: "admin.si@utc.unsri.ac.id",
      password: passwordHash,
      role: Role.LAB_ADMIN,
      emailVerified: now,
      points: 100,
    },
  });

  const labAdmin2 = await prisma.user.upsert({
    where: { email: "admin.jk@utc.unsri.ac.id" },
    update: {},
    create: {
      name: "Admin Lab JK",
      email: "admin.jk@utc.unsri.ac.id",
      password: passwordHash,
      role: Role.LAB_ADMIN,
      emailVerified: now,
      points: 100,
    },
  });

  const proctor1 = await prisma.user.upsert({
    where: { email: "proctor1@utc.unsri.ac.id" },
    update: {},
    create: {
      name: "Proctor Satu",
      email: "proctor1@utc.unsri.ac.id",
      password: passwordHash,
      role: Role.PROCTOR,
      emailVerified: now,
      points: 100,
    },
  });

  const proctor2 = await prisma.user.upsert({
    where: { email: "proctor2@utc.unsri.ac.id" },
    update: {},
    create: {
      name: "Proctor Dua",
      email: "proctor2@utc.unsri.ac.id",
      password: passwordHash,
      role: Role.PROCTOR,
      emailVerified: now,
      points: 100,
    },
  });

  const prodis = ["Sistem Informasi", "Teknik Informatika", "Sistem Komputer"];
  const mahasiswas = [];
  for (let i = 1; i <= 15; i++) {
    const nim = `09011382326${String(i).padStart(3, "0")}`;
    const m = await prisma.user.upsert({
      where: { email: `mhs${i}@student.unsri.ac.id` },
      update: {},
      create: {
        nim,
        name: `Mahasiswa ${i}`,
        email: `mhs${i}@student.unsri.ac.id`,
        password: passwordHash,
        role: Role.MAHASISWA,
        prodi: prodis[i % prodis.length],
        angkatan: 2023,
        emailVerified: now,
        points: 100,
      },
    });
    mahasiswas.push(m);
  }

  // Backfill REGISTER points ledger for everyone
  const allUsers = [superadmin, labAdmin1, labAdmin2, proctor1, proctor2, ...mahasiswas];
  for (const u of allUsers) {
    const existing = await prisma.pointsLedger.findFirst({
      where: { userId: u.id, event: PointEvent.REGISTER },
    });
    if (!existing) {
      await prisma.pointsLedger.create({
        data: { userId: u.id, event: PointEvent.REGISTER, delta: 100, reason: "Pendaftaran akun" },
      });
    }
  }

  // ---------- LABS ----------
  const labSI = await prisma.lab.upsert({
    where: { slug: "lab-sistem-informasi" },
    update: { adminId: labAdmin1.id },
    create: {
      slug: "lab-sistem-informasi",
      name: "Lab Sistem Informasi",
      description: "Laboratorium pengembangan sistem informasi & basis data.",
      adminId: labAdmin1.id,
    },
  });

  const labJK = await prisma.lab.upsert({
    where: { slug: "lab-jaringan-keamanan" },
    update: { adminId: labAdmin2.id },
    create: {
      slug: "lab-jaringan-keamanan",
      name: "Lab Jaringan & Keamanan",
      description: "Laboratorium jaringan komputer dan keamanan siber.",
      adminId: labAdmin2.id,
    },
  });

  // Lab membership: half mahasiswa per lab
  for (let i = 0; i < mahasiswas.length; i++) {
    await prisma.labMember.upsert({
      where: { labId_userId: { labId: i % 2 === 0 ? labSI.id : labJK.id, userId: mahasiswas[i].id } },
      update: {},
      create: { labId: i % 2 === 0 ? labSI.id : labJK.id, userId: mahasiswas[i].id },
    });
  }

  // ---------- COURSES ----------
  const courseDefs = [
    { slug: "fundamental-database", title: "Fundamental Database", labId: labSI.id, description: "Konsep dasar SQL, normalisasi, dan ERD." },
    { slug: "web-fullstack-nextjs", title: "Web Fullstack dengan Next.js", labId: labSI.id, description: "Membangun aplikasi web modern dengan Next.js + Prisma." },
    { slug: "intro-cyber-security", title: "Pengantar Cyber Security", labId: labJK.id, description: "Fundamental keamanan informasi dan etika hacking." },
    { slug: "jaringan-komputer-dasar", title: "Jaringan Komputer Dasar", labId: labJK.id, description: "Model OSI, TCP/IP, routing, dan subnetting." },
    { slug: "linux-server-admin", title: "Administrasi Server Linux", labId: labJK.id, description: "Instalasi, hardening, dan pemeliharaan server Linux." },
  ];

  for (const c of courseDefs) {
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        labId: c.labId,
        passScore: 70,
      },
    });

    // 3 sections per course
    for (let s = 1; s <= 3; s++) {
      const section = await prisma.section.upsert({
        where: { courseId_order: { courseId: course.id, order: s } },
        update: {},
        create: {
          courseId: course.id,
          title: `Section ${s}: ${c.title} – Bagian ${s}`,
          order: s,
        },
      });

      // 2 lessons per section
      for (let l = 1; l <= 2; l++) {
        await prisma.lesson.upsert({
          where: { sectionId_order: { sectionId: section.id, order: l } },
          update: {},
          create: {
            sectionId: section.id,
            order: l,
            title: `Lesson ${s}.${l}`,
            type: l === 1 ? LessonType.VIDEO : LessonType.TEXT,
            contentText: l === 1 ? null : `Materi teks untuk section ${s} lesson ${l} pada course ${c.title}.`,
            contentUrl: l === 1 ? "https://www.youtube.com/embed/dQw4w9WgXcQ" : null,
            durationSec: l === 1 ? 600 : null,
          },
        });
      }

      // Quiz per section (3 MCQ)
      const existingQuiz = await prisma.quiz.findUnique({ where: { sectionId: section.id } });
      if (!existingQuiz) {
        const quiz = await prisma.quiz.create({
          data: {
            kind: QuizKind.SECTION,
            title: `Quiz Section ${s} - ${c.title}`,
            sectionId: section.id,
            minScore: 70,
            maxAttempts: 3,
          },
        });
        for (let q = 1; q <= 3; q++) {
          const question = await prisma.question.create({
            data: {
              quizId: quiz.id,
              type: QuestionType.MCQ,
              order: q,
              text: `Pertanyaan ${q} untuk Section ${s} pada course ${c.title}?`,
              points: 1,
            },
          });
          for (let ch = 1; ch <= 4; ch++) {
            await prisma.choice.create({
              data: {
                questionId: question.id,
                text: `Pilihan ${ch}`,
                isCorrect: ch === 1, // first choice is correct
                order: ch,
              },
            });
          }
        }
      }
    }

    // Final exam (5 MCQ)
    const existingFinal = await prisma.quiz.findUnique({ where: { finalCourseId: course.id } });
    if (!existingFinal) {
      const finalQuiz = await prisma.quiz.create({
        data: {
          kind: QuizKind.FINAL,
          title: `Final Exam - ${c.title}`,
          finalCourseId: course.id,
          minScore: course.passScore,
          maxAttempts: 2,
          timerSec: 60 * 60, // 60 min
        },
      });
      for (let q = 1; q <= 5; q++) {
        const question = await prisma.question.create({
          data: {
            quizId: finalQuiz.id,
            type: QuestionType.MCQ,
            order: q,
            text: `Final question ${q} - ${c.title}?`,
            points: 1,
          },
        });
        for (let ch = 1; ch <= 4; ch++) {
          await prisma.choice.create({
            data: {
              questionId: question.id,
              text: `Opsi ${ch}`,
              isCorrect: ch === 1,
              order: ch,
            },
          });
        }
      }
    }
  }

  // ---------- LAB MANAGEMENT (Phase 2) ----------
  const torDocSI = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Latar Belakang" }] },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Lab Sistem Informasi membutuhkan kerangka acuan kerja untuk pelatihan basis data tahun ini.",
          },
        ],
      },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Tujuan" }] },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Meningkatkan kompetensi mahasiswa" }] }],
          },
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Menyediakan modul standar" }] }],
          },
        ],
      },
    ],
  };

  const torExisting = await prisma.tor.findFirst({ where: { labId: labSI.id } });
  if (!torExisting) {
    await prisma.tor.create({
      data: {
        labId: labSI.id,
        title: "TOR Pelatihan Basis Data 2025",
        contentJson: torDocSI,
        status: TorStatus.SUBMITTED,
      },
    });
    await prisma.tor.create({
      data: {
        labId: labSI.id,
        title: "TOR Workshop Web Modern",
        contentJson: torDocSI,
        status: TorStatus.DRAFT,
      },
    });
    await prisma.tor.create({
      data: {
        labId: labJK.id,
        title: "TOR Sertifikasi Cyber Security",
        contentJson: torDocSI,
        status: TorStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }

  // Projects per lab
  const projectsByLab: Record<string, Array<{ title: string; status: ProjectStatus; budget: number; budgetUsed: number }>> = {
    [labSI.id]: [
      { title: "Persiapan kurikulum", status: ProjectStatus.DONE, budget: 5_000_000, budgetUsed: 4_500_000 },
      { title: "Pengadaan komputer praktik", status: ProjectStatus.IN_PROGRESS, budget: 80_000_000, budgetUsed: 32_000_000 },
      { title: "Pelatihan asisten", status: ProjectStatus.TODO, budget: 3_000_000, budgetUsed: 0 },
      { title: "Audit modul ajar", status: ProjectStatus.REVIEW, budget: 2_000_000, budgetUsed: 1_200_000 },
    ],
    [labJK.id]: [
      { title: "Setup lab CTF", status: ProjectStatus.IN_PROGRESS, budget: 15_000_000, budgetUsed: 5_000_000 },
      { title: "Sertifikasi proktor", status: ProjectStatus.TODO, budget: 4_000_000, budgetUsed: 0 },
      { title: "Refresh switch core", status: ProjectStatus.DONE, budget: 12_000_000, budgetUsed: 11_500_000 },
    ],
  };

  for (const [labId, projects] of Object.entries(projectsByLab)) {
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const existing = await prisma.project.findFirst({ where: { labId, title: p.title } });
      if (!existing) {
        const created = await prisma.project.create({
          data: {
            labId,
            title: p.title,
            description: `Proyek kerja: ${p.title}.`,
            status: p.status,
            position: i,
            budget: p.budget,
            budgetUsed: p.budgetUsed,
            startsAt: new Date(),
            dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
          },
        });
        await prisma.milestone.createMany({
          data: [
            { projectId: created.id, title: "Perencanaan", done: true, completedAt: new Date() },
            { projectId: created.id, title: "Eksekusi", done: p.status === ProjectStatus.DONE },
            { projectId: created.id, title: "Evaluasi", done: p.status === ProjectStatus.DONE },
          ],
        });
      }
    }
  }

  // Assets
  const assetsByLab: Record<string, Array<{ name: string; code: string; quantity: number; condition: AssetCondition; cost: number }>> = {
    [labSI.id]: [
      { name: "PC Praktik Dell OptiPlex", code: "SI-PC-001", quantity: 30, condition: AssetCondition.GOOD, cost: 12_000_000 },
      { name: "Proyektor Epson", code: "SI-PRJ-001", quantity: 2, condition: AssetCondition.GOOD, cost: 8_000_000 },
      { name: "Whiteboard 120x240", code: "SI-WB-001", quantity: 3, condition: AssetCondition.NEEDS_REPAIR, cost: 1_500_000 },
    ],
    [labJK.id]: [
      { name: "Cisco Catalyst Switch", code: "JK-NET-001", quantity: 4, condition: AssetCondition.GOOD, cost: 25_000_000 },
      { name: "Mikrotik RouterBoard", code: "JK-NET-002", quantity: 8, condition: AssetCondition.GOOD, cost: 3_500_000 },
      { name: "Kabel UTP Cat6 (gulung)", code: "JK-CBL-001", quantity: 5, condition: AssetCondition.GOOD, cost: 1_200_000 },
    ],
  };

  for (const [labId, assets] of Object.entries(assetsByLab)) {
    for (const a of assets) {
      await prisma.asset.upsert({
        where: { code: a.code },
        update: {},
        create: {
          labId,
          name: a.name,
          code: a.code,
          quantity: a.quantity,
          condition: a.condition,
          acquiredCost: a.cost,
          acquiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        },
      });
    }
  }

  // ---------- MERCHANDISE (Phase 4) ----------
  const merchItems = [
    {
      slug: "stiker-utc",
      name: "Stiker UTC NextGen (10 pcs)",
      description: "Paket stiker laptop dengan logo UTC NextGen, vinyl waterproof.",
      pointPrice: 200,
      stock: -1, // unlimited
      imageUrl: null,
      kind: MerchKind.PHYSICAL,
    },
    {
      slug: "kaos-utc-basic",
      name: "Kaos UTC NextGen (Basic)",
      description: "Kaos cotton combed 30s. Tersedia ukuran S–XL.",
      pointPrice: 1500,
      stock: 50,
      imageUrl: null,
      kind: MerchKind.PHYSICAL,
    },
    {
      slug: "tumbler-utc",
      name: "Tumbler Stainless 500ml",
      description: "Tumbler isolasi double-wall, custom branding UTC.",
      pointPrice: 2500,
      stock: 20,
      imageUrl: null,
      kind: MerchKind.PHYSICAL,
    },
    {
      slug: "voucher-pulsa-25k",
      name: "Voucher Pulsa Rp25.000",
      description: "Voucher pulsa untuk semua operator. Dikirim digital oleh admin setelah klaim.",
      pointPrice: 1000,
      stock: 100,
      imageUrl: null,
      kind: MerchKind.VOUCHER,
    },
    {
      slug: "voucher-gopay-50k",
      name: "Voucher GoPay Rp50.000",
      description: "Saldo GoPay yang akan dikirim ke nomor terdaftar setelah verifikasi admin.",
      pointPrice: 2000,
      stock: 30,
      imageUrl: null,
      kind: MerchKind.VOUCHER,
    },
  ];
  for (const m of merchItems) {
    await prisma.merchItem.upsert({
      where: { slug: m.slug },
      update: { kind: m.kind },
      create: m,
    });
  }

  // ---------- ASISTEN LAB SAMPLE ----------
  // Promote mhs1 → asisten Lab SI; mhs2 → asisten Lab JK (idempotent).
  const mhs1 = mahasiswas[0];
  if (mhs1) {
    await prisma.labMember.upsert({
      where: { labId_userId: { labId: labSI.id, userId: mhs1.id } },
      update: { role: LabMemberRole.ASSISTANT },
      create: { labId: labSI.id, userId: mhs1.id, role: LabMemberRole.ASSISTANT },
    });
  }
  const mhs2 = mahasiswas[1];
  if (mhs2) {
    await prisma.labMember.upsert({
      where: { labId_userId: { labId: labJK.id, userId: mhs2.id } },
      update: { role: LabMemberRole.ASSISTANT },
      create: { labId: labJK.id, userId: mhs2.id, role: LabMemberRole.ASSISTANT },
    });
  }

  console.log("Seed selesai.");
  console.log("Akun login default (password: password123):");
  console.log("  superadmin@utc.unsri.ac.id");
  console.log("  admin.si@utc.unsri.ac.id");
  console.log("  admin.jk@utc.unsri.ac.id");
  console.log("  proctor1@utc.unsri.ac.id, proctor2@utc.unsri.ac.id");
  console.log("  mhs1..mhs15@student.unsri.ac.id");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

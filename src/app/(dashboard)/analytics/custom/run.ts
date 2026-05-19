import { prisma } from "@/lib/prisma";

export type CustomDataset = "students" | "enrollments" | "certificates" | "exam-sessions";

export type CustomParams = {
  lab?: string;
  course?: string;
  from?: string;
  to?: string;
  q?: string;
  status?: string;
};

export type CustomReport = {
  headers: string[];
  rows: (string | number | Date | null)[][];
};

const TAKE = 500;

function dateRange(p: CustomParams) {
  if (!p.from && !p.to) return undefined;
  return {
    ...(p.from && { gte: new Date(p.from) }),
    ...(p.to && { lte: new Date(p.to + "T23:59:59") }),
  };
}

export async function runCustomReport(
  dataset: CustomDataset,
  p: CustomParams,
  allowedLabIds: string[],
): Promise<CustomReport> {
  const courseScope = {
    labId: { in: allowedLabIds },
    ...(p.lab && { lab: { slug: p.lab } }),
    ...(p.course && { slug: p.course }),
  };
  const dr = dateRange(p);

  if (dataset === "students") {
    // Mahasiswa yang punya minimal 1 enrollment di scope lab/course filter.
    const users = await prisma.user.findMany({
      where: {
        role: "MAHASISWA",
        enrollments: { some: { course: courseScope } },
        ...(p.q && {
          OR: [
            { name: { contains: p.q, mode: "insensitive" as const } },
            { email: { contains: p.q, mode: "insensitive" as const } },
            { nim: { contains: p.q } },
          ],
        }),
        ...(dr && { createdAt: dr }),
      },
      select: {
        nim: true, name: true, email: true, prodi: true, angkatan: true, points: true, createdAt: true,
        _count: { select: { enrollments: true, certificates: true } },
      },
      orderBy: { name: "asc" },
      take: TAKE,
    });
    return {
      headers: ["NIM", "Nama", "Email", "Prodi", "Angkatan", "Poin", "Enrolled", "Sertifikat", "Daftar"],
      rows: users.map((u) => [
        u.nim, u.name, u.email, u.prodi, u.angkatan, u.points,
        u._count.enrollments, u._count.certificates, u.createdAt,
      ]),
    };
  }

  if (dataset === "enrollments") {
    const completed = p.status === "completed" ? { not: null } : p.status === "in-progress" ? null : undefined;
    const enrolls = await prisma.enrollment.findMany({
      where: {
        course: courseScope,
        ...(p.q && {
          user: {
            OR: [
              { name: { contains: p.q, mode: "insensitive" as const } },
              { email: { contains: p.q, mode: "insensitive" as const } },
              { nim: { contains: p.q } },
            ],
          },
        }),
        ...(dr && { enrolledAt: dr }),
        ...(completed !== undefined && { completedAt: completed }),
      },
      include: {
        user: { select: { nim: true, name: true, email: true } },
        course: { select: { title: true, lab: { select: { name: true } } } },
      },
      orderBy: { enrolledAt: "desc" },
      take: TAKE,
    });
    return {
      headers: ["NIM", "Nama", "Email", "Course", "Lab", "Progres %", "Daftar", "Selesai"],
      rows: enrolls.map((e) => [
        e.user.nim, e.user.name, e.user.email,
        e.course.title, e.course.lab.name, e.progressPct,
        e.enrolledAt, e.completedAt,
      ]),
    };
  }

  if (dataset === "certificates") {
    const certs = await prisma.certificate.findMany({
      where: {
        course: courseScope,
        ...(p.q && {
          OR: [
            { certNumber: { contains: p.q, mode: "insensitive" as const } },
            { user: { name: { contains: p.q, mode: "insensitive" as const } } },
            { user: { email: { contains: p.q, mode: "insensitive" as const } } },
            { user: { nim: { contains: p.q } } },
          ],
        }),
        ...(dr && { issuedAt: dr }),
      },
      include: {
        user: { select: { nim: true, name: true, email: true, prodi: true, angkatan: true } },
        course: { select: { title: true, lab: { select: { name: true } } } },
      },
      orderBy: { issuedAt: "desc" },
      take: TAKE,
    });
    return {
      headers: ["Nomor", "NIM", "Nama", "Email", "Prodi", "Angkatan", "Course", "Lab", "Diterbitkan"],
      rows: certs.map((c) => [
        c.certNumber, c.user.nim, c.user.name, c.user.email, c.user.prodi, c.user.angkatan,
        c.course.title, c.course.lab.name, c.issuedAt,
      ]),
    };
  }

  // exam-sessions
  const passed = p.status === "completed" ? true : p.status === "in-progress" ? false : undefined;
  const sessions = await prisma.examSession.findMany({
    where: {
      quiz: {
        OR: [
          { pretestCourse: courseScope },
          { finalCourse: courseScope },
        ],
      },
      ...(p.q && {
        user: {
          OR: [
            { name: { contains: p.q, mode: "insensitive" as const } },
            { email: { contains: p.q, mode: "insensitive" as const } },
            { nim: { contains: p.q } },
          ],
        },
      }),
      ...(dr && { createdAt: dr }),
      ...(passed !== undefined && { passed }),
    },
    include: {
      user: { select: { nim: true, name: true, email: true } },
      quiz: {
        select: {
          kind: true, title: true,
          pretestCourse: { select: { title: true, lab: { select: { name: true } } } },
          finalCourse: { select: { title: true, lab: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: TAKE,
  });
  return {
    headers: ["NIM", "Nama", "Course", "Lab", "Tipe", "Status", "Skor", "Lulus", "Pelanggaran", "Mulai", "Submit"],
    rows: sessions.map((s) => {
      const course = s.quiz.pretestCourse ?? s.quiz.finalCourse;
      return [
        s.user.nim, s.user.name,
        course?.title ?? s.quiz.title, course?.lab.name ?? null,
        s.quiz.kind, s.status, s.score, s.passed ? "Ya" : "Tidak",
        s.violationCount, s.startedAt, s.submittedAt,
      ];
    }),
  };
}

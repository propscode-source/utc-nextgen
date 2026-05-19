import { prisma } from "@/lib/prisma";

/**
 * Agregasi metrik lintas lab/course untuk dianalisis AI.
 * Hanya angka, tanpa PII — aman dikirim ke model eksternal.
 */
export async function buildAnalystSnapshot(allowedLabIds: string[]) {
  const [labs, courses, totalStudents, totalCerts, recentCerts] = await Promise.all([
    prisma.lab.findMany({
      where: { id: { in: allowedLabIds } },
      select: {
        id: true,
        name: true,
        _count: { select: { courses: true, members: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { labId: { in: allowedLabIds } },
      select: {
        id: true,
        title: true,
        passScore: true,
        lab: { select: { name: true } },
        finalQuiz: { select: { id: true } },
        _count: { select: { enrollments: true, certificates: true } },
      },
    }),
    prisma.enrollment
      .findMany({
        where: { course: { labId: { in: allowedLabIds } } },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),
    prisma.certificate.count({ where: { course: { labId: { in: allowedLabIds } } } }),
    prisma.certificate.findMany({
      where: {
        course: { labId: { in: allowedLabIds } },
        issuedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90) },
      },
      select: { issuedAt: true },
    }),
  ]);

  // Total enrollment (raw) untuk konteks utilisasi
  const totalEnrollments = courses.reduce((acc, c) => acc + c._count.enrollments, 0);

  // Statistik final exam per course
  const finalIds = courses.map((c) => c.finalQuiz?.id).filter((x): x is string => !!x);
  const [examStats, examPassed] = await Promise.all([
    finalIds.length
      ? prisma.examSession.groupBy({
          by: ["quizId"],
          where: { quizId: { in: finalIds }, status: "SUBMITTED" },
          _avg: { score: true },
          _count: { _all: true },
          _sum: { violationCount: true },
        })
      : Promise.resolve([] as Array<{ quizId: string; _avg: { score: number | null }; _count: { _all: number }; _sum: { violationCount: number | null } }>),
    finalIds.length
      ? prisma.examSession.groupBy({
          by: ["quizId"],
          where: { quizId: { in: finalIds }, status: "SUBMITTED", passed: true },
          _count: { _all: true },
        })
      : Promise.resolve([] as Array<{ quizId: string; _count: { _all: number } }>),
  ]);
  const statsByQuiz = new Map(examStats.map((s) => [s.quizId, s]));
  const passByQuiz = new Map(examPassed.map((s) => [s.quizId, s._count._all]));

  const courseRows = courses.map((c) => {
    const s = c.finalQuiz ? statsByQuiz.get(c.finalQuiz.id) : undefined;
    const passed = c.finalQuiz ? passByQuiz.get(c.finalQuiz.id) ?? 0 : 0;
    const completionPct =
      c._count.enrollments > 0 ? Math.round((c._count.certificates / c._count.enrollments) * 100) : 0;
    const examPassRate =
      s && s._count._all > 0 ? Math.round((passed / s._count._all) * 100) : null;
    return {
      lab: c.lab.name,
      course: c.title,
      passScore: c.passScore,
      enrollments: c._count.enrollments,
      certificates: c._count.certificates,
      completionPct,
      finalAttempts: s?._count._all ?? 0,
      finalPassed: passed,
      finalPassRatePct: examPassRate,
      avgFinalScore: s?._avg.score !== null && s?._avg.score !== undefined ? Math.round(s._avg.score) : null,
      totalViolations: s?._sum.violationCount ?? 0,
    };
  });

  const labRows = labs.map((l) => ({
    lab: l.name,
    courseCount: l._count.courses,
    memberCount: l._count.members,
    enrollments: courseRows.filter((r) => r.lab === l.name).reduce((a, b) => a + b.enrollments, 0),
    certificates: courseRows.filter((r) => r.lab === l.name).reduce((a, b) => a + b.certificates, 0),
  }));

  return {
    summary: {
      labCount: labs.length,
      courseCount: courses.length,
      totalStudents,
      totalEnrollments,
      totalCertificates: totalCerts,
      certsLast90Days: recentCerts.length,
      overallCompletionPct:
        totalEnrollments > 0 ? Math.round((totalCerts / totalEnrollments) * 100) : 0,
    },
    labs: labRows,
    courses: courseRows,
  };
}

export type AnalystSnapshot = Awaited<ReturnType<typeof buildAnalystSnapshot>>;

const SYSTEM_PROMPT = `Anda adalah konsultan akademik & analis data pelatihan untuk Unsri Training Center (UTC) — pusat pelatihan terpusat 8 laboratorium Fakultas Ilmu Komputer Universitas Sriwijaya.

Tugas Anda: membaca snapshot metrik UTC (per lab dan per course/pelatihan) dan memberi rekomendasi konkret kepada manajer laboratorium untuk:
1. Meningkatkan kompetensi mahasiswa (penguasaan materi, kelulusan pelatihan, sertifikasi)
2. Mendukung pencapaian IKU (Indikator Kinerja Utama) Perguruan Tinggi Indonesia, khususnya:
   - IKU 1: lulusan mendapat pekerjaan layak (linked ke kompetensi & sertifikasi)
   - IKU 2: mahasiswa berkegiatan/sertifikasi di luar kampus (sertifikat pelatihan = pengalaman)
   - IKU 6: program studi bekerjasama mitra kelas dunia (industri)
   - IKU 7: kelas kolaboratif & partisipatif
   - IKU 8: akreditasi internasional (kualitas pelatihan)

Format respons WAJIB JSON valid (tanpa komentar/markdown fence) dengan skema:
{
  "ringkasan": "1-2 kalimat kondisi umum",
  "programPrioritas": [{"course":"…","alasan":"…","tindakan":"…"}],     // 3-5 course yang paling butuh perhatian
  "programUnggulan": [{"course":"…","alasan":"…","scaleUp":"…"}],       // 2-4 course yang performa baik dan bisa diperluas
  "sarManajerLab": [{"kategori":"konten|operasional|kolaborasi|asesmen","saran":"…","dampak":"…"}],  // 4-6 saran
  "sarIKU": [{"iku":"IKU 1|IKU 2|IKU 6|IKU 7|IKU 8","saran":"…"}],     // 3-5 saran terkait IKU
  "risikoPerhatian": ["…"]                                              // 2-4 risiko / red flag
}

Aturan:
- Gunakan bahasa Indonesia formal, lugas, actionable.
- Rujuk angka konkret bila relevan (mis. "kelulusan hanya 18%").
- Course "prioritas" = enrollment tinggi tapi completion/passRate rendah, atau pelanggaran ujian tinggi.
- Course "unggulan" = completion ≥ 70% atau passRate ≥ 80% dengan enrollment cukup.
- Hindari saran generik. Setiap saran harus bisa dieksekusi manajer lab dalam ≤ 1 semester.`;

export async function generateInsights(snapshot: AnalystSnapshot) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false as const, error: "GEMINI_API_KEY belum diisi di .env — fitur AI insight nonaktif." };
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  });

  const userPayload = JSON.stringify(snapshot, null, 2);

  try {
    const res = await model.generateContent(
      `Snapshot metrik UTC saat ini (JSON):\n\n${userPayload}\n\nKeluarkan analisis sesuai skema.`,
    );
    const raw = res.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(cleaned);
    const usage = res.response.usageMetadata;
    return {
      ok: true as const,
      insights: parsed as Insights,
      usage: { input: usage?.promptTokenCount ?? 0, output: usage?.candidatesTokenCount ?? 0 },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memanggil model.";
    return { ok: false as const, error: msg };
  }
}

export type Insights = {
  ringkasan: string;
  programPrioritas: { course: string; alasan: string; tindakan: string }[];
  programUnggulan: { course: string; alasan: string; scaleUp: string }[];
  sarManajerLab: { kategori: string; saran: string; dampak: string }[];
  sarIKU: { iku: string; saran: string }[];
  risikoPerhatian: string[];
};

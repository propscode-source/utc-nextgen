import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { allowedLabIdsFor, buildCsv, csvResponse } from "@/lib/analytics";
import { runCustomReport, type CustomDataset, type CustomParams } from "@/app/(dashboard)/analytics/custom/run";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "certified";
  const get = (k: string) => url.searchParams.get(k) ?? undefined;

  const labIds = await allowedLabIdsFor(session.user.id, session.user.role);
  const stamp = new Date().toISOString().slice(0, 10);

  if (type === "certified") {
    const certs = await prisma.certificate.findMany({
      where: {
        course: {
          labId: { in: labIds },
          ...(get("lab") && { lab: { slug: get("lab") } }),
          ...(get("course") && { slug: get("course") }),
        },
        ...((get("from") || get("to")) && {
          issuedAt: {
            ...(get("from") && { gte: new Date(get("from")!) }),
            ...(get("to") && { lte: new Date(get("to") + "T23:59:59") }),
          },
        }),
        ...(get("q") && {
          OR: [
            { certNumber: { contains: get("q")!, mode: "insensitive" as const } },
            { user: { name: { contains: get("q")!, mode: "insensitive" as const } } },
            { user: { email: { contains: get("q")!, mode: "insensitive" as const } } },
            { user: { nim: { contains: get("q")! } } },
          ],
        }),
      },
      include: {
        user: { select: { nim: true, name: true, email: true, prodi: true, angkatan: true } },
        course: { select: { title: true, lab: { select: { name: true } } } },
      },
      orderBy: { issuedAt: "desc" },
    });
    const csv = buildCsv(
      ["Nomor Sertifikat", "NIM", "Nama", "Email", "Prodi", "Angkatan", "Course", "Lab", "Diterbitkan"],
      certs.map((c) => [
        c.certNumber, c.user.nim, c.user.name, c.user.email, c.user.prodi, c.user.angkatan,
        c.course.title, c.course.lab.name, c.issuedAt,
      ]),
    );
    return csvResponse(`laporan-sertifikasi-${stamp}.csv`, csv);
  }

  if (type === "per-course") {
    const courses = await prisma.course.findMany({
      where: { labId: { in: labIds }, ...(get("lab") && { lab: { slug: get("lab") } }) },
      select: {
        title: true, passScore: true,
        lab: { select: { name: true } },
        finalQuiz: { select: { id: true } },
        _count: { select: { enrollments: true, certificates: true } },
      },
      orderBy: [{ lab: { name: "asc" } }, { title: "asc" }],
    });
    const finalIds = courses.map((c) => c.finalQuiz?.id).filter((x): x is string => !!x);
    const [stats, passed] = await Promise.all([
      finalIds.length
        ? prisma.examSession.groupBy({
            by: ["quizId"],
            where: { quizId: { in: finalIds }, status: "SUBMITTED" },
            _avg: { score: true },
            _count: { _all: true },
            _sum: { violationCount: true },
          })
        : Promise.resolve([] as { quizId: string; _avg: { score: number | null }; _count: { _all: number }; _sum: { violationCount: number | null } }[]),
      finalIds.length
        ? prisma.examSession.groupBy({
            by: ["quizId"],
            where: { quizId: { in: finalIds }, status: "SUBMITTED", passed: true },
            _count: { _all: true },
          })
        : Promise.resolve([] as { quizId: string; _count: { _all: number } }[]),
    ]);
    const byQuiz = new Map(stats.map((s) => [s.quizId, s]));
    const passByQuiz = new Map(passed.map((s) => [s.quizId, s._count._all]));

    const csv = buildCsv(
      ["Lab", "Course", "Pass Score", "Enrolled", "Sertifikat", "Kelulusan %", "Final Attempt", "Final Lulus", "Avg Skor", "Pelanggaran"],
      courses.map((c) => {
        const s = c.finalQuiz ? byQuiz.get(c.finalQuiz.id) : undefined;
        const p = c.finalQuiz ? passByQuiz.get(c.finalQuiz.id) ?? 0 : 0;
        const rate = c._count.enrollments > 0
          ? Math.round((c._count.certificates / c._count.enrollments) * 100)
          : 0;
        return [
          c.lab.name, c.title, c.passScore,
          c._count.enrollments, c._count.certificates, rate,
          s?._count._all ?? 0, p,
          s?._avg.score !== null && s?._avg.score !== undefined ? Math.round(s._avg.score) : null,
          s?._sum.violationCount ?? 0,
        ];
      }),
    );
    return csvResponse(`laporan-per-pelatihan-${stamp}.csv`, csv);
  }

  if (type === "custom") {
    const dataset = (get("dataset") ?? "students") as CustomDataset;
    const params: CustomParams = {
      lab: get("lab"), course: get("course"),
      from: get("from"), to: get("to"),
      q: get("q"), status: get("status"),
    };
    const r = await runCustomReport(dataset, params, labIds);
    const csv = buildCsv(r.headers, r.rows);
    return csvResponse(`custom-${dataset}-${stamp}.csv`, csv);
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}

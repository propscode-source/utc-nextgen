import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { allowedLabIdsFor } from "@/lib/analytics";
import { BarChart } from "@/components/charts";
import { PerCourseTable, type PerCourseRow } from "./per-course-table";

export const metadata: Metadata = { title: "Laporan per Pelatihan" };

type SP = { lab?: string };

export default async function PerCourseReportPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }
  const sp = await searchParams;
  const labIds = await allowedLabIdsFor(session.user.id, session.user.role);

  const labs = await prisma.lab.findMany({
    where: { id: { in: labIds } },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });

  const courses = await prisma.course.findMany({
    where: { labId: { in: labIds }, ...(sp.lab && { lab: { slug: sp.lab } }) },
    select: {
      id: true,
      title: true,
      passScore: true,
      lab: { select: { name: true } },
      finalQuiz: { select: { id: true } },
      _count: { select: { enrollments: true, certificates: true } },
    },
    orderBy: [{ lab: { name: "asc" } }, { title: "asc" }],
  });

  // Aggregate final-exam stats per course.
  const finalQuizIds = courses.map((c) => c.finalQuiz?.id).filter((x): x is string => !!x);
  const examStats = finalQuizIds.length
    ? await prisma.examSession.groupBy({
        by: ["quizId"],
        where: { quizId: { in: finalQuizIds }, status: "SUBMITTED" },
        _avg: { score: true },
        _count: { _all: true },
        _sum: { violationCount: true },
      })
    : [];
  const passCounts = finalQuizIds.length
    ? await prisma.examSession.groupBy({
        by: ["quizId"],
        where: { quizId: { in: finalQuizIds }, status: "SUBMITTED", passed: true },
        _count: { _all: true },
      })
    : [];
  const byQuiz = new Map<string, { attempts: number; avg: number | null; violations: number; passed: number }>();
  for (const s of examStats) {
    byQuiz.set(s.quizId, {
      attempts: s._count._all,
      avg: s._avg.score ?? null,
      violations: s._sum.violationCount ?? 0,
      passed: 0,
    });
  }
  for (const s of passCounts) {
    const cur = byQuiz.get(s.quizId);
    if (cur) cur.passed = s._count._all;
  }

  const rows: PerCourseRow[] = courses.map((c) => {
    const stats = c.finalQuiz ? byQuiz.get(c.finalQuiz.id) : undefined;
    const completionRate =
      c._count.enrollments > 0 ? Math.round((c._count.certificates / c._count.enrollments) * 100) : 0;
    return {
      id: c.id,
      title: c.title,
      passScore: c.passScore,
      lab: { name: c.lab.name },
      enrollments: c._count.enrollments,
      certificates: c._count.certificates,
      completionRate,
      examAttempts: stats?.attempts ?? 0,
      examPassed: stats?.passed ?? 0,
      avgScore: stats?.avg !== null && stats?.avg !== undefined ? Math.round(stats.avg) : null,
      violations: stats?.violations ?? 0,
    };
  });

  const exportQs = new URLSearchParams({ type: "per-course", ...(sp as Record<string, string>) }).toString();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> Analytics
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Laporan per Pelatihan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statistik agregat untuk {rows.length} course.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/analytics/export?${exportQs}`}>
            <FontAwesomeIcon icon={faFileExport} /> Export CSV
          </a>
        </Button>
      </div>

      <form className="flex gap-2 print:hidden" method="get">
        <select
          name="lab"
          defaultValue={sp.lab ?? ""}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Semua Lab</option>
          {labs.map((l) => (
            <option key={l.id} value={l.slug}>
              {l.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">Filter</Button>
      </form>

      {rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Enrollment per Course</CardTitle></CardHeader>
            <CardContent>
              <BarChart
                data={rows.map((r) => ({ label: r.title, value: r.enrollments })).sort((a, b) => b.value - a.value).slice(0, 10)}
                color="rgb(56 189 248)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Sertifikat per Course</CardTitle></CardHeader>
            <CardContent>
              <BarChart
                data={rows.map((r) => ({ label: r.title, value: r.certificates })).sort((a, b) => b.value - a.value).slice(0, 10)}
                color="rgb(16 185 129)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">% Kelulusan</CardTitle></CardHeader>
            <CardContent>
              <BarChart
                data={rows.map((r) => ({ label: r.title, value: r.completionRate })).sort((a, b) => b.value - a.value).slice(0, 10)}
                formatValue={(v) => `${v}%`}
                color="rgb(168 85 247)"
              />
            </CardContent>
          </Card>
        </div>
      )}

      <PerCourseTable rows={rows} />
    </div>
  );
}

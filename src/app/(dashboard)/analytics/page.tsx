import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCertificate,
  faGraduationCap,
  faSliders,
  faChartLine,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { allowedLabIdsFor } from "@/lib/analytics";
import { BarChart, LineChart } from "@/components/charts";
import { AIInsights } from "@/components/ai-insights";

export const metadata: Metadata = { title: "Analytics & Laporan" };

export default async function AnalyticsHomePage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }

  const labIds = await allowedLabIdsFor(session.user.id, session.user.role);

  const [certCount, courseCount, studentCount, certsForChart, topCourses] = await Promise.all([
    prisma.certificate.count({ where: { course: { labId: { in: labIds } } } }),
    prisma.course.count({ where: { labId: { in: labIds } } }),
    prisma.enrollment
      .findMany({
        where: { course: { labId: { in: labIds } } },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),
    prisma.certificate.findMany({
      where: { course: { labId: { in: labIds } } },
      select: { issuedAt: true },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.course.findMany({
      where: { labId: { in: labIds } },
      select: { title: true, _count: { select: { certificates: true } } },
      orderBy: { certificates: { _count: "desc" } },
      take: 8,
    }),
  ]);

  // Agregasi sertifikat per bulan (12 bulan terakhir).
  const now = new Date();
  const months: { key: string; label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    months.push({ key, label, value: 0 });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const c of certsForChart) {
    const k = `${c.issuedAt.getFullYear()}-${String(c.issuedAt.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(k);
    if (idx !== undefined) months[idx].value += 1;
  }

  const topCoursesData = topCourses
    .filter((c) => c._count.certificates > 0)
    .map((c) => ({ label: c.title, value: c._count.certificates }));

  const reports = [
    {
      href: "/analytics/certified",
      title: "Mahasiswa Bersertifikasi",
      desc: "Daftar mahasiswa yang sudah mendapat sertifikat — filter lab/course/tanggal + export CSV.",
      icon: faCertificate,
    },
    {
      href: "/analytics/per-course",
      title: "Laporan per Pelatihan",
      desc: "Ringkasan per course: enrollment, kelulusan, sertifikat terbit, rata-rata skor final.",
      icon: faGraduationCap,
    },
    {
      href: "/analytics/custom",
      title: "Custom Report",
      desc: "Bangun laporan sendiri: pilih dataset (mahasiswa, enrollment, sertifikat, ujian) + parameter.",
      icon: faSliders,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Laporan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modul 8 — laporan agregat berbasis data sertifikat, enrollment, dan ujian. Export CSV (kompatibel Excel).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Sertifikat Terbit" value={certCount} icon={faCertificate} />
        <Stat label="Total Course" value={courseCount} icon={faGraduationCap} />
        <Stat label="Mahasiswa Terdaftar" value={studentCount} icon={faUsers} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sertifikat 12 bulan terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={months} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Pelatihan (sertifikat terbit)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={topCoursesData} />
          </CardContent>
        </Card>
      </div>

      <AIInsights />

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.href} href={r.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FontAwesomeIcon icon={r.icon} className="h-4 w-4 text-primary" />
                  {r.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{r.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: typeof faChartLine }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
          <FontAwesomeIcon icon={icon} className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

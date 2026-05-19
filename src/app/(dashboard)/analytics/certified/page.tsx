import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";
import { allowedLabIdsFor } from "@/lib/analytics";
import { LineChart, BarChart } from "@/components/charts";

export const metadata: Metadata = { title: "Laporan Mahasiswa Bersertifikasi" };

type SP = { lab?: string; course?: string; from?: string; to?: string; q?: string };

export default async function CertifiedReportPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }
  const sp = await searchParams;
  const labIds = await allowedLabIdsFor(session.user.id, session.user.role);

  const [labs, courses] = await Promise.all([
    prisma.lab.findMany({
      where: { id: { in: labIds } },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { labId: { in: labIds }, ...(sp.lab && { lab: { slug: sp.lab } }) },
      select: { id: true, slug: true, title: true, lab: { select: { slug: true, name: true } } },
      orderBy: [{ lab: { name: "asc" } }, { title: "asc" }],
    }),
  ]);

  const where = {
    course: {
      labId: { in: labIds },
      ...(sp.lab && { lab: { slug: sp.lab } }),
      ...(sp.course && { slug: sp.course }),
    },
    ...(sp.from || sp.to
      ? {
          issuedAt: {
            ...(sp.from && { gte: new Date(sp.from) }),
            ...(sp.to && { lte: new Date(sp.to + "T23:59:59") }),
          },
        }
      : {}),
    ...(sp.q && {
      OR: [
        { certNumber: { contains: sp.q, mode: "insensitive" as const } },
        { user: { name: { contains: sp.q, mode: "insensitive" as const } } },
        { user: { email: { contains: sp.q, mode: "insensitive" as const } } },
        { user: { nim: { contains: sp.q } } },
      ],
    }),
  };

  const certs = await prisma.certificate.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, nim: true, prodi: true, angkatan: true } },
      course: { select: { title: true, lab: { select: { name: true } } } },
    },
    orderBy: { issuedAt: "desc" },
    take: 500,
  });

  const exportQs = new URLSearchParams({ type: "certified", ...(sp as Record<string, string>) }).toString();

  // Grafik time series (per bulan) + breakdown per course pada hasil terfilter.
  const monthMap = new Map<string, { label: string; value: number }>();
  for (const c of certs) {
    const d = c.issuedAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    const cur = monthMap.get(key);
    if (cur) cur.value += 1;
    else monthMap.set(key, { label, value: 1 });
  }
  const monthSeries = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  const courseMap = new Map<string, number>();
  for (const c of certs) {
    courseMap.set(c.course.title, (courseMap.get(c.course.title) ?? 0) + 1);
  }
  const courseBars = Array.from(courseMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> Analytics
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Mahasiswa Bersertifikasi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {certs.length} sertifikat ditemukan {certs.length >= 500 && "(dibatasi 500 baris pertama)"}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/analytics/export?${exportQs}`}>
            <FontAwesomeIcon icon={faFileExport} /> Export CSV
          </a>
        </Button>
      </div>

      <form className="grid gap-3 sm:grid-cols-5 print:hidden" method="get">
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
        <select
          name="course"
          defaultValue={sp.course ?? ""}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Semua Course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
        <Input type="date" name="from" defaultValue={sp.from ?? ""} placeholder="Dari" />
        <Input type="date" name="to" defaultValue={sp.to ?? ""} placeholder="Sampai" />
        <div className="flex gap-2">
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Cari nama/NIM/nomor" />
          <Button type="submit" size="sm">Filter</Button>
        </div>
      </form>

      {certs.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Tren Penerbitan</CardTitle></CardHeader>
            <CardContent><LineChart data={monthSeries} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Per Course (top 8)</CardTitle></CardHeader>
            <CardContent><BarChart data={courseBars} /></CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Sertifikat</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>NIM / Prodi</TableHead>
                <TableHead>Course / Lab</TableHead>
                <TableHead>Diterbitkan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Tidak ada sertifikat sesuai filter.
                  </TableCell>
                </TableRow>
              )}
              {certs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <code className="font-mono text-xs font-bold">{c.certNumber}</code>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{c.user.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.user.email}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{c.user.nim ?? "—"}</div>
                    <div className="text-muted-foreground">
                      {c.user.prodi ?? "—"} {c.user.angkatan ? `· ${c.user.angkatan}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{c.course.title}</div>
                    <div className="text-[10px] text-muted-foreground">{c.course.lab.name}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {formatDate(c.issuedAt)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

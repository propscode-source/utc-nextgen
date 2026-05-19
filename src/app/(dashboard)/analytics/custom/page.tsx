import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport, faArrowLeft, faSliders } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";
import { allowedLabIdsFor } from "@/lib/analytics";
import { runCustomReport, type CustomDataset } from "./run";

export const metadata: Metadata = { title: "Custom Report" };

type SP = {
  dataset?: CustomDataset;
  lab?: string;
  course?: string;
  from?: string;
  to?: string;
  q?: string;
  status?: string;
  role?: string;
};

const DATASETS: { value: CustomDataset; label: string; desc: string }[] = [
  { value: "students", label: "Mahasiswa", desc: "User MAHASISWA + filter prodi/angkatan/poin" },
  { value: "enrollments", label: "Enrollment", desc: "Pendaftaran course + progres + status selesai" },
  { value: "certificates", label: "Sertifikat", desc: "Sertifikat terbit + tanggal + course" },
  { value: "exam-sessions", label: "Sesi Ujian", desc: "Sesi pretest/final + skor + pelanggaran" },
];

export default async function CustomReportPage({ searchParams }: { searchParams: Promise<SP> }) {
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
      select: { id: true, slug: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const dataset = (sp.dataset ?? "students") as CustomDataset;
  const result = await runCustomReport(dataset, sp, labIds);
  const exportQs = new URLSearchParams({ type: "custom", ...(sp as Record<string, string>) }).toString();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> Analytics
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <FontAwesomeIcon icon={faSliders} className="h-5 w-5 text-primary" />
            Custom Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {result.rows.length} baris ditemukan {result.rows.length >= 500 && "(dibatasi 500)"}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/analytics/export?${exportQs}`}>
            <FontAwesomeIcon icon={faFileExport} /> Export CSV
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 print:hidden">
          <form className="grid gap-3 md:grid-cols-4" method="get">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">Dataset</span>
              <select
                name="dataset"
                defaultValue={dataset}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                {DATASETS.map((d) => (
                  <option key={d.value} value={d.value} title={d.desc}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">Lab</span>
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
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">Course</span>
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
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">Pencarian (nama/NIM/email)</span>
              <Input name="q" defaultValue={sp.q ?? ""} placeholder="Kata kunci" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">Dari Tanggal</span>
              <Input type="date" name="from" defaultValue={sp.from ?? ""} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">Sampai Tanggal</span>
              <Input type="date" name="to" defaultValue={sp.to ?? ""} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">Status / Hasil</span>
              <select
                name="status"
                defaultValue={sp.status ?? ""}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Semua</option>
                <option value="completed">Selesai / Lulus</option>
                <option value="in-progress">Berlangsung / Belum Lulus</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Terapkan Parameter</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {result.headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={result.headers.length} className="py-8 text-center text-sm text-muted-foreground">
                    Tidak ada baris sesuai parameter.
                  </TableCell>
                </TableRow>
              )}
              {result.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="text-xs">
                      {cell instanceof Date ? (
                        <Badge variant="outline" className="text-[10px]">{formatDate(cell)}</Badge>
                      ) : (
                        String(cell ?? "—")
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCertificate, faExternalLink, faPrint, faPaintbrush, faRocket } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Kelola Sertifikat" };

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lab?: string; course?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }
  const { q, lab: labSlug, course: courseSlug } = await searchParams;

  // Lab admins are scoped to labs they actually manage (or asisten of); superadmin sees all.
  const isSuper = session.user.role === "SUPERADMIN";
  const labWhereForUser = isSuper
    ? {}
    : {
        OR: [
          { adminId: session.user.id },
          { members: { some: { userId: session.user.id, role: "ASSISTANT" as const } } },
        ],
      };

  const labs = await prisma.lab.findMany({
    where: labWhereForUser,
    select: { id: true, slug: true, name: true, _count: { select: { courses: true } } },
    orderBy: { name: "asc" },
  });
  const allowedLabIds = new Set(labs.map((l) => l.id));

  const courses = await prisma.course.findMany({
    where: { labId: { in: Array.from(allowedLabIds) } },
    select: {
      id: true,
      slug: true,
      title: true,
      lab: { select: { name: true, slug: true } },
      _count: { select: { certificates: true } },
      certificateTemplate: { select: { id: true } },
    },
    orderBy: [{ lab: { name: "asc" } }, { title: "asc" }],
  });

  const filteredCourses = courses
    .filter((c) => !labSlug || c.lab.slug === labSlug)
    .filter((c) => !courseSlug || c.slug === courseSlug);

  const certs = await prisma.certificate.findMany({
    where: {
      course: {
        labId: { in: Array.from(allowedLabIds) },
        ...(labSlug && { lab: { slug: labSlug } }),
        ...(courseSlug && { slug: courseSlug }),
      },
      ...(q && {
        OR: [
          { certNumber: { contains: q, mode: "insensitive" as const } },
          { user: { name: { contains: q, mode: "insensitive" as const } } },
          { user: { email: { contains: q, mode: "insensitive" as const } } },
          { user: { nim: { contains: q } } },
        ],
      }),
    },
    include: {
      user: { select: { name: true, email: true, nim: true } },
      course: { select: { id: true, slug: true, title: true, lab: { select: { name: true, slug: true } } } },
    },
    orderBy: { issuedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Sertifikat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lihat semua sertifikat yang sudah diterbitkan, design template per course, dan backfill untuk
          mahasiswa yang sudah lulus.
        </p>
      </div>

      {/* Course/lab filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/admin/certificates"
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${!labSlug && !courseSlug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
        >
          Semua
        </Link>
        {labs.map((l) => (
          <Link
            key={l.id}
            href={`/admin/certificates?lab=${l.slug}`}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${labSlug === l.slug && !courseSlug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
          >
            {l.name}
          </Link>
        ))}
      </div>

      {/* Course management cards */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead className="text-right">Diterbitkan</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.lab.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-[10px]">
                      <FontAwesomeIcon icon={faCertificate} className="mr-1 h-2.5 w-2.5" />
                      {c._count.certificates}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.certificateTemplate ? (
                      <Badge variant="success" className="text-[10px]">Custom</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/labs/${c.lab.slug}/courses/${c.id}/edit/certificates/template`}>
                        <FontAwesomeIcon icon={faPaintbrush} /> Template
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/labs/${c.lab.slug}/courses/${c.id}/edit/certificates`}>
                        <FontAwesomeIcon icon={faRocket} /> Backfill
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCourses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Tidak ada course di scope kamu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Issued certs */}
      <div>
        <h2 className="text-base font-semibold mb-2">Sertifikat terbit ({certs.length})</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead>Course / Lab</TableHead>
                  <TableHead>Diterbitkan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada sertifikat.
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
                      <div className="text-[10px] text-muted-foreground">
                        {c.user.nim ? `${c.user.nim} · ` : ""}
                        {c.user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{c.course.title}</div>
                      <div className="text-[10px] text-muted-foreground">{c.course.lab.name}</div>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(c.issuedAt)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/certificates/${encodeURIComponent(c.certNumber)}`} target="_blank">
                          <FontAwesomeIcon icon={faPrint} /> Cetak
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/cert/${encodeURIComponent(c.certNumber)}`} target="_blank">
                          <FontAwesomeIcon icon={faExternalLink} /> Verify
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

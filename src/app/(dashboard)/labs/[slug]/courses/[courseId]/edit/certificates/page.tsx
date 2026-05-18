import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCertificate, faExternalLink, faPrint, faPaintbrush } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";
import { BackfillButton } from "./backfill-button";

export default async function CourseCertificatesAdminPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { slug, courseId } = await params;
  const session = await auth();
  if (!session) return null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, lab: { select: { id: true, slug: true } } },
  });
  if (!course || course.lab.slug !== slug) notFound();
  if (!(await canManageLab(session.user.id, session.user.role, course.lab.id))) {
    redirect(`/labs/${slug}/courses`);
  }

  const certs = await prisma.certificate.findMany({
    where: { courseId },
    include: { user: { select: { name: true, nim: true, email: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/labs/${slug}/courses/${courseId}/edit`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Kembali ke editor course
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight">
          <FontAwesomeIcon icon={faCertificate} className="text-amber-500 mr-2" />
          Sertifikat — {course.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {certs.length} sertifikat sudah diterbitkan untuk course ini.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/labs/${slug}/courses/${courseId}/edit/certificates/template`}>
            <FontAwesomeIcon icon={faPaintbrush} /> Design template
          </Link>
        </Button>
        <BackfillButton courseId={courseId} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Diterbitkan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    Belum ada sertifikat. Mahasiswa yang lulus final exam otomatis dapat sertifikat.
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
                  <TableCell className="text-xs">{formatDate(c.issuedAt)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/certificates/${encodeURIComponent(c.certNumber)}`}
                        target="_blank"
                      >
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
      <p className="text-[11px] text-muted-foreground">
        Tip: untuk export massal, buka tiap link "Cetak" di tab baru lalu Save as PDF dari dialog
        cetak browser. PDF generator server-side bisa dibangun di iterasi berikut.
      </p>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCertificate, faExternalLink, faPrint } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Sertifikat Saya" };

export default async function MyCertificatesPage() {
  const session = await auth();
  if (!session) return null;

  const certs = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true, slug: true, lab: { select: { name: true } } } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sertifikat Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sertifikat yang sudah diterbitkan setelah lulus final exam.
        </p>
      </div>

      {certs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <FontAwesomeIcon icon={faCertificate} className="h-8 w-8 mb-3" />
            <p>Belum ada sertifikat. Lulus final exam untuk mendapatkannya.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FontAwesomeIcon icon={faCertificate} className="text-amber-500" />
                  {c.course.title}
                </CardTitle>
                <div className="text-[11px] text-muted-foreground">
                  {c.course.lab.name} · {formatDate(c.issuedAt)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">Nomor sertifikat</div>
                <code className="block font-mono text-sm font-bold border rounded-md bg-muted/30 px-3 py-2">
                  {c.certNumber}
                </code>
                <div className="flex gap-2 pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/certificates/${encodeURIComponent(c.certNumber)}`} target="_blank">
                      <FontAwesomeIcon icon={faPrint} /> Lihat & cetak
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/cert/${encodeURIComponent(c.certNumber)}`} target="_blank">
                      <FontAwesomeIcon icon={faExternalLink} /> Verifikasi publik
                    </Link>
                  </Button>
                </div>
                <Badge variant="success" className="text-[10px]">Berlaku</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

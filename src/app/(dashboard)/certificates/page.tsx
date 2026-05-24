import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CertificatesList, type CertificateItem } from "./certificates-list";

export const metadata: Metadata = { title: "Sertifikat Saya" };

export default async function MyCertificatesPage() {
  const session = await auth();
  if (!session) return null;

  const certs = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true, slug: true, lab: { select: { name: true } } } } },
    orderBy: { issuedAt: "desc" },
  });

  const items: CertificateItem[] = certs.map((c) => ({
    id: c.id,
    certNumber: c.certNumber,
    issuedAt: c.issuedAt,
    course: c.course,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sertifikat Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sertifikat yang sudah diterbitkan setelah lulus final exam.
        </p>
      </div>

      <CertificatesList certs={items} />
    </div>
  );
}

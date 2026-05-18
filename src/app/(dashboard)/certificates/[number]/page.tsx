import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CertificateDocument } from "@/components/certificate-document";
import { PrintShell } from "./print-shell";

export default async function CertificatePrintPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const session = await auth();
  if (!session) return null;

  const cert = await prisma.certificate.findUnique({
    where: { certNumber: decodeURIComponent(number) },
    include: {
      user: { select: { id: true, name: true, nim: true } },
      course: {
        select: {
          id: true,
          title: true,
          passScore: true,
          finalQuiz: { select: { id: true } },
          lab: { select: { name: true } },
          certificateTemplate: { select: { backgroundUrl: true, fieldsJson: true } },
        },
      },
    },
  });
  if (!cert) notFound();
  // Owner or staff can view.
  const role = session.user.role;
  const isStaff = role === "SUPERADMIN" || role === "LAB_ADMIN" || role === "PROCTOR";
  if (cert.userId !== session.user.id && !isStaff) notFound();

  let finalScore: number | null = null;
  if (cert.course.finalQuiz) {
    const s = await prisma.examSession.findFirst({
      where: { quizId: cert.course.finalQuiz.id, userId: cert.userId, passed: true },
      select: { score: true },
      orderBy: { submittedAt: "desc" },
    });
    finalScore = s?.score ?? null;
  }

  const tpl = cert.course.certificateTemplate;
  const template = tpl
    ? {
        backgroundUrl: tpl.backgroundUrl ?? "",
        fields: ((tpl.fieldsJson as { fields?: unknown })?.fields ?? []) as never,
      }
    : null;

  return (
    <PrintShell>
      <CertificateDocument
        certNumber={cert.certNumber}
        recipientName={cert.user.name}
        recipientNim={cert.user.nim}
        courseTitle={cert.course.title}
        labName={cert.course.lab.name}
        issuedAt={cert.issuedAt}
        qrPayload={cert.qrPayload}
        passScore={cert.course.passScore}
        finalScore={finalScore}
        template={template}
      />
    </PrintShell>
  );
}

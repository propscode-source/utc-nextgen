import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CertificateDocument } from "@/components/certificate-document";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleXmark, faBolt } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Verifikasi Sertifikat" };

export default async function PublicCertVerifyPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { certNumber: decodeURIComponent(number) },
    include: {
      user: { select: { name: true, nim: true, prodi: true } },
      course: {
        select: {
          title: true,
          passScore: true,
          finalQuiz: { select: { id: true } },
          lab: { select: { name: true } },
          certificateTemplate: { select: { backgroundUrl: true, fieldsJson: true } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background py-10 px-4">
      <div className="container">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FontAwesomeIcon icon={faBolt} className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-bold leading-tight">UTC NextGen</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              Verifikasi Sertifikat Publik
            </div>
          </div>
        </Link>

        {!cert ? (
          <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <FontAwesomeIcon icon={faCircleXmark} className="h-10 w-10 text-destructive mb-3" />
            <h1 className="text-lg font-bold">Sertifikat tidak ditemukan</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Nomor <code className="font-mono">{decodeURIComponent(number)}</code> tidak terdaftar
              dalam sistem UTC NextGen.
            </p>
          </div>
        ) : (
          <>
            <div className="max-w-3xl rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-5 mb-6 flex items-center gap-3">
              <FontAwesomeIcon icon={faCircleCheck} className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="font-bold text-emerald-700 dark:text-emerald-300">
                  Sertifikat ini ASLI dan terverifikasi
                </div>
                <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  Diterbitkan untuk <strong>{cert.user.name}</strong>{" "}
                  {cert.user.nim && `(NIM: ${cert.user.nim})`} · {formatDate(cert.issuedAt)}
                </div>
              </div>
            </div>

            <CertVerifyDocument number={cert.certNumber} userId={cert.userId} cert={cert} />
          </>
        )}
      </div>
    </div>
  );
}

async function CertVerifyDocument({
  number,
  userId,
  cert,
}: {
  number: string;
  userId: string;
  cert: {
    issuedAt: Date;
    qrPayload: string;
    user: { name: string; nim: string | null; prodi: string | null };
    course: {
      title: string;
      passScore: number;
      finalQuiz: { id: string } | null;
      lab: { name: string };
      certificateTemplate: { backgroundUrl: string | null; fieldsJson: unknown } | null;
    };
  };
}) {
  let finalScore: number | null = null;
  if (cert.course.finalQuiz) {
    const s = await prisma.examSession.findFirst({
      where: { quizId: cert.course.finalQuiz.id, userId, passed: true },
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
    <div className="overflow-x-auto">
      <CertificateDocument
        certNumber={number}
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
    </div>
  );
}

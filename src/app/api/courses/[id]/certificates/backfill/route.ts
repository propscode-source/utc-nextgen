import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { issueCertificate } from "@/lib/certificates";
import { awardPoints } from "@/lib/points";
import { PointEvent } from "@prisma/client";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { finalQuiz: { select: { id: true } } },
  });
  if (!course) return NextResponse.json({ error: "Course tidak ditemukan." }, { status: 404 });
  if (!(await canManageLab(session.user.id, session.user.role, course.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  if (!course.finalQuiz) {
    return NextResponse.json({ error: "Course belum punya final exam." }, { status: 400 });
  }

  // Distinct users who have at least one passed final exam session.
  const passed = await prisma.examSession.findMany({
    where: { quizId: course.finalQuiz.id, passed: true },
    select: { userId: true },
    distinct: ["userId"],
  });

  let issued = 0;
  let alreadyExisted = 0;
  for (const p of passed) {
    await prisma.$transaction(async (tx) => {
      const before = await tx.certificate.findFirst({
        where: { userId: p.userId, courseId },
        select: { id: true },
      });
      const cert = await issueCertificate(p.userId, courseId, tx);
      if (before) {
        alreadyExisted++;
      } else {
        issued++;
        const certAlready = await tx.pointsLedger.findFirst({
          where: {
            userId: p.userId,
            event: PointEvent.CERT_EARNED,
            refType: "certificate",
            refId: cert.id,
          },
        });
        if (!certAlready) {
          await awardPoints({
            userId: p.userId,
            event: PointEvent.CERT_EARNED,
            reason: `Sertifikat backfill: ${cert.certNumber}`,
            refType: "certificate",
            refId: cert.id,
            tx,
          });
        }
      }
    });
  }

  return NextResponse.json({
    ok: true,
    scanned: passed.length,
    issued,
    alreadyExisted,
  });
}

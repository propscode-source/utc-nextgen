import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { isProctor } from "@/lib/proctor-perms";
import { issueCertificate } from "@/lib/certificates";
import { PointEvent } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  pointsAwarded: z.number().int().min(0),
  isCorrect: z.boolean(),
  comment: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isProctor(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const sub = await prisma.answerSubmission.findUnique({
    where: { id },
    include: {
      question: { select: { points: true, type: true } },
      attempt: { include: { quiz: { select: { id: true, kind: true, minScore: true } } } },
    },
  });
  if (!sub) return NextResponse.json({ error: "Jawaban tidak ditemukan." }, { status: 404 });
  if (sub.question.type !== "ESSAY") {
    return NextResponse.json({ error: "Hanya soal essay yang dinilai manual." }, { status: 400 });
  }
  if (parsed.data.pointsAwarded > sub.question.points) {
    return NextResponse.json({ error: "Poin melebihi bobot soal." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.answerSubmission.update({
      where: { id },
      data: {
        pointsAwarded: parsed.data.pointsAwarded,
        isCorrect: parsed.data.isCorrect,
        gradedById: session.user.id,
        gradedAt: new Date(),
      },
    });

    // Recompute score for the attempt.
    const subs = await tx.answerSubmission.findMany({
      where: { attemptId: sub.attemptId },
      include: { question: { select: { points: true, type: true } } },
    });
    const totalPoints = subs.reduce((s, x) => s + x.question.points, 0);
    const earned = subs.reduce((s, x) => s + x.pointsAwarded, 0);
    const ungraded = subs.some(
      (x) => x.question.type === "ESSAY" && (x.isCorrect === null || x.gradedAt === null)
    );
    const score = totalPoints === 0 ? 0 : Math.round((earned / totalPoints) * 100);
    const passed = !ungraded && score >= sub.attempt.quiz.minScore;

    await tx.quizAttempt.update({
      where: { id: sub.attemptId },
      data: {
        score,
        passed,
        status: ungraded ? "SUBMITTED" : "GRADED",
      },
    });

    // ExamSession score sync (if attempt is linked).
    const examSession = await tx.examSession.findUnique({
      where: { attemptId: sub.attemptId },
    });
    if (examSession) {
      await tx.examSession.update({
        where: { id: examSession.id },
        data: { score, passed },
      });
    }

    // Award EXAM_PASS points the first time the FINAL attempt becomes passed.
    if (passed && sub.attempt.quiz.kind === "FINAL") {
      const already = await tx.pointsLedger.findFirst({
        where: {
          userId: sub.attempt.userId,
          event: PointEvent.EXAM_PASS,
          refType: "exam",
          refId: sub.attempt.quiz.id,
        },
      });
      if (!already) {
        await awardPoints({
          userId: sub.attempt.userId,
          event: PointEvent.EXAM_PASS,
          reason: "Lulus ujian akhir (graded by proctor)",
          refType: "exam",
          refId: sub.attempt.quiz.id,
          tx,
        });
      }
      // Auto-issue certificate (idempotent).
      const finalCourse = await tx.quiz.findUnique({
        where: { id: sub.attempt.quiz.id },
        select: { finalCourseId: true },
      });
      if (finalCourse?.finalCourseId) {
        const cert = await issueCertificate(sub.attempt.userId, finalCourse.finalCourseId, tx);
        const certAlready = await tx.pointsLedger.findFirst({
          where: {
            userId: sub.attempt.userId,
            event: PointEvent.CERT_EARNED,
            refType: "certificate",
            refId: cert.id,
          },
        });
        if (!certAlready) {
          await awardPoints({
            userId: sub.attempt.userId,
            event: PointEvent.CERT_EARNED,
            reason: `Sertifikat diterbitkan: ${cert.certNumber}`,
            refType: "certificate",
            refId: cert.id,
            tx,
          });
        }
      }
    }

    return { score, passed, ungraded };
  });

  return NextResponse.json({ ok: true, ...result });
}

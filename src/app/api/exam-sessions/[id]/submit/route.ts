import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { PointEvent } from "@prisma/client";
import { getCourseProgressForUser } from "@/lib/courses";
import { issueCertificate } from "@/lib/certificates";
import { z } from "zod";

const schema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      choiceId: z.string().optional().nullable(),
      essayText: z.string().optional().nullable(),
    })
  ),
  // True when client triggered auto-submit (timer/violation). Server still validates.
  forced: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const examSession = await prisma.examSession.findUnique({
    where: { id },
    include: {
      quiz: {
        include: {
          questions: { include: { choices: true } },
          pretestCourse: { select: { id: true } },
          finalCourse: { select: { id: true } },
        },
      },
    },
  });
  if (!examSession) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  if (examSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Bukan sesi kamu." }, { status: 403 });
  }
  if (!examSession.attemptId) {
    return NextResponse.json({ error: "Sesi tidak punya attempt linked." }, { status: 500 });
  }

  // Allow submit if ACTIVE (normal/forced), or if FORCE_ENDED by violation (still grade), or EXPIRED.
  if (examSession.status === "SUBMITTED") {
    return NextResponse.json({ error: "Sesi sudah disubmit." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  // Auto-detect EXPIRED if past endsAt and not yet ended.
  const isExpired =
    examSession.status === "ACTIVE" &&
    examSession.endsAt &&
    examSession.endsAt < new Date();

  const questions = examSession.quiz.questions;
  const answersMap = new Map(parsed.data.answers.map((a) => [a.questionId, a]));

  let totalPoints = 0;
  let earnedPoints = 0;
  let correctCount = 0;
  let hasUngradedEssay = false;

  const submissions: {
    questionId: string;
    choiceId?: string;
    essayText?: string;
    isCorrect: boolean | null;
    pointsAwarded: number;
  }[] = [];

  for (const q of questions) {
    totalPoints += q.points;
    const a = answersMap.get(q.id);
    if (!a) {
      submissions.push({ questionId: q.id, isCorrect: false, pointsAwarded: 0 });
      continue;
    }
    if (q.type === "ESSAY") {
      hasUngradedEssay = true;
      submissions.push({
        questionId: q.id,
        essayText: a.essayText ?? undefined,
        isCorrect: null,
        pointsAwarded: 0,
      });
      continue;
    }
    const correct = q.choices.find((c) => c.isCorrect);
    const ok = !!a.choiceId && a.choiceId === correct?.id;
    if (ok) {
      correctCount++;
      earnedPoints += q.points;
    }
    submissions.push({
      questionId: q.id,
      choiceId: a.choiceId ?? undefined,
      isCorrect: ok,
      pointsAwarded: ok ? q.points : 0,
    });
  }

  const score = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);
  const passedAuto = score >= examSession.quiz.minScore;
  const passed = hasUngradedEssay ? false : passedAuto;
  const isFinal = examSession.quiz.kind === "FINAL";
  const isPretest = examSession.quiz.kind === "PRETEST";

  const finalSessionStatus =
    examSession.status === "FORCE_ENDED"
      ? "FORCE_ENDED"
      : isExpired
        ? "EXPIRED"
        : "SUBMITTED";

  await prisma.$transaction(async (tx) => {
    await tx.examSession.update({
      where: { id },
      data: {
        status: finalSessionStatus,
        submittedAt: examSession.submittedAt ?? new Date(),
        score,
        passed,
      },
    });
    await tx.quizAttempt.update({
      where: { id: examSession.attemptId! },
      data: {
        submittedAt: new Date(),
        score,
        passed,
        status: hasUngradedEssay ? "SUBMITTED" : "GRADED",
      },
    });
    await tx.answerSubmission.createMany({
      data: submissions.map((s) => ({
        attemptId: examSession.attemptId!,
        questionId: s.questionId,
        choiceId: s.choiceId,
        essayText: s.essayText,
        isCorrect: s.isCorrect,
        pointsAwarded: s.pointsAwarded,
      })),
    });

    if (passed && (isFinal || isPretest)) {
      // Pretest passing doesn't award exam points (it's just a gate); only FINAL awards.
      if (isFinal) {
        await awardPoints({
          userId: session.user.id,
          event: PointEvent.EXAM_PASS,
          reason: "Lulus ujian akhir",
          refType: "exam",
          refId: examSession.quiz.id,
          tx,
        });
      }
      // Update enrollment progress for related course.
      const courseId = examSession.quiz.pretestCourse?.id ?? examSession.quiz.finalCourse?.id ?? null;
      if (courseId) {
        const refreshed = await getCourseProgressForUser(courseId, session.user.id);
        await tx.enrollment.update({
          where: { userId_courseId: { userId: session.user.id, courseId } },
          data: {
            progressPct: refreshed.progressPct,
            completedAt: refreshed.fullyDone ? new Date() : null,
          },
        });
        // Auto-issue certificate when FINAL passed.
        if (isFinal) {
          const cert = await issueCertificate(session.user.id, courseId, tx);
          // Award CERT_EARNED only on first issuance.
          const alreadyAwarded = await tx.pointsLedger.findFirst({
            where: {
              userId: session.user.id,
              event: PointEvent.CERT_EARNED,
              refType: "certificate",
              refId: cert.id,
            },
          });
          if (!alreadyAwarded) {
            await awardPoints({
              userId: session.user.id,
              event: PointEvent.CERT_EARNED,
              reason: `Sertifikat diterbitkan: ${cert.certNumber}`,
              refType: "certificate",
              refId: cert.id,
              tx,
            });
          }
        }
      }
    }
  });

  const refreshedUser = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { points: true },
  });

  return NextResponse.json({
    score,
    passed,
    correct: correctCount,
    total: questions.length,
    needsManualGrading: hasUngradedEssay,
    sessionStatus: finalSessionStatus,
    newPoints: refreshedUser.points,
    forced: parsed.data.forced ?? false,
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { PointEvent } from "@prisma/client";
import { getCourseProgressForUser } from "@/lib/courses";
import { z } from "zod";

const schema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      choiceId: z.string().optional().nullable(),
      essayText: z.string().optional().nullable(),
    })
  ),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: attemptId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: { include: { choices: true } },
          section: { select: { courseId: true, id: true } },
          pretestCourse: { select: { id: true } },
          finalCourse: { select: { id: true } },
        },
      },
    },
  });
  if (!attempt) return NextResponse.json({ error: "Attempt tidak ditemukan." }, { status: 404 });
  if (attempt.userId !== session.user.id) {
    return NextResponse.json({ error: "Bukan attempt kamu." }, { status: 403 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Attempt sudah disubmit." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const questions = attempt.quiz.questions;
  const answersMap = new Map(parsed.data.answers.map((a) => [a.questionId, a]));

  let totalPoints = 0;
  let earnedPoints = 0;
  let correctCount = 0;
  const isFinal = attempt.quiz.kind === "FINAL";

  // Auto-grade MCQ + TRUE_FALSE; ESSAY is left ungraded (status will reflect that)
  const submissions: {
    questionId: string;
    choiceId?: string;
    essayText?: string;
    isCorrect: boolean | null;
    pointsAwarded: number;
  }[] = [];

  let hasUngradedEssay = false;

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

    const correctChoice = q.choices.find((c) => c.isCorrect);
    const isCorrect = !!a.choiceId && a.choiceId === correctChoice?.id;
    if (isCorrect) {
      correctCount++;
      earnedPoints += q.points;
    }
    submissions.push({
      questionId: q.id,
      choiceId: a.choiceId ?? undefined,
      isCorrect,
      pointsAwarded: isCorrect ? q.points : 0,
    });
  }

  const score = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);
  const passedAuto = score >= attempt.quiz.minScore;
  // If has ungraded essay, defer pass decision
  const passed = hasUngradedEssay ? false : passedAuto;
  const status = hasUngradedEssay ? "SUBMITTED" : "GRADED";

  await prisma.$transaction(async (tx) => {
    await tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: new Date(),
        score,
        passed,
        status,
      },
    });

    await tx.answerSubmission.createMany({
      data: submissions.map((s) => ({
        attemptId,
        questionId: s.questionId,
        choiceId: s.choiceId,
        essayText: s.essayText,
        isCorrect: s.isCorrect,
        pointsAwarded: s.pointsAwarded,
      })),
    });

    if (passed) {
      await awardPoints({
        userId: session.user.id,
        event: isFinal ? PointEvent.EXAM_PASS : PointEvent.QUIZ_PASS,
        reason: isFinal ? "Lulus ujian akhir" : "Lulus quiz section",
        refType: isFinal ? "exam" : "quiz",
        refId: attempt.quiz.id,
        tx,
      });

      // Update enrollment progress for section quizzes
      if (attempt.quiz.section) {
        const refreshed = await getCourseProgressForUser(attempt.quiz.section.courseId, session.user.id);
        await tx.enrollment.update({
          where: {
            userId_courseId: { userId: session.user.id, courseId: attempt.quiz.section.courseId },
          },
          data: {
            progressPct: refreshed.progressPct,
            completedAt: refreshed.fullyDone ? new Date() : null,
          },
        });
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
    newPoints: refreshedUser.points,
  });
}

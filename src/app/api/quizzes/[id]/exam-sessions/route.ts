import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      pretestCourse: { select: { id: true } },
      finalCourse: { select: { id: true } },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz tidak ditemukan." }, { status: 404 });
  if (quiz.kind === "SECTION") {
    return NextResponse.json(
      { error: "Section quiz pakai endpoint /api/quizzes/[id]/attempts." },
      { status: 400 }
    );
  }

  const courseId = quiz.pretestCourse?.id ?? quiz.finalCourse?.id ?? null;
  if (!courseId) return NextResponse.json({ error: "Quiz tanpa parent course." }, { status: 400 });

  // Must be enrolled.
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    select: { id: true },
  });
  if (!enrolled) return NextResponse.json({ error: "Belum terdaftar di course." }, { status: 403 });

  // Already passed → don't allow new attempt.
  const passedSession = await prisma.examSession.findFirst({
    where: { quizId, userId: session.user.id, passed: true },
    select: { id: true },
  });
  if (passedSession) {
    return NextResponse.json({ sessionId: passedSession.id, alreadyPassed: true });
  }

  // Resume in-progress session.
  const inProgress = await prisma.examSession.findFirst({
    where: { quizId, userId: session.user.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (inProgress) return NextResponse.json({ sessionId: inProgress.id });

  // Cooldown gate (rolling window, parallel to QuizAttempt logic).
  const cooldownMs = quiz.cooldownMinutes ? quiz.cooldownMinutes * 60_000 : null;
  const cooldownStart = cooldownMs ? new Date(Date.now() - cooldownMs) : null;
  const submittedInWindow = await prisma.examSession.count({
    where: {
      userId: session.user.id,
      quizId,
      status: { in: ["SUBMITTED", "FORCE_ENDED", "EXPIRED"] },
      ...(cooldownStart && { submittedAt: { gte: cooldownStart } }),
    },
  });
  if (submittedInWindow >= quiz.maxAttempts) {
    return NextResponse.json(
      { error: "Percobaan habis dalam jendela cooldown. Hubungi proktor untuk reset." },
      { status: 400 }
    );
  }

  const startedAt = new Date();
  const durationSec = quiz.timerSec ?? 60 * 60;
  const endsAt = new Date(startedAt.getTime() + durationSec * 1000);

  // Create attempt + exam session in one transaction so they share a lifecycle.
  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.create({
      data: {
        userId: session.user.id,
        quizId,
        status: "IN_PROGRESS",
      },
    });
    const examSession = await tx.examSession.create({
      data: {
        quizId,
        userId: session.user.id,
        status: "ACTIVE",
        startedAt,
        endsAt,
        durationSec,
        webcamEnabled: quiz.webcamEnabled,
        webcamIntervalSec: quiz.webcamIntervalSec,
        maxViolations: quiz.maxViolations,
        attemptId: attempt.id,
      },
    });
    return { attempt, examSession };
  });

  return NextResponse.json({
    sessionId: result.examSession.id,
    attemptId: result.attempt.id,
    endsAt: result.examSession.endsAt?.toISOString(),
    webcamEnabled: result.examSession.webcamEnabled,
    webcamIntervalSec: result.examSession.webcamIntervalSec,
    maxViolations: result.examSession.maxViolations,
  });
}

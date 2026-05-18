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
      section: { select: { courseId: true } },
      pretestCourse: { select: { id: true } },
      finalCourse: { select: { id: true } },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz tidak ditemukan." }, { status: 404 });

  const courseId = quiz.section?.courseId ?? quiz.pretestCourse?.id ?? quiz.finalCourse?.id ?? null;
  if (!courseId) return NextResponse.json({ error: "Quiz tidak terhubung ke course." }, { status: 400 });

  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    select: { id: true },
  });
  if (!enrolled) return NextResponse.json({ error: "Belum terdaftar di course." }, { status: 403 });

  const passed = await prisma.quizAttempt.findFirst({
    where: { userId: session.user.id, quizId, passed: true },
    select: { id: true },
  });
  if (passed) return NextResponse.json({ attemptId: passed.id, alreadyPassed: true });

  const inProgress = await prisma.quizAttempt.findFirst({
    where: { userId: session.user.id, quizId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (inProgress) return NextResponse.json({ attemptId: inProgress.id });

  // Count submitted attempts within the cooldown window (rolling).
  // If cooldownMinutes is null, fall back to lifetime count (hard limit).
  const cooldownMs = quiz.cooldownMinutes ? quiz.cooldownMinutes * 60_000 : null;
  const cooldownStart = cooldownMs ? new Date(Date.now() - cooldownMs) : null;

  const submittedInWindow = await prisma.quizAttempt.count({
    where: {
      userId: session.user.id,
      quizId,
      status: { not: "IN_PROGRESS" },
      ...(cooldownStart && { submittedAt: { gte: cooldownStart } }),
    },
  });

  if (submittedInWindow >= quiz.maxAttempts) {
    // Find earliest attempt in window — that's the one whose expiry frees a slot
    const earliestInWindow = cooldownStart
      ? await prisma.quizAttempt.findFirst({
          where: {
            userId: session.user.id,
            quizId,
            status: { not: "IN_PROGRESS" },
            submittedAt: { gte: cooldownStart },
          },
          orderBy: { submittedAt: "asc" },
          select: { submittedAt: true },
        })
      : null;

    const nextAvailableAt =
      cooldownMs && earliestInWindow?.submittedAt
        ? new Date(earliestInWindow.submittedAt.getTime() + cooldownMs)
        : null;

    return NextResponse.json(
      {
        error: nextAvailableAt
          ? "Percobaan habis. Tunggu cooldown atau minta admin reset."
          : "Percobaan habis. Hubungi admin untuk reset.",
        nextAvailableAt: nextAvailableAt?.toISOString() ?? null,
      },
      { status: 400 }
    );
  }

  const attempt = await prisma.quizAttempt.create({
    data: { userId: session.user.id, quizId, status: "IN_PROGRESS" },
  });
  return NextResponse.json({ attemptId: attempt.id });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { PointEvent } from "@prisma/client";
import { getCourseProgressForUser } from "@/lib/courses";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { section: { select: { id: true, courseId: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson tidak ditemukan." }, { status: 404 });

  // Must be enrolled
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: lesson.section.courseId } },
    select: { id: true },
  });
  if (!enrolled) return NextResponse.json({ error: "Belum terdaftar di course ini." }, { status: 403 });

  // Section must be unlocked
  const progress = await getCourseProgressForUser(lesson.section.courseId, session.user.id);
  if (!progress.unlockedSectionIds.has(lesson.section.id)) {
    return NextResponse.json({ error: "Section belum terbuka." }, { status: 400 });
  }

  // Idempotent — only award once
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: session.user.id, lessonId: id } },
    select: { id: true },
  });
  if (existing) {
    const u = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { points: true },
    });
    return NextResponse.json({ ok: true, already: true, newPoints: u.points });
  }

  await prisma.$transaction(async (tx) => {
    await tx.lessonProgress.create({
      data: { userId: session.user.id, lessonId: id },
    });
    await awardPoints({
      userId: session.user.id,
      event: PointEvent.LESSON_COMPLETE,
      reason: `Selesaikan lesson: ${lesson.title}`,
      refType: "lesson",
      refId: id,
      tx,
    });

    const refreshed = await getCourseProgressForUser(lesson.section.courseId, session.user.id);
    await tx.enrollment.update({
      where: { userId_courseId: { userId: session.user.id, courseId: lesson.section.courseId } },
      data: {
        progressPct: refreshed.progressPct,
        completedAt: refreshed.fullyDone ? new Date() : null,
      },
    });
  });

  const refreshedUser = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { points: true },
  });
  return NextResponse.json({ ok: true, newPoints: refreshedUser.points });
}

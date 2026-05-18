import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { PointEvent } from "@prisma/client";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, isLocked: true, pointPrice: true, title: true },
  });
  if (!course) return NextResponse.json({ error: "Course tidak ditemukan." }, { status: 404 });

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: id } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ ok: true, already: true });

  try {
    await prisma.$transaction(async (tx) => {
      if (course.isLocked && course.pointPrice > 0) {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: session.user.id },
          select: { points: true },
        });
        if (user.points < course.pointPrice) {
          throw new Error("INSUFFICIENT_POINTS");
        }
        await awardPoints({
          userId: session.user.id,
          event: PointEvent.COURSE_UNLOCK,
          delta: -course.pointPrice,
          reason: `Buka course: ${course.title}`,
          refType: "course",
          refId: course.id,
          tx,
        });
      }
      await tx.enrollment.create({
        data: { userId: session.user.id, courseId: id },
      });
    });
  } catch (e) {
    if ((e as Error).message === "INSUFFICIENT_POINTS") {
      return NextResponse.json({ error: "Poin tidak cukup." }, { status: 400 });
    }
    throw e;
  }

  const u = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { points: true },
  });
  return NextResponse.json({ ok: true, newPoints: u.points });
}

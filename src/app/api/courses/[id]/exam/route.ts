import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { QuizKind } from "@prisma/client";
import { z } from "zod";

/**
 * Idempotent: ensure a pretest or final exam quiz exists for this course.
 * If it already exists, return its id.
 */
const schema = z.object({
  kind: z.enum(["PRETEST", "FINAL"]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, labId: true, title: true, passScore: true },
  });
  if (!course) return NextResponse.json({ error: "Course tidak ditemukan." }, { status: 404 });
  if (!(await canManageLab(session.user.id, session.user.role, course.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const isPretest = parsed.data.kind === "PRETEST";
  const existing = await prisma.quiz.findFirst({
    where: isPretest ? { pretestCourseId: courseId } : { finalCourseId: courseId },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ id: existing.id, already: true });

  const quiz = await prisma.quiz.create({
    data: {
      kind: isPretest ? QuizKind.PRETEST : QuizKind.FINAL,
      title: isPretest ? `Pretest - ${course.title}` : `Final Exam - ${course.title}`,
      pretestCourseId: isPretest ? courseId : null,
      finalCourseId: isPretest ? null : courseId,
      minScore: isPretest ? 0 : course.passScore,
      maxAttempts: isPretest ? 3 : 2,
      timerSec: isPretest ? 30 * 60 : 60 * 60, // pretest 30min, final 60min
      cooldownMinutes: isPretest ? 30 : null, // final has no cooldown — proktor controls
      randomize: true,
      // Anti-cheat defaults: pretest soft, final strict.
      webcamEnabled: false,
      maxViolations: isPretest ? 5 : 3,
    },
  });

  return NextResponse.json({ id: quiz.id });
}

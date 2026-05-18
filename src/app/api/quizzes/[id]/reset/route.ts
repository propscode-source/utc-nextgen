import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({
  // Either pass userId directly, or identifier (email/NIM) for the admin convenience flow
  userId: z.string().optional(),
  identifier: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      section: { select: { course: { select: { labId: true } } } },
      pretestCourse: { select: { labId: true } },
      finalCourse: { select: { labId: true } },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz tidak ditemukan." }, { status: 404 });
  const labId =
    quiz.section?.course.labId ?? quiz.pretestCourse?.labId ?? quiz.finalCourse?.labId ?? null;
  if (!labId) return NextResponse.json({ error: "Quiz tanpa parent lab." }, { status: 400 });
  if (!(await canManageLab(session.user.id, session.user.role, labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  let targetUserId = parsed.data.userId ?? null;
  if (!targetUserId && parsed.data.identifier) {
    const u = await prisma.user.findFirst({
      where: { OR: [{ email: parsed.data.identifier }, { nim: parsed.data.identifier }] },
      select: { id: true },
    });
    if (!u) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    targetUserId = u.id;
  }
  if (!targetUserId) {
    return NextResponse.json({ error: "userId atau identifier wajib." }, { status: 400 });
  }

  // Delete all attempts for that user on this quiz. Cascade removes AnswerSubmission via FK.
  const result = await prisma.quizAttempt.deleteMany({
    where: { quizId, userId: targetUserId },
  });

  return NextResponse.json({ ok: true, deletedAttempts: result.count });
}

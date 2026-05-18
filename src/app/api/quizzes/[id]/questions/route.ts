import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { QuestionType } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  type: z.nativeEnum(QuestionType),
  text: z.string().min(2).max(2000).default("Pertanyaan baru"),
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

  const last = await prisma.question.findFirst({
    where: { quizId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? 0) + 1;

  // Auto-create choices for MCQ (4) and TRUE_FALSE (2)
  let choicesData: { text: string; isCorrect: boolean; order: number }[] = [];
  if (parsed.data.type === "MCQ") {
    choicesData = [
      { text: "Pilihan A", isCorrect: true, order: 0 },
      { text: "Pilihan B", isCorrect: false, order: 1 },
      { text: "Pilihan C", isCorrect: false, order: 2 },
      { text: "Pilihan D", isCorrect: false, order: 3 },
    ];
  } else if (parsed.data.type === "TRUE_FALSE") {
    choicesData = [
      { text: "Benar", isCorrect: true, order: 0 },
      { text: "Salah", isCorrect: false, order: 1 },
    ];
  }

  const question = await prisma.question.create({
    data: {
      quizId,
      type: parsed.data.type,
      text: parsed.data.text,
      order,
      choices: { create: choicesData },
    },
    include: { choices: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({
    id: question.id,
    type: question.type,
    order: question.order,
    text: question.text,
    points: question.points,
    choices: question.choices.map((c) => ({
      id: c.id,
      text: c.text,
      isCorrect: c.isCorrect,
      order: c.order,
    })),
  });
}

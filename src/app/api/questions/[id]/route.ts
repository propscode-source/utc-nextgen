import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const choiceSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1).max(500),
  isCorrect: z.boolean(),
  order: z.number().int().min(0).optional(),
});

const patchSchema = z.object({
  text: z.string().min(2).max(2000).optional(),
  points: z.number().int().min(1).max(20).optional(),
  order: z.number().int().min(1).optional(),
  choices: z.array(choiceSchema).optional(),
});

async function authorize(questionId: string, session: { user: { id: string; role: import("@prisma/client").Role } }) {
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      type: true,
      quiz: {
        select: {
          section: { select: { course: { select: { labId: true } } } },
          pretestCourse: { select: { labId: true } },
          finalCourse: { select: { labId: true } },
        },
      },
    },
  });
  if (!q) return { ok: false, status: 404 as const, error: "Soal tidak ditemukan." };
  const labId =
    q.quiz.section?.course.labId ?? q.quiz.pretestCourse?.labId ?? q.quiz.finalCourse?.labId ?? null;
  if (!labId) return { ok: false, status: 400 as const, error: "Soal tanpa parent lab." };
  const ok = await canManageLab(session.user.id, session.user.role, labId);
  if (!ok) return { ok: false, status: 403 as const, error: "Tidak punya izin." };
  return { ok: true as const, type: q.type };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const az = await authorize(id, session);
  if (!az.ok) return NextResponse.json({ error: az.error }, { status: az.status });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  if (parsed.data.choices) {
    if (az.type === "ESSAY") {
      return NextResponse.json({ error: "Soal essay tidak punya pilihan." }, { status: 400 });
    }
    // MCQ: ensure at least one correct
    if (az.type === "MCQ" && !parsed.data.choices.some((c) => c.isCorrect)) {
      return NextResponse.json({ error: "Tandai minimal satu pilihan benar." }, { status: 400 });
    }
    // For TRUE_FALSE/MCQ, only one isCorrect allowed
    const correctCount = parsed.data.choices.filter((c) => c.isCorrect).length;
    if (correctCount > 1) {
      // Keep only the first correct
      let kept = false;
      parsed.data.choices = parsed.data.choices.map((c) => {
        if (c.isCorrect && !kept) {
          kept = true;
          return c;
        }
        return { ...c, isCorrect: false };
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    if (parsed.data.text !== undefined || parsed.data.points !== undefined || parsed.data.order !== undefined) {
      await tx.question.update({
        where: { id },
        data: {
          ...(parsed.data.text !== undefined && { text: parsed.data.text }),
          ...(parsed.data.points !== undefined && { points: parsed.data.points }),
          ...(parsed.data.order !== undefined && { order: parsed.data.order }),
        },
      });
    }
    if (parsed.data.choices) {
      // Replace choices: delete and re-create. Keeps it simple.
      await tx.choice.deleteMany({ where: { questionId: id } });
      await tx.choice.createMany({
        data: parsed.data.choices.map((c, idx) => ({
          questionId: id,
          text: c.text,
          isCorrect: c.isCorrect,
          order: c.order ?? idx,
        })),
      });
    }
  });

  const fresh = await prisma.question.findUnique({
    where: { id },
    include: { choices: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({
    id: fresh!.id,
    type: fresh!.type,
    order: fresh!.order,
    text: fresh!.text,
    points: fresh!.points,
    choices: fresh!.choices.map((c) => ({
      id: c.id,
      text: c.text,
      isCorrect: c.isCorrect,
      order: c.order,
    })),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const az = await authorize(id, session);
  if (!az.ok) return NextResponse.json({ error: az.error }, { status: az.status });

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

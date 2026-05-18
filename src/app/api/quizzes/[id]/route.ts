import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const patchSchema = z.object({
  minScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  timerSec: z.number().int().min(0).nullable().optional(),
  cooldownMinutes: z.number().int().min(0).nullable().optional(),
  randomize: z.boolean().optional(),
  title: z.string().min(3).max(180).optional(),
  // anti-cheat
  webcamEnabled: z.boolean().optional(),
  webcamIntervalSec: z.number().int().min(15).max(600).optional(),
  maxViolations: z.number().int().min(1).max(20).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({
    where: { id },
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  await prisma.quiz.update({
    where: { id },
    data: {
      ...(parsed.data.minScore !== undefined && { minScore: parsed.data.minScore }),
      ...(parsed.data.maxAttempts !== undefined && { maxAttempts: parsed.data.maxAttempts }),
      ...(parsed.data.timerSec !== undefined && { timerSec: parsed.data.timerSec }),
      ...(parsed.data.cooldownMinutes !== undefined && { cooldownMinutes: parsed.data.cooldownMinutes }),
      ...(parsed.data.randomize !== undefined && { randomize: parsed.data.randomize }),
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.webcamEnabled !== undefined && { webcamEnabled: parsed.data.webcamEnabled }),
      ...(parsed.data.webcamIntervalSec !== undefined && { webcamIntervalSec: parsed.data.webcamIntervalSec }),
      ...(parsed.data.maxViolations !== undefined && { maxViolations: parsed.data.maxViolations }),
    },
  });
  return NextResponse.json({ ok: true });
}

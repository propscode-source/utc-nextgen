import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { LessonType } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2).max(180),
  type: z.nativeEnum(LessonType).default(LessonType.TEXT),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sectionId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { course: { select: { labId: true } } },
  });
  if (!section) return NextResponse.json({ error: "Section tidak ditemukan." }, { status: 404 });
  if (!(await canManageLab(session.user.id, session.user.role, section.course.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const last = await prisma.lesson.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? 0) + 1;

  const lesson = await prisma.lesson.create({
    data: { sectionId, title: parsed.data.title, type: parsed.data.type, order },
  });
  return NextResponse.json({
    id: lesson.id,
    title: lesson.title,
    order: lesson.order,
    type: lesson.type,
    contentText: lesson.contentText ?? "",
    contentJson: lesson.contentJson ?? null,
    contentUrl: lesson.contentUrl ?? "",
    durationSec: lesson.durationSec,
  });
}

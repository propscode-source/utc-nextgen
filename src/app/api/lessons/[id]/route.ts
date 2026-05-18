import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { LessonType, Prisma } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  type: z.nativeEnum(LessonType).optional(),
  contentText: z.string().nullable().optional(),
  contentJson: z.record(z.any()).nullable().optional(),
  contentUrl: z.string().nullable().optional(),
  durationSec: z.number().int().min(0).nullable().optional(),
  order: z.number().int().min(1).optional(),
});

async function authorize(lessonId: string, session: { user: { id: string; role: import("@prisma/client").Role } }) {
  const l = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { section: { select: { course: { select: { labId: true } } } } },
  });
  if (!l) return { ok: false, status: 404 as const, error: "Lesson tidak ditemukan." };
  const ok = await canManageLab(session.user.id, session.user.role, l.section.course.labId);
  if (!ok) return { ok: false, status: 403 as const, error: "Tidak punya izin." };
  return { ok: true as const };
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

  const data = parsed.data;
  await prisma.lesson.update({
    where: { id },
    data: {
      ...("title" in data && { title: data.title }),
      ...("type" in data && { type: data.type }),
      ...("contentText" in data && { contentText: data.contentText || null }),
      ...("contentJson" in data && { contentJson: data.contentJson ?? Prisma.DbNull }),
      ...("contentUrl" in data && { contentUrl: data.contentUrl || null }),
      ...("durationSec" in data && { durationSec: data.durationSec }),
      ...("order" in data && { order: data.order }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const az = await authorize(id, session);
  if (!az.ok) return NextResponse.json({ error: az.error }, { status: az.status });

  await prisma.lesson.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

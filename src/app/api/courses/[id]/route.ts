import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  description: z.string().max(2000).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional().or(z.literal("")),
  isLocked: z.boolean().optional(),
  pointPrice: z.number().int().min(0).optional(),
  passScore: z.number().int().min(0).max(100).optional(),
  requirePretest: z.boolean().optional(),
  certNumberPrefix: z.string().max(80).nullable().optional(),
  certNumberPattern: z.string().max(120).nullable().optional(),
});

async function authorize(courseId: string, session: { user: { id: string; role: import("@prisma/client").Role } }) {
  const c = await prisma.course.findUnique({ where: { id: courseId }, select: { labId: true } });
  if (!c) return { ok: false, status: 404 as const, error: "Course tidak ditemukan." };
  const ok = await canManageLab(session.user.id, session.user.role, c.labId);
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
  await prisma.course.update({
    where: { id },
    data: {
      ...("title" in data && { title: data.title }),
      ...("description" in data && { description: data.description ?? null }),
      ...("thumbnailUrl" in data && { thumbnailUrl: data.thumbnailUrl || null }),
      ...("isLocked" in data && { isLocked: data.isLocked }),
      ...("pointPrice" in data && { pointPrice: data.pointPrice }),
      ...("passScore" in data && { passScore: data.passScore }),
      ...("requirePretest" in data && { requirePretest: data.requirePretest }),
      ...("certNumberPrefix" in data && { certNumberPrefix: data.certNumberPrefix?.trim() || null }),
      ...("certNumberPattern" in data && { certNumberPattern: data.certNumberPattern?.trim() || null }),
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

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { ProjectStatus } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  position: z.number().int().min(0).optional(),
  budget: z.number().int().min(0).optional(),
  budgetUsed: z.number().int().min(0).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id }, select: { labId: true } });
  if (!project) return NextResponse.json({ error: "Proker tidak ditemukan." }, { status: 404 });

  if (!(await canManageLab(session.user.id, session.user.role, project.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const data = parsed.data;
  await prisma.project.update({
    where: { id },
    data: {
      ...("title" in data && { title: data.title }),
      ...("description" in data && { description: data.description ?? null }),
      ...("status" in data && { status: data.status }),
      ...("position" in data && { position: data.position }),
      ...("budget" in data && { budget: data.budget }),
      ...("budgetUsed" in data && { budgetUsed: data.budgetUsed }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id }, select: { labId: true } });
  if (!project) return NextResponse.json({ error: "Proker tidak ditemukan." }, { status: 404 });

  if (!(await canManageLab(session.user.id, session.user.role, project.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

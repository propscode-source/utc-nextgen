import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  done: z.boolean().optional(),
});

async function authorize(milestoneId: string, session: { user: { id: string; role: import("@prisma/client").Role } }) {
  const m = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { project: { select: { labId: true } } },
  });
  if (!m) return { ok: false, status: 404 as const, error: "Milestone tidak ditemukan." };
  const ok = await canManageLab(session.user.id, session.user.role, m.project.labId);
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

  await prisma.milestone.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.done !== undefined && {
        done: parsed.data.done,
        completedAt: parsed.data.done ? new Date() : null,
      }),
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

  await prisma.milestone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

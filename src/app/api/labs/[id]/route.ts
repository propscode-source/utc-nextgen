import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab, isSuperadmin } from "@/lib/perms";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal("")),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await canManageLab(session.user.id, session.user.role, id))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  await prisma.lab.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description ?? null }),
      ...(parsed.data.logoUrl !== undefined && { logoUrl: parsed.data.logoUrl || null }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperadmin(session.user.role)) {
    return NextResponse.json({ error: "Hanya superadmin yang boleh menghapus lab." }, { status: 403 });
  }

  await prisma.lab.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

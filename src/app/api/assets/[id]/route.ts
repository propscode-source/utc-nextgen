import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { AssetCondition } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  code: z.string().min(2).max(60).optional(),
  description: z.string().max(1000).optional(),
  quantity: z.number().int().min(0).optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
  acquiredCost: z.number().int().min(0).optional(),
});

async function authorize(assetId: string, session: { user: { id: string; role: import("@prisma/client").Role } }) {
  const a = await prisma.asset.findUnique({ where: { id: assetId }, select: { labId: true } });
  if (!a) return { ok: false, status: 404 as const, error: "Aset tidak ditemukan." };
  const ok = await canManageLab(session.user.id, session.user.role, a.labId);
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

  if (parsed.data.code) {
    const dup = await prisma.asset.findFirst({
      where: { code: parsed.data.code, NOT: { id } },
      select: { id: true },
    });
    if (dup) return NextResponse.json({ error: "Kode aset sudah dipakai." }, { status: 409 });
  }

  await prisma.asset.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.code !== undefined && { code: parsed.data.code }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
      ...(parsed.data.quantity !== undefined && { quantity: parsed.data.quantity }),
      ...(parsed.data.condition !== undefined && { condition: parsed.data.condition }),
      ...(parsed.data.acquiredCost !== undefined && { acquiredCost: parsed.data.acquiredCost }),
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

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MerchKind } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional().or(z.literal("")),
  pointPrice: z.number().int().min(0).optional(),
  stock: z.number().int().min(-1).optional(),
  active: z.boolean().optional(),
  kind: z.nativeEnum(MerchKind).optional(),
});

function canManageMerch(role: string) {
  return role === "SUPERADMIN" || role === "LAB_ADMIN";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageMerch(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const data = parsed.data;
  await prisma.merchItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...(data.pointPrice !== undefined && { pointPrice: data.pointPrice }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.kind !== undefined && { kind: data.kind }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageMerch(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  // Refuse to delete if there are existing redemptions to preserve audit trail.
  const refs = await prisma.merchRedemption.count({ where: { merchItemId: id } });
  if (refs > 0) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus merchandise yang sudah pernah ditukarkan. Non-aktifkan saja." },
      { status: 400 }
    );
  }

  await prisma.merchItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

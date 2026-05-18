import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { AssetCondition } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(180),
  code: z.string().min(2).max(60),
  description: z.string().max(1000).optional(),
  quantity: z.number().int().min(0),
  condition: z.nativeEnum(AssetCondition),
  acquiredCost: z.number().int().min(0).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: labId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canManageLab(session.user.id, session.user.role, labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }

  // Code must be globally unique
  const dup = await prisma.asset.findUnique({ where: { code: parsed.data.code } });
  if (dup) return NextResponse.json({ error: "Kode aset sudah dipakai." }, { status: 409 });

  const created = await prisma.asset.create({
    data: {
      labId,
      name: parsed.data.name,
      code: parsed.data.code,
      description: parsed.data.description || null,
      quantity: parsed.data.quantity,
      condition: parsed.data.condition,
      acquiredCost: parsed.data.acquiredCost ?? null,
    },
  });
  return NextResponse.json({ id: created.id });
}

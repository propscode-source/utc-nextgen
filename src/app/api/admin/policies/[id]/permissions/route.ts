import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { PolicyEffect } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  items: z.array(
    z.object({
      permissionId: z.string(),
      effect: z.nativeEnum(PolicyEffect).default(PolicyEffect.ALLOW),
    })
  ),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "policy.manage"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const { id: policyId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }
  // Dedup by permissionId (terakhir menang)
  const map = new Map<string, PolicyEffect>();
  for (const it of parsed.data.items) map.set(it.permissionId, it.effect);
  const items = [...map.entries()].map(([permissionId, effect]) => ({ permissionId, effect }));

  // Validate ids
  if (items.length > 0) {
    const found = await prisma.permission.count({ where: { id: { in: items.map((i) => i.permissionId) } } });
    if (found !== items.length) {
      return NextResponse.json({ error: "Ada permission yang tidak ditemukan." }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.policyPermission.deleteMany({ where: { policyId } }),
    ...items.map((i) =>
      prisma.policyPermission.create({
        data: { policyId, permissionId: i.permissionId, effect: i.effect },
      })
    ),
  ]);
  return NextResponse.json({ ok: true });
}

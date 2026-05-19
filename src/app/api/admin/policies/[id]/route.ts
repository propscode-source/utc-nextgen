import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "policy.manage"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }
  await prisma.policy.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "policy.manage"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const policy = await prisma.policy.findUnique({ where: { id }, select: { isSystem: true } });
  if (!policy) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  if (policy.isSystem) {
    return NextResponse.json({ error: "Policy bawaan tidak bisa dihapus." }, { status: 400 });
  }
  await prisma.policy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

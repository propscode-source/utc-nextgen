import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "permission.manage"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const perm = await prisma.permission.findUnique({ where: { id }, select: { isSystem: true } });
  if (!perm) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  if (perm.isSystem) {
    return NextResponse.json({ error: "Permission bawaan tidak bisa dihapus." }, { status: 400 });
  }
  await prisma.permission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

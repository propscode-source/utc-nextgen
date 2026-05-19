import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { z } from "zod";

const schema = z.object({
  customRoleIds: z.array(z.string()),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "user.assign_custom_role"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const { id: userId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }

  // Validasi semua id ada
  const ids = parsed.data.customRoleIds;
  if (ids.length > 0) {
    const found = await prisma.customRole.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      return NextResponse.json({ error: "Ada role yang tidak ditemukan." }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.userCustomRole.deleteMany({ where: { userId } }),
    ...ids.map((customRoleId) =>
      prisma.userCustomRole.create({ data: { userId, customRoleId } })
    ),
  ]);

  return NextResponse.json({ ok: true });
}

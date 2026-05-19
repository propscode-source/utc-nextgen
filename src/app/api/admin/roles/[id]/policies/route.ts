import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { z } from "zod";

const schema = z.object({
  policyIds: z.array(z.string()),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "role.manage"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const { id: customRoleId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }
  const ids = Array.from(new Set(parsed.data.policyIds));
  if (ids.length > 0) {
    const found = await prisma.policy.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      return NextResponse.json({ error: "Ada policy yang tidak ditemukan." }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.customRolePolicy.deleteMany({ where: { customRoleId } }),
    ...ids.map((policyId) =>
      prisma.customRolePolicy.create({ data: { customRoleId, policyId } })
    ),
  ]);
  return NextResponse.json({ ok: true });
}

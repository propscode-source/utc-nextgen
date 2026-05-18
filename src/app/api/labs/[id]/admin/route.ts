import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab, isSuperadmin } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({ userId: z.string().nullable() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: labId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only superadmin or current lab admin may reassign
  if (!(await canManageLab(session.user.id, session.user.role, labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }
  const { userId } = parsed.data;

  if (userId) {
    // Ensure target user exists and is a member
    const member = await prisma.labMember.findUnique({
      where: { labId_userId: { labId, userId } },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "User bukan anggota lab ini." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.lab.update({ where: { id: labId }, data: { adminId: userId } }),
      prisma.user.update({ where: { id: userId }, data: { role: "LAB_ADMIN" } }),
    ]);
  } else {
    // Lab admins shouldn't be able to unset themselves unless they are also superadmin
    if (!isSuperadmin(session.user.role)) {
      return NextResponse.json({ error: "Hanya superadmin yang boleh melepas admin lab." }, { status: 403 });
    }
    await prisma.lab.update({ where: { id: labId }, data: { adminId: null } });
  }

  return NextResponse.json({ ok: true });
}

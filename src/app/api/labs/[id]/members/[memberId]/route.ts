import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { LabMemberRole } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  role: z.nativeEnum(LabMemberRole),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: labId, memberId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only superadmin or the lab admin (not asisten themselves) can change member roles.
  const lab = await prisma.lab.findUnique({ where: { id: labId }, select: { adminId: true } });
  if (!lab) return NextResponse.json({ error: "Lab tidak ditemukan." }, { status: 404 });
  const isLabAdminOfThis = session.user.role === "LAB_ADMIN" && lab.adminId === session.user.id;
  if (session.user.role !== "SUPERADMIN" && !isLabAdminOfThis) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const member = await prisma.labMember.findUnique({
    where: { id: memberId },
    select: { labId: true },
  });
  if (!member || member.labId !== labId) {
    return NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
  }

  await prisma.labMember.update({
    where: { id: memberId },
    data: { role: parsed.data.role },
  });
  return NextResponse.json({ ok: true });
}

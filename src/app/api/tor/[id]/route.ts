import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab, isSuperadmin } from "@/lib/perms";
import { TorStatus } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  contentJson: z.record(z.any()).optional(),
  status: z.nativeEnum(TorStatus).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tor = await prisma.tor.findUnique({ where: { id }, select: { labId: true, status: true } });
  if (!tor) return NextResponse.json({ error: "TOR tidak ditemukan." }, { status: 404 });

  const canManage = await canManageLab(session.user.id, session.user.role, tor.labId);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const { title, contentJson, status } = parsed.data;

  // Decide who can do what
  if (status) {
    // APPROVED / REJECTED only by superadmin from a SUBMITTED tor
    if (status === "APPROVED" || status === "REJECTED") {
      if (!isSuperadmin(session.user.role)) {
        return NextResponse.json({ error: "Hanya superadmin yang boleh menyetujui/menolak." }, { status: 403 });
      }
      if (tor.status !== "SUBMITTED") {
        return NextResponse.json({ error: "TOR belum diajukan." }, { status: 400 });
      }
    }
    // SUBMITTED only by lab manager from DRAFT or REJECTED
    if (status === "SUBMITTED") {
      if (!canManage) return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
      if (tor.status === "APPROVED") {
        return NextResponse.json({ error: "TOR sudah disetujui." }, { status: 400 });
      }
    }
    if (status === "DRAFT") {
      if (!canManage) return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
    }
  }

  if ((title !== undefined || contentJson !== undefined) && !canManage) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  // Lock content edits when APPROVED
  if (tor.status === "APPROVED" && (title !== undefined || contentJson !== undefined)) {
    return NextResponse.json({ error: "TOR sudah disetujui dan terkunci." }, { status: 400 });
  }

  await prisma.tor.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(contentJson !== undefined && { contentJson }),
      ...(status !== undefined && {
        status,
        approvedAt: status === "APPROVED" ? new Date() : status === "DRAFT" ? null : undefined,
      }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tor = await prisma.tor.findUnique({ where: { id }, select: { labId: true, status: true } });
  if (!tor) return NextResponse.json({ error: "TOR tidak ditemukan." }, { status: 404 });

  const canManage = await canManageLab(session.user.id, session.user.role, tor.labId);
  if (!canManage) return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });

  if (tor.status === "APPROVED" && !isSuperadmin(session.user.role)) {
    return NextResponse.json({ error: "Tidak bisa menghapus TOR yang sudah disetujui." }, { status: 400 });
  }

  await prisma.tor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

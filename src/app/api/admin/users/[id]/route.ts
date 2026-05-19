import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Role } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  nim: z.string().max(20).nullable().optional(),
  prodi: z.string().max(120).nullable().optional(),
  angkatan: z.number().int().min(2000).max(new Date().getFullYear() + 1).nullable().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Role change butuh permission khusus
  if (d.role !== undefined && !(await userCan(session.user.id, "user.set_role"))) {
    return NextResponse.json({ error: "Tidak punya izin ubah role." }, { status: 403 });
  }
  // Field selain role cukup user.edit
  const nonRoleKeys = Object.keys(d).filter((k) => k !== "role");
  if (nonRoleKeys.length > 0 && !(await userCan(session.user.id, "user.edit"))) {
    return NextResponse.json({ error: "Tidak punya izin edit pengguna." }, { status: 403 });
  }

  // Cegah superadmin terakhir kehilangan role
  if (d.role !== undefined && d.role !== "SUPERADMIN") {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "SUPERADMIN") {
      const count = await prisma.user.count({ where: { role: "SUPERADMIN" } });
      if (count <= 1) {
        return NextResponse.json(
          { error: "Tidak bisa menurunkan superadmin terakhir." },
          { status: 400 }
        );
      }
    }
  }
  if (d.isActive === false) {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "SUPERADMIN") {
      const count = await prisma.user.count({ where: { role: "SUPERADMIN", isActive: true } });
      if (count <= 1) {
        return NextResponse.json(
          { error: "Tidak bisa menonaktifkan superadmin terakhir." },
          { status: 400 }
        );
      }
    }
  }

  // Cek unik email/nim jika diubah
  if (d.email) {
    const dupe = await prisma.user.findFirst({
      where: { email: d.email, NOT: { id } },
      select: { id: true },
    });
    if (dupe) return NextResponse.json({ error: "Email sudah dipakai." }, { status: 409 });
  }
  if (d.nim) {
    const dupe = await prisma.user.findFirst({
      where: { nim: d.nim, NOT: { id } },
      select: { id: true },
    });
    if (dupe) return NextResponse.json({ error: "NIM sudah dipakai." }, { status: 409 });
  }

  await prisma.user.update({ where: { id }, data: d });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "user.delete"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri." }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === "SUPERADMIN") {
    const count = await prisma.user.count({ where: { role: "SUPERADMIN" } });
    if (count <= 1) {
      return NextResponse.json({ error: "Tidak bisa menghapus superadmin terakhir." }, { status: 400 });
    }
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

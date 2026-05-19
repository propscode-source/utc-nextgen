import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Role } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  key: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z][a-z0-9_.]*$/, "Hanya huruf kecil, angka, dot, underscore."),
  name: z.string().min(2).max(160),
  description: z.string().max(500).optional(),
  baseRole: z.nativeEnum(Role).default(Role.MAHASISWA),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "role.view"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const roles = await prisma.customRole.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: { permissions: true, policies: true, userRoles: true },
      },
    },
  });
  return NextResponse.json({ roles });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "role.manage"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }
  const existing = await prisma.customRole.findUnique({ where: { key: parsed.data.key }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "Key sudah dipakai." }, { status: 409 });
  if (parsed.data.key.startsWith("system.")) {
    return NextResponse.json({ error: "Prefix 'system.' direservasi untuk role bawaan." }, { status: 400 });
  }
  const created = await prisma.customRole.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      baseRole: parsed.data.baseRole,
      isSystem: false,
    },
  });
  return NextResponse.json({ id: created.id });
}

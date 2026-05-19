import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.nativeEnum(Role).default(Role.MAHASISWA),
  nim: z.string().max(20).optional().nullable(),
  prodi: z.string().max(120).optional().nullable(),
  angkatan: z.number().int().min(2000).max(new Date().getFullYear() + 1).optional().nullable(),
  isActive: z.boolean().default(true),
  customRoleIds: z.array(z.string()).optional().default([]),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "user.view"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const role = url.searchParams.get("role") as Role | null;
  const active = url.searchParams.get("active"); // "true" | "false" | null
  const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);
  const skip = Math.max(Number(url.searchParams.get("skip") ?? 0), 0);

  const where: Record<string, unknown> = {};
  if (q.length >= 1) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { nim: { contains: q } },
    ];
  }
  if (role) where.role = role;
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        nim: true,
        prodi: true,
        angkatan: true,
        role: true,
        isActive: true,
        points: true,
        emailVerified: true,
        createdAt: true,
        customRoles: {
          select: {
            customRole: { select: { id: true, key: true, name: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "user.create"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const exist = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } });
  if (exist) return NextResponse.json({ error: "Email sudah dipakai." }, { status: 409 });
  if (d.nim) {
    const nimDupe = await prisma.user.findUnique({ where: { nim: d.nim }, select: { id: true } });
    if (nimDupe) return NextResponse.json({ error: "NIM sudah dipakai." }, { status: 409 });
  }

  const password = await bcrypt.hash(d.password, 10);
  const created = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      password,
      role: d.role,
      nim: d.nim || null,
      prodi: d.prodi || null,
      angkatan: d.angkatan ?? null,
      isActive: d.isActive,
      emailVerified: new Date(), // admin-created akun langsung terverifikasi
      customRoles:
        d.customRoleIds.length > 0
          ? {
              create: d.customRoleIds.map((id) => ({ customRoleId: id })),
            }
          : undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id });
}

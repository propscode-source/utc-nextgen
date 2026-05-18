import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({
  code: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Hanya huruf kecil, angka, dan underscore"),
  name: z.string().min(2).max(120),
  description: z.string().min(2).max(500),
  iconClass: z.string().min(2).max(120).default("fa-solid fa-medal"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperadmin(session.user.role)) {
    return NextResponse.json({ error: "Hanya superadmin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }

  const existing = await prisma.badge.findUnique({ where: { code: parsed.data.code } });
  if (existing) return NextResponse.json({ error: "Code sudah dipakai." }, { status: 409 });

  const badge = await prisma.badge.create({ data: parsed.data });
  return NextResponse.json({ id: badge.id });
}

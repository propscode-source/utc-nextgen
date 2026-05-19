import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { z } from "zod";

const createSchema = z.object({
  key: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/, "Format: resource.action (huruf kecil, dot, underscore)"),
  category: z.string().min(2).max(60),
  label: z.string().min(2).max(160),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "role.view"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
  return NextResponse.json({ permissions });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await userCan(session.user.id, "permission.manage"))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }
  const existing = await prisma.permission.findUnique({ where: { key: parsed.data.key }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "Key sudah dipakai." }, { status: 409 });

  const created = await prisma.permission.create({
    data: {
      key: parsed.data.key,
      category: parsed.data.category,
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      isSystem: false,
    },
  });
  return NextResponse.json({ id: created.id });
}

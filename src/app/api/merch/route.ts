import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MerchKind } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(180),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan dash")
    .optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  pointPrice: z.number().int().min(0),
  stock: z.number().int().min(-1).default(-1),
  active: z.boolean().default(true),
  kind: z.nativeEnum(MerchKind).default(MerchKind.PHYSICAL),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function canManageMerch(role: string) {
  return role === "SUPERADMIN" || role === "LAB_ADMIN";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageMerch(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }

  let slug = parsed.data.slug ?? slugify(parsed.data.name);
  if (!slug) slug = `merch-${Date.now()}`;
  const existing = await prisma.merchItem.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Slug sudah dipakai." }, { status: 409 });
  }

  const item = await prisma.merchItem.create({
    data: {
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      pointPrice: parsed.data.pointPrice,
      stock: parsed.data.stock,
      active: parsed.data.active,
      kind: parsed.data.kind,
    },
  });
  return NextResponse.json({ id: item.id });
}

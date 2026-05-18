import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(3).max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan dash")
    .optional(),
  description: z.string().max(2000).optional(),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperadmin(session.user.role)) {
    return NextResponse.json({ error: "Hanya superadmin yang boleh membuat lab." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
      { status: 400 }
    );
  }

  let slug = parsed.data.slug ?? slugify(parsed.data.name);
  if (!slug) slug = `lab-${Date.now()}`;

  // Resolve collisions
  const existing = await prisma.lab.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Slug sudah dipakai. Pakai slug lain." }, { status: 409 });
  }

  const lab = await prisma.lab.create({
    data: {
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });
  return NextResponse.json({ id: lab.id, slug: lab.slug });
}

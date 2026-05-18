import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(3).max(180),
  description: z.string().max(2000).optional(),
});

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: labId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canManageLab(session.user.id, session.user.role, labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  let slug = slugify(parsed.data.title);
  if (!slug) slug = `course-${Date.now()}`;
  // Append nonce if collision
  const existing = await prisma.course.findUnique({ where: { slug }, select: { id: true } });
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const created = await prisma.course.create({
    data: {
      labId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      slug,
    },
  });
  return NextResponse.json({ id: created.id });
}

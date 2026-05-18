import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({ title: z.string().min(2).max(180) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { labId: true } });
  if (!course) return NextResponse.json({ error: "Course tidak ditemukan." }, { status: 404 });
  if (!(await canManageLab(session.user.id, session.user.role, course.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const last = await prisma.section.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? 0) + 1;

  const section = await prisma.section.create({
    data: { courseId, title: parsed.data.title, order },
  });
  return NextResponse.json({ id: section.id, title: section.title, order: section.order });
}

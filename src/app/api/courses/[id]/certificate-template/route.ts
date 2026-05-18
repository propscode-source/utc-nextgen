import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const fieldSchema = z.object({
  key: z.string().min(1).max(40),
  text: z.string().max(500).optional(),
  x: z.number().min(-10).max(110),
  y: z.number().min(-10).max(110),
  fontSize: z.number().min(6).max(120),
  fontWeight: z.number().int().min(100).max(900),
  color: z.string().min(1).max(40),
  fontFamily: z.string().max(80).optional(),
  align: z.enum(["left", "center", "right"]),
  width: z.number().min(5).max(100).optional(),
  qrSize: z.number().min(40).max(400).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imageHeight: z.number().min(20).max(400).optional(),
});

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  backgroundUrl: z.string().url().or(z.literal("")),
  fields: z.array(fieldSchema),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { labId: true, title: true },
  });
  if (!course) return NextResponse.json({ error: "Course tidak ditemukan." }, { status: 404 });
  if (!(await canManageLab(session.user.id, session.user.role, course.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }

  const tpl = await prisma.certificateTemplate.upsert({
    where: { courseId },
    update: {
      name: parsed.data.name ?? `Template ${course.title}`,
      backgroundUrl: parsed.data.backgroundUrl,
      fieldsJson: { fields: parsed.data.fields },
    },
    create: {
      courseId,
      labId: course.labId,
      name: parsed.data.name ?? `Template ${course.title}`,
      backgroundUrl: parsed.data.backgroundUrl,
      fieldsJson: { fields: parsed.data.fields },
    },
  });
  return NextResponse.json({ id: tpl.id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { labId: true } });
  if (!course) return NextResponse.json({ error: "Course tidak ditemukan." }, { status: 404 });
  if (!(await canManageLab(session.user.id, session.user.role, course.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  await prisma.certificateTemplate.deleteMany({ where: { courseId } });
  return NextResponse.json({ ok: true });
}

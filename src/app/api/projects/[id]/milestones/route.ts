import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({ title: z.string().min(2).max(180) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { labId: true } });
  if (!project) return NextResponse.json({ error: "Proker tidak ditemukan." }, { status: 404 });
  if (!(await canManageLab(session.user.id, session.user.role, project.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const m = await prisma.milestone.create({
    data: { projectId, title: parsed.data.title },
  });
  return NextResponse.json({ id: m.id, title: m.title, done: m.done });
}

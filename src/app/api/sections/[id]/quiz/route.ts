import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sectionId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { labId: true } }, quiz: { select: { id: true } } },
  });
  if (!section) return NextResponse.json({ error: "Section tidak ditemukan." }, { status: 404 });
  if (!(await canManageLab(session.user.id, session.user.role, section.course.labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  if (section.quiz) return NextResponse.json({ id: section.quiz.id, already: true });

  const created = await prisma.quiz.create({
    data: {
      kind: "SECTION",
      title: `Quiz: ${section.title}`,
      sectionId,
      minScore: 70,
      maxAttempts: 3,
      randomize: true,
    },
  });
  return NextResponse.json({ id: created.id });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(3).max(180),
});

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

  const tor = await prisma.tor.create({
    data: {
      labId,
      title: parsed.data.title,
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
      status: "DRAFT",
    },
  });

  return NextResponse.json({ id: tor.id });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const excludeLabId = url.searchParams.get("excludeLabId");
  if (q.length < 2) return NextResponse.json({ users: [] });

  const where = {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { nim: { contains: q } },
    ],
    // Exclude users already in this lab
    ...(excludeLabId
      ? { labMemberships: { none: { labId: excludeLabId } } }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      nim: true,
      prodi: true,
      role: true,
      image: true,
    },
    orderBy: [{ name: "asc" }],
    take: 8,
  });

  return NextResponse.json({ users });
}

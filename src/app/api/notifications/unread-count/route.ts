import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unread = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return NextResponse.json({ unread });
}

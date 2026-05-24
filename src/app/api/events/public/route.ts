import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public-facing list of upcoming/ongoing events used by the landing page.
 * No auth — only returns isPublic + non-DRAFT/CANCELLED events.
 */
export async function GET() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      isPublic: true,
      status: { in: ["PUBLISHED", "ONGOING"] },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "asc" },
    take: 6,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      location: true,
      posterUrl: true,
      startsAt: true,
      endsAt: true,
      pointReward: true,
      status: true,
    },
  });
  return NextResponse.json({ events });
}

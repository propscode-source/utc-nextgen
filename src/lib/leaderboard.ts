import { prisma } from "./prisma";

export type Timeframe = "weekly" | "monthly" | "all";

function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

function rangeStart(tf: Timeframe): Date | null {
  if (tf === "all") return null;
  const now = new Date();
  if (tf === "weekly") return startOfWeekUTC(now);
  // monthly: first day of current month UTC
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export type LeaderboardRow = {
  userId: string;
  name: string;
  image: string | null;
  prodi: string | null;
  points: number;
};

export async function getLeaderboard(opts: {
  timeframe: Timeframe;
  labId?: string | null;
  limit?: number;
}): Promise<LeaderboardRow[]> {
  const start = rangeStart(opts.timeframe);
  const limit = opts.limit ?? 50;

  // For "all" timeframe: rank by User.points (cumulative), filtered by lab membership if labId.
  if (!start) {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["MAHASISWA", "LAB_ADMIN"] },
        ...(opts.labId && { labMemberships: { some: { labId: opts.labId } } }),
      },
      select: { id: true, name: true, image: true, prodi: true, points: true },
      orderBy: [{ points: "desc" }, { name: "asc" }],
      take: limit,
    });
    return users.map((u) => ({
      userId: u.id,
      name: u.name,
      image: u.image,
      prodi: u.prodi,
      points: u.points,
    }));
  }

  // Weekly / monthly: aggregate positive deltas from PointsLedger.
  const grouped = await prisma.pointsLedger.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: start },
      delta: { gt: 0 },
    },
    _sum: { delta: true },
    orderBy: { _sum: { delta: "desc" } },
    take: limit,
  });
  if (grouped.length === 0) return [];

  const userIds = grouped.map((g) => g.userId);
  const userFilter = opts.labId
    ? {
        id: { in: userIds },
        labMemberships: { some: { labId: opts.labId } },
      }
    : { id: { in: userIds } };

  const users = await prisma.user.findMany({
    where: userFilter,
    select: { id: true, name: true, image: true, prodi: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return grouped
    .filter((g) => byId.has(g.userId))
    .map((g) => {
      const u = byId.get(g.userId)!;
      return {
        userId: u.id,
        name: u.name,
        image: u.image,
        prodi: u.prodi,
        points: g._sum.delta ?? 0,
      };
    });
}

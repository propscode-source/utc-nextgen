import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Badge codes (must match the rows seeded in prisma/seed.ts).
 * Adding a new code here requires both seeding the Badge row and adding a rule below.
 */
export const BADGE_CODES = {
  FIRST_COURSE: "first_course",
  QUIZ_STREAK: "quiz_streak",
  LAB_MASTER: "lab_master",
  TOP_LEARNER: "top_learner",
} as const;

const QUIZ_STREAK_TARGET = 5; // 5 quiz lulus berturut-turut

/**
 * Award a badge to a user if not already earned. Returns the new UserBadge or null.
 * Idempotent — uses unique([userId, badgeId]).
 */
async function grantBadge(
  userId: string,
  code: string,
  tx?: Prisma.TransactionClient
) {
  const client = tx ?? prisma;
  const badge = await client.badge.findUnique({ where: { code }, select: { id: true } });
  if (!badge) return null;
  try {
    return await client.userBadge.create({
      data: { userId, badgeId: badge.id },
    });
  } catch {
    // unique violation = already earned
    return null;
  }
}

/**
 * Re-evaluate all badge rules for a user and award any newly-eligible badges.
 * Safe to call after any user activity (lesson complete, quiz pass, course complete, exam pass, leaderboard).
 * Returns the list of newly-awarded badge codes.
 */
export async function reevaluateBadgesForUser(userId: string): Promise<string[]> {
  const newlyAwarded: string[] = [];

  // 1. FIRST_COURSE — completed at least one course (Enrollment.completedAt set)
  const firstCourseDone = await prisma.enrollment.findFirst({
    where: { userId, completedAt: { not: null } },
    select: { id: true },
  });
  if (firstCourseDone) {
    const r = await grantBadge(userId, BADGE_CODES.FIRST_COURSE);
    if (r) newlyAwarded.push(BADGE_CODES.FIRST_COURSE);
  }

  // 2. QUIZ_STREAK — last N section quizzes attempted, all passed (consecutive)
  const recentAttempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      status: { not: "IN_PROGRESS" },
      quiz: { kind: "SECTION" },
    },
    orderBy: { submittedAt: "desc" },
    take: QUIZ_STREAK_TARGET,
    select: { passed: true, quizId: true },
  });
  if (
    recentAttempts.length >= QUIZ_STREAK_TARGET &&
    recentAttempts.every((a) => a.passed)
  ) {
    // distinct quizIds to avoid streak from re-attempts of same quiz
    const distinctQuizzes = new Set(recentAttempts.map((a) => a.quizId));
    if (distinctQuizzes.size >= QUIZ_STREAK_TARGET) {
      const r = await grantBadge(userId, BADGE_CODES.QUIZ_STREAK);
      if (r) newlyAwarded.push(BADGE_CODES.QUIZ_STREAK);
    }
  }

  // 3. LAB_MASTER — completed every course of a lab the user is enrolled in
  // For each lab, check if user is enrolled in all its courses AND completed all of them.
  const labs = await prisma.lab.findMany({
    where: { courses: { some: {} } },
    select: { id: true, courses: { select: { id: true } } },
  });
  for (const lab of labs) {
    if (lab.courses.length === 0) continue;
    const enrolled = await prisma.enrollment.count({
      where: { userId, courseId: { in: lab.courses.map((c) => c.id) } },
    });
    if (enrolled !== lab.courses.length) continue; // not enrolled in all
    const completed = await prisma.enrollment.count({
      where: {
        userId,
        courseId: { in: lab.courses.map((c) => c.id) },
        completedAt: { not: null },
      },
    });
    if (completed === lab.courses.length) {
      const r = await grantBadge(userId, BADGE_CODES.LAB_MASTER);
      if (r) newlyAwarded.push(BADGE_CODES.LAB_MASTER);
      break; // one lab is enough
    }
  }

  // 4. TOP_LEARNER — top 10 in current weekly leaderboard (Mon..now in user's TZ ~ UTC week here)
  // Compute weekly points sum from PointsLedger and check if user is in top 10.
  const weekStart = startOfWeekUTC(new Date());
  const weekly = await prisma.pointsLedger.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: weekStart }, delta: { gt: 0 } },
    _sum: { delta: true },
    orderBy: { _sum: { delta: "desc" } },
    take: 10,
  });
  if (weekly.some((w) => w.userId === userId)) {
    const r = await grantBadge(userId, BADGE_CODES.TOP_LEARNER);
    if (r) newlyAwarded.push(BADGE_CODES.TOP_LEARNER);
  }

  return newlyAwarded;
}

function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

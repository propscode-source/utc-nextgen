import { PointEvent, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { reevaluateBadgesForUser } from "./badges";

const BADGE_TRIGGER_EVENTS: PointEvent[] = [
  "LESSON_COMPLETE",
  "QUIZ_PASS",
  "EXAM_PASS",
  "CERT_EARNED",
];

export const POINT_VALUES: Record<PointEvent, number> = {
  REGISTER: 100,
  DAILY_LOGIN: 5,
  LESSON_COMPLETE: 10,
  QUIZ_PASS: 5,
  EXAM_PASS: 50,
  CERT_EARNED: 100,
  COURSE_UNLOCK: 0,   // negative supplied by caller
  MERCH_REDEEM: 0,    // negative supplied by caller
  ADMIN_ADJUST: 0,    // value supplied by caller
  EVENT_ATTENDANCE: 0, // per-event reward supplied by caller (Event.pointReward)
};

type AwardOpts = {
  userId: string;
  event: PointEvent;
  delta?: number;
  reason?: string;
  refType?: string;
  refId?: string;
  tx?: Prisma.TransactionClient;
};

/**
 * Atomically write a points-ledger row and bump User.points.
 * Pass `tx` to participate in an existing transaction.
 */
export async function awardPoints(opts: AwardOpts) {
  const delta = opts.delta ?? POINT_VALUES[opts.event];
  if (delta === 0) return null;
  const client = opts.tx ?? prisma;

  const work = async (c: Prisma.TransactionClient) => {
    const ledger = await c.pointsLedger.create({
      data: {
        userId: opts.userId,
        event: opts.event,
        delta,
        reason: opts.reason,
        refType: opts.refType,
        refId: opts.refId,
      },
    });
    await c.user.update({
      where: { id: opts.userId },
      data: { points: { increment: delta } },
    });
    return ledger;
  };

  let result;
  if (opts.tx) {
    result = await work(opts.tx);
  } else {
    result = await prisma.$transaction(work);
  }

  // Trigger badge re-evaluation OUTSIDE the transaction (best-effort, non-blocking semantics).
  // Only on positive-impact events to avoid noise on COURSE_UNLOCK / MERCH_REDEEM (negative deltas).
  if (BADGE_TRIGGER_EVENTS.includes(opts.event)) {
    reevaluateBadgesForUser(opts.userId).catch((e) => {
      console.error("[badges] reevaluate failed:", e);
    });
  }

  return result;
}

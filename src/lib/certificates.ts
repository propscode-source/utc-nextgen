import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const DEFAULT_PATTERN = "{PREFIX}/{YEAR}/{SEQ4}";
const DEFAULT_PREFIX = "UTC";

function applyPattern(pattern: string, prefix: string, seq: number, now = new Date()) {
  return pattern
    .replace(/\{PREFIX\}/g, prefix)
    .replace(/\{YEAR\}/g, String(now.getUTCFullYear()))
    .replace(/\{MONTH\}/g, String(now.getUTCMonth() + 1).padStart(2, "0"))
    .replace(/\{SEQ4\}/g, String(seq).padStart(4, "0"))
    .replace(/\{SEQ\}/g, String(seq));
}

/**
 * Generate the next cert number for a course. Uses Course.certNumberPrefix / certNumberPattern,
 * falling back to UTC/{YEAR}/{SEQ4}. SEQ is monotonic per course (count of existing certs + 1).
 */
async function nextCertNumber(courseId: string, tx: Prisma.TransactionClient) {
  const course = await tx.course.findUniqueOrThrow({
    where: { id: courseId },
    select: { certNumberPrefix: true, certNumberPattern: true },
  });
  const prefix = course.certNumberPrefix?.trim() || DEFAULT_PREFIX;
  const pattern = course.certNumberPattern?.trim() || DEFAULT_PATTERN;
  const seq = (await tx.certificate.count({ where: { courseId } })) + 1;

  let candidate = applyPattern(pattern, prefix, seq);
  // Resolve any unique-collision (e.g. legacy data) by bumping seq.
  for (let i = 0; i < 5; i++) {
    const dup = await tx.certificate.findUnique({ where: { certNumber: candidate } });
    if (!dup) break;
    candidate = applyPattern(pattern, prefix, seq + i + 1);
  }
  return candidate;
}

/**
 * Idempotently issue a certificate for (userId, courseId). Returns the existing or new cert.
 * Designed to be called within a transaction (e.g. from exam submit/grade).
 */
export async function issueCertificate(
  userId: string,
  courseId: string,
  tx: Prisma.TransactionClient
) {
  const existing = await tx.certificate.findFirst({ where: { userId, courseId } });
  if (existing) return existing;

  const certNumber = await nextCertNumber(courseId, tx);
  // QR payload is the public verify URL — verifier scans → opens /cert/[number].
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const qrPayload = `${base}/cert/${encodeURIComponent(certNumber)}`;

  return tx.certificate.create({
    data: { userId, courseId, certNumber, qrPayload },
  });
}

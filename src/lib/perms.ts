import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Centralized authorization helpers for lab-scoped resources.
 * All helpers return a boolean — caller is responsible for sending 403.
 */

export function isSuperadmin(role: Role) {
  return role === "SUPERADMIN";
}

export async function canManageLab(userId: string, role: Role, labId: string) {
  if (isSuperadmin(role)) return true;
  // Lab admin assigned to this specific lab
  if (role === "LAB_ADMIN") {
    const lab = await prisma.lab.findUnique({ where: { id: labId }, select: { adminId: true } });
    if (lab?.adminId === userId) return true;
  }
  // Asisten lab — promoted member can also manage this lab's content (TOR/Proker/Aset/Course).
  const m = await prisma.labMember.findUnique({
    where: { labId_userId: { labId, userId } },
    select: { role: true },
  });
  return m?.role === "ASSISTANT";
}

export async function canViewLab(userId: string, role: Role, labId: string) {
  if (isSuperadmin(role)) return true;
  if (role === "LAB_ADMIN") return true;
  if (role === "PROCTOR") return true;
  const member = await prisma.labMember.findUnique({
    where: { labId_userId: { labId, userId } },
    select: { id: true },
  });
  return !!member;
}

/** True if the user is an ASSISTANT in at least one lab. Used to gate the "Lab" sidebar entry. */
export async function isAssistantOfAnyLab(userId: string) {
  const m = await prisma.labMember.findFirst({
    where: { userId, role: "ASSISTANT" },
    select: { id: true },
  });
  return !!m;
}

/** Resolve labId from slug; returns null if not found. */
export async function labIdFromSlug(slug: string) {
  const lab = await prisma.lab.findUnique({ where: { slug }, select: { id: true } });
  return lab?.id ?? null;
}

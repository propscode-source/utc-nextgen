/**
 * ABAC resolver — terjemahkan base role + custom roles + policies + rules
 * menjadi `Set<permissionKey>` efektif.
 *
 * Aturan resolusi:
 *   1. Setiap CustomRole memiliki dua sumber permission:
 *        a) policies (CustomRolePolicy → PolicyPermission)
 *        b) rules langsung (CustomRolePermission)
 *   2. Setiap row punya efek ALLOW | DENY. DENY menang atas ALLOW.
 *   3. Setiap user (selain assignment custom role manual) selalu memiliki
 *      "system role" yang berkesesuaian dengan base role-nya (auto-attached).
 *      Ini menjaga kompatibilitas: kalau belum ada custom role di-assign,
 *      user tetap mendapat permission default sesuai base role-nya.
 *
 * Pemakaian:
 *   const perms = await getUserPermissions(userId);
 *   if (!can(perms, "lab.edit")) return 403;
 */

import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PermissionSet = Set<string>;

const SYSTEM_KEY_BY_BASE: Record<Role, string> = {
  SUPERADMIN: "system.superadmin",
  LAB_ADMIN: "system.lab_admin",
  PROCTOR: "system.proctor",
  MAHASISWA: "system.mahasiswa",
};

type RawRow = {
  permKey: string;
  effect: "ALLOW" | "DENY";
};

async function loadRowsForRole(customRoleId: string): Promise<RawRow[]> {
  const [direct, viaPolicy] = await Promise.all([
    prisma.customRolePermission.findMany({
      where: { customRoleId },
      select: { effect: true, permission: { select: { key: true } } },
    }),
    prisma.customRolePolicy.findMany({
      where: { customRoleId },
      select: {
        policy: {
          select: {
            permissions: {
              select: { effect: true, permission: { select: { key: true } } },
            },
          },
        },
      },
    }),
  ]);

  const rows: RawRow[] = [];
  for (const r of direct) rows.push({ permKey: r.permission.key, effect: r.effect });
  for (const p of viaPolicy) {
    for (const pp of p.policy.permissions) {
      rows.push({ permKey: pp.permission.key, effect: pp.effect });
    }
  }
  return rows;
}

/** Resolve permission set untuk satu user. */
export async function getUserPermissions(userId: string): Promise<PermissionSet> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isActive: true,
      customRoles: { select: { customRoleId: true } },
    },
  });
  if (!user) return new Set();
  if (!user.isActive) return new Set();

  // Selalu sertakan system role yang sesuai base role-nya
  const systemKey = SYSTEM_KEY_BY_BASE[user.role];
  const systemRole = await prisma.customRole.findUnique({
    where: { key: systemKey },
    select: { id: true },
  });

  const roleIds = new Set<string>();
  if (systemRole) roleIds.add(systemRole.id);
  for (const ur of user.customRoles) roleIds.add(ur.customRoleId);

  const allRows: RawRow[] = [];
  for (const id of roleIds) {
    const rows = await loadRowsForRole(id);
    allRows.push(...rows);
  }

  // DENY menang atas ALLOW
  const allows = new Set<string>();
  const denies = new Set<string>();
  for (const row of allRows) {
    if (row.effect === "DENY") denies.add(row.permKey);
    else allows.add(row.permKey);
  }
  for (const d of denies) allows.delete(d);
  return allows;
}

export function can(set: PermissionSet, key: string): boolean {
  return set.has(key);
}

export function canAny(set: PermissionSet, keys: string[]): boolean {
  return keys.some((k) => set.has(k));
}

export function canAll(set: PermissionSet, keys: string[]): boolean {
  return keys.every((k) => set.has(k));
}

/** Convenience: cek satu permission langsung dari userId. */
export async function userCan(userId: string, key: string): Promise<boolean> {
  const set = await getUserPermissions(userId);
  return set.has(key);
}

/** Resolve permission set untuk role tertentu (preview di UI edit role). */
export async function getRolePermissions(customRoleId: string): Promise<PermissionSet> {
  const rows = await loadRowsForRole(customRoleId);
  const allows = new Set<string>();
  const denies = new Set<string>();
  for (const row of rows) {
    if (row.effect === "DENY") denies.add(row.permKey);
    else allows.add(row.permKey);
  }
  for (const d of denies) allows.delete(d);
  return allows;
}

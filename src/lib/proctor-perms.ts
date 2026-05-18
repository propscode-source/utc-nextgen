import type { Role } from "@prisma/client";

export function isProctor(role: Role) {
  return role === "PROCTOR" || role === "SUPERADMIN" || role === "LAB_ADMIN";
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { AccessTabs } from "../access-tabs";
import { RoleCreateButton } from "./role-create-button";
import { RolesGrid, type RoleItem } from "./roles-grid";

export const metadata: Metadata = { title: "Kelola Role Custom" };

export default async function ManageRolesPage() {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "role.view"))) redirect("/dashboard");

  const canManage = await userCan(session.user.id, "role.manage");

  const roles = await prisma.customRole.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { permissions: true, policies: true, userRoles: true } },
    },
  });

  const items: RoleItem[] = roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    baseRole: r.baseRole,
    counts: {
      permissions: r._count.permissions,
      policies: r._count.policies,
      userRoles: r._count.userRoles,
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Pengguna</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola akun, role custom, policy, dan permission dari satu tempat.
        </p>
      </div>
      <AccessTabs />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-muted-foreground">
          Buat role dengan kombinasi <strong>rule</strong> (per-permission ALLOW/DENY) dan{" "}
          <strong>policy</strong> (bundle reusable) sesuai kebutuhan unit.
        </div>
        {canManage && <RoleCreateButton />}
      </div>

      <RolesGrid roles={items} canManage={canManage} />
    </div>
  );
}

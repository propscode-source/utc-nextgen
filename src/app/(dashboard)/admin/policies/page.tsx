import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { AccessTabs } from "../access-tabs";
import { PolicyCreateButton } from "./policy-create-button";
import { PoliciesGrid, type PolicyItem } from "./policies-grid";

export const metadata: Metadata = { title: "Kelola Policy" };

export default async function ManagePoliciesPage() {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "role.view"))) redirect("/dashboard");

  const canManage = await userCan(session.user.id, "policy.manage");

  const policies = await prisma.policy.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { permissions: true, rolePolicies: true } },
      permissions: {
        take: 8,
        select: { permission: { select: { key: true } }, effect: true },
      },
    },
  });

  const items: PolicyItem[] = policies.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description,
    isSystem: p.isSystem,
    counts: {
      permissions: p._count.permissions,
      rolePolicies: p._count.rolePolicies,
    },
    permissions: p.permissions,
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
          Policy adalah bundle permission reusable. Attach satu policy ke beberapa role custom.
        </div>
        {canManage && <PolicyCreateButton />}
      </div>

      <PoliciesGrid policies={items} canManage={canManage} />
    </div>
  );
}

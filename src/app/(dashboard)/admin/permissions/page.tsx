import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { AccessTabs } from "../access-tabs";
import { PermissionCreateButton } from "./permission-create-button";
import { PermissionsGrid, type PermissionItem } from "./permissions-grid";

export const metadata: Metadata = { title: "Katalog Permission" };

export default async function PermissionsPage() {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "role.view"))) redirect("/dashboard");

  const canManage = await userCan(session.user.id, "permission.manage");

  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  const items: PermissionItem[] = permissions.map((p) => ({
    id: p.id,
    key: p.key,
    label: p.label,
    description: p.description,
    category: p.category,
    isSystem: p.isSystem,
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
          Daftar atom kapabilitas. Permission bawaan terkunci agar resolver kode tidak putus.
          Tambahkan permission custom untuk endpoint internal Anda.
        </div>
        {canManage && <PermissionCreateButton />}
      </div>

      <PermissionsGrid permissions={items} canManage={canManage} />
    </div>
  );
}

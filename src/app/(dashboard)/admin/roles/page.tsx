import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessTabs } from "../access-tabs";
import { RoleCreateButton } from "./role-create-button";
import { RoleRowActions } from "./role-row-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved, faPenToSquare, faUsers, faKey, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Kelola Role Custom" };

const baseRoleLabel: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  LAB_ADMIN: "Lab Admin",
  PROCTOR: "Proctor",
  MAHASISWA: "Mahasiswa",
};

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

      <div className="grid gap-4 md:grid-cols-2">
        {roles.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Belum ada role custom.
            </CardContent>
          </Card>
        )}
        {roles.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-primary" />
                      {r.name}
                    </h3>
                    {r.isSystem && (
                      <Badge variant="info" className="text-[10px]">Bawaan</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      Base: {baseRoleLabel[r.baseRole]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.description || "—"}</p>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">{r.key}</div>
                </div>
                {canManage && (
                  <RoleRowActions role={{ id: r.id, name: r.name, key: r.key, isSystem: r.isSystem, baseRole: r.baseRole, description: r.description }} />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-muted px-2 py-1.5">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <FontAwesomeIcon icon={faKey} className="h-3 w-3" /> Rules
                  </div>
                  <div className="font-semibold">{r._count.permissions}</div>
                </div>
                <div className="rounded-md bg-muted px-2 py-1.5">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" /> Policies
                  </div>
                  <div className="font-semibold">{r._count.policies}</div>
                </div>
                <div className="rounded-md bg-muted px-2 py-1.5">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <FontAwesomeIcon icon={faUsers} className="h-3 w-3" /> Users
                  </div>
                  <div className="font-semibold">{r._count.userRoles}</div>
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end">
                  <Link href={`/admin/roles/${r.id}`}>
                    <Button variant="outline" size="sm">
                      <FontAwesomeIcon icon={faPenToSquare} /> Atur rule & policy
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

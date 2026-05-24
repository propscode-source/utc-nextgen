import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Card, CardContent } from "@/components/ui/card";
import { AccessTabs } from "../access-tabs";
import { UserCreateButton } from "./user-create-button";
import { UsersTable, type UserRow } from "./users-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faUserShield, faUserGraduate, faKey } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Kelola Pengguna" };

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; active?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "user.view"))) redirect("/dashboard");

  const sp = await searchParams;
  const roleFilter = sp.role ?? "";
  const activeFilter = sp.active ?? "";

  const where: Record<string, unknown> = {};
  if (roleFilter && ["SUPERADMIN", "LAB_ADMIN", "PROCTOR", "MAHASISWA"].includes(roleFilter)) {
    where.role = roleFilter;
  }
  if (activeFilter === "true") where.isActive = true;
  if (activeFilter === "false") where.isActive = false;

  const [users, total, stats, customRoles] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        customRoles: {
          select: { customRole: { select: { id: true, name: true, key: true, isSystem: true } } },
        },
      },
      take: 200,
    }),
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.customRole.findMany({ orderBy: [{ name: "asc" }], select: { id: true, key: true, name: true, isSystem: true } }),
  ]);

  const byRole = Object.fromEntries(stats.map((s) => [s.role, s._count._all])) as Record<string, number>;
  const canCreate = await userCan(session.user.id, "user.create");

  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    nim: u.nim,
    prodi: u.prodi,
    angkatan: u.angkatan,
    role: u.role,
    isActive: u.isActive,
    emailVerified: !!u.emailVerified,
    createdAt: u.createdAt,
    customRoles: u.customRoles.map((cr) => cr.customRole),
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
          Daftar pengguna, role bawaan, dan assignment custom role.
        </div>
        {canCreate && <UserCreateButton customRoles={customRoles} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Total</div>
              <div className="text-lg font-bold">{total}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-red-500/10 text-red-500">
              <FontAwesomeIcon icon={faUserShield} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Superadmin</div>
              <div className="text-lg font-bold">{byRole.SUPERADMIN ?? 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-500/10 text-amber-500">
              <FontAwesomeIcon icon={faKey} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Lab Admin</div>
              <div className="text-lg font-bold">{byRole.LAB_ADMIN ?? 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
              <FontAwesomeIcon icon={faUserGraduate} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Mahasiswa</div>
              <div className="text-lg font-bold">{byRole.MAHASISWA ?? 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <UsersTable
        users={userRows}
        customRoles={customRoles}
        currentUserId={session.user.id}
        roleFilter={roleFilter}
        activeFilter={activeFilter}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { AccessTabs } from "../access-tabs";
import { UserCreateButton } from "./user-create-button";
import { UserRowActions } from "./user-row-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faUserShield, faUserGraduate, faShieldHalved, faKey } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Kelola Pengguna" };

const roleBadge = (role: string) => {
  switch (role) {
    case "SUPERADMIN":
      return <Badge variant="destructive">Superadmin</Badge>;
    case "LAB_ADMIN":
      return <Badge variant="warning">Lab Admin</Badge>;
    case "PROCTOR":
      return <Badge variant="info">Proctor</Badge>;
    default:
      return <Badge variant="secondary">Mahasiswa</Badge>;
  }
};

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; active?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "user.view"))) redirect("/dashboard");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const roleFilter = sp.role ?? "";
  const activeFilter = sp.active ?? "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { nim: { contains: q } },
    ];
  }
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
      take: 100,
    }),
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.customRole.findMany({ orderBy: [{ name: "asc" }], select: { id: true, key: true, name: true, isSystem: true } }),
  ]);

  const byRole = Object.fromEntries(stats.map((s) => [s.role, s._count._all])) as Record<string, number>;
  const canCreate = await userCan(session.user.id, "user.create");

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

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            action="/admin/users"
            className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end"
          >
            <div className="md:col-span-5 lg:col-span-6">
              <label htmlFor="q" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Cari (nama / email / NIM)
              </label>
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  id="q"
                  name="q"
                  defaultValue={q}
                  className="w-full h-10 rounded-md border bg-background pl-9 pr-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Ketik kata kunci…"
                />
              </div>
            </div>

            <div className="md:col-span-3 lg:col-span-2">
              <label htmlFor="role" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue={roleFilter}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Semua</option>
                <option value="SUPERADMIN">Superadmin</option>
                <option value="LAB_ADMIN">Lab Admin</option>
                <option value="PROCTOR">Proctor</option>
                <option value="MAHASISWA">Mahasiswa</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-2">
              <label htmlFor="active" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Status
              </label>
              <select
                id="active"
                name="active"
                defaultValue={activeFilter}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Semua</option>
                <option value="true">Aktif</option>
                <option value="false">Non-aktif</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                Terapkan
              </button>
              {(q || roleFilter || activeFilter) && (
                <Link
                  href="/admin/users"
                  className="h-10 inline-flex items-center justify-center rounded-md border px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>Role bawaan</TableHead>
                <TableHead>Custom role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Tidak ada pengguna yang cocok.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    {u.nim && (
                      <div className="text-[10px] font-mono text-muted-foreground">NIM {u.nim}</div>
                    )}
                  </TableCell>
                  <TableCell>{roleBadge(u.role)}</TableCell>
                  <TableCell>
                    {u.customRoles.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">— default —</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.customRoles.map((cr) => (
                          <Badge key={cr.customRole.id} variant={cr.customRole.isSystem ? "secondary" : "outline"} className="text-[10px]">
                            <FontAwesomeIcon icon={faShieldHalved} className="mr-1 h-3 w-3" />
                            {cr.customRole.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="outline">Non-aktif</Badge>
                    )}
                    {!u.emailVerified && (
                      <Badge variant="warning" className="ml-1 text-[10px]">Email belum verif.</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRowActions
                      user={{
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        nim: u.nim,
                        prodi: u.prodi,
                        angkatan: u.angkatan,
                        role: u.role,
                        isActive: u.isActive,
                        customRoleIds: u.customRoles.map((cr) => cr.customRole.id),
                      }}
                      isSelf={u.id === session.user.id}
                      customRoles={customRoles}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

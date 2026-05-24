"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { UserRowActions } from "./user-row-actions";
import { formatDate } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons";

type CustomRoleLite = { id: string; key: string; name: string; isSystem: boolean };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  nim: string | null;
  prodi: string | null;
  angkatan: number | null;
  role: "SUPERADMIN" | "LAB_ADMIN" | "PROCTOR" | "MAHASISWA";
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string | Date;
  customRoles: CustomRoleLite[];
};

type Props = {
  users: UserRow[];
  customRoles: CustomRoleLite[];
  currentUserId: string;
  roleFilter?: string;
  activeFilter?: string;
};

const ROLE_LABEL: Record<string, { label: string; variant: "destructive" | "warning" | "info" | "secondary" }> = {
  SUPERADMIN: { label: "Superadmin", variant: "destructive" },
  LAB_ADMIN: { label: "Lab Admin", variant: "warning" },
  PROCTOR: { label: "Proctor", variant: "info" },
  MAHASISWA: { label: "Mahasiswa", variant: "secondary" },
};

export function UsersTable({ users, customRoles, currentUserId, roleFilter, activeFilter }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.name} ${u.email} ${u.nim ?? ""}`.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChip href="/admin/users" active={!roleFilter && !activeFilter}>Semua</FilterChip>
            <FilterChip href="/admin/users?role=SUPERADMIN" active={roleFilter === "SUPERADMIN"}>Superadmin</FilterChip>
            <FilterChip href="/admin/users?role=LAB_ADMIN" active={roleFilter === "LAB_ADMIN"}>Lab Admin</FilterChip>
            <FilterChip href="/admin/users?role=PROCTOR" active={roleFilter === "PROCTOR"}>Proctor</FilterChip>
            <FilterChip href="/admin/users?role=MAHASISWA" active={roleFilter === "MAHASISWA"}>Mahasiswa</FilterChip>
            <FilterChip href="/admin/users?active=false" active={activeFilter === "false"}>Non-aktif</FilterChip>
          </div>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nama, email, atau NIM..."
            containerClassName="w-full sm:ml-auto sm:w-64 md:w-80"
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    {query
                      ? `Tidak ada pengguna yang cocok dengan "${query}".`
                      : "Tidak ada pengguna."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const role = ROLE_LABEL[u.role];
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                        {u.nim && (
                          <div className="text-[10px] font-mono text-muted-foreground">NIM {u.nim}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.variant}>{role.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.customRoles.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">— default —</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.customRoles.map((cr) => (
                              <Badge key={cr.id} variant={cr.isSystem ? "secondary" : "outline"} className="text-[10px]">
                                <FontAwesomeIcon icon={faShieldHalved} className="mr-1 h-3 w-3" />
                                {cr.name}
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
                            customRoleIds: u.customRoles.map((cr) => cr.id),
                          }}
                          isSelf={u.id === currentUserId}
                          customRoles={customRoles}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
    >
      {children}
    </Link>
  );
}

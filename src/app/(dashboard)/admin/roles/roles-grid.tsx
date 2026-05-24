"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { RoleRowActions } from "./role-row-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved, faPenToSquare, faUsers, faKey, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

export type RoleItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  baseRole: "SUPERADMIN" | "LAB_ADMIN" | "PROCTOR" | "MAHASISWA";
  counts: { permissions: number; policies: number; userRoles: number };
};

const baseRoleLabel: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  LAB_ADMIN: "Lab Admin",
  PROCTOR: "Proctor",
  MAHASISWA: "Mahasiswa",
};

export function RolesGrid({ roles, canManage }: { roles: RoleItem[]; canManage: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) =>
      `${r.name} ${r.key} ${r.description ?? ""} ${baseRoleLabel[r.baseRole] ?? ""}`.toLowerCase().includes(q)
    );
  }, [roles, query]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari role, key, atau deskripsi..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {query
                ? `Tidak ada role yang cocok dengan "${query}".`
                : "Belum ada role custom."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-primary" />
                        {r.name}
                      </h3>
                      {r.isSystem && <Badge variant="info" className="text-[10px]">Bawaan</Badge>}
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
                    <div className="font-semibold">{r.counts.permissions}</div>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1.5">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" /> Policies
                    </div>
                    <div className="font-semibold">{r.counts.policies}</div>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1.5">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} className="h-3 w-3" /> Users
                    </div>
                    <div className="font-semibold">{r.counts.userRoles}</div>
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
          ))
        )}
      </div>
    </div>
  );
}

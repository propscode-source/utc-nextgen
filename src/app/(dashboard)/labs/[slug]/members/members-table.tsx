"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { MemberRowActions } from "./member-row-actions";

export type MemberRow = {
  id: string;
  role: "MEMBER" | "ASSISTANT";
  user: {
    id: string;
    name: string;
    email: string;
    nim: string | null;
    prodi: string | null;
    role: string;
    image: string | null;
  };
};

export function MembersTable({
  members,
  labId,
  adminId,
  canManage,
}: {
  members: MemberRow[];
  labId: string;
  adminId: string | null;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      `${m.user.name} ${m.user.email} ${m.user.nim ?? ""} ${m.user.prodi ?? ""}`.toLowerCase().includes(q)
    );
  }, [members, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nama, email, NIM, atau prodi..."
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIM</TableHead>
                <TableHead>Prodi</TableHead>
                <TableHead>Role</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">
                    {query
                      ? `Tidak ada anggota yang cocok dengan "${query}".`
                      : "Belum ada anggota."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => {
                  const isAdmin = m.user.id === adminId;
                  const isAssistant = m.role === "ASSISTANT";
                  const initials = m.user.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {m.user.image && <AvatarImage src={m.user.image} alt={m.user.name} />}
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{m.user.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{m.user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.user.nim ?? "—"}</TableCell>
                      <TableCell className="text-sm">{m.user.prodi ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary">{m.user.role}</Badge>
                          {isAdmin && <Badge variant="success">Admin Lab</Badge>}
                          {isAssistant && !isAdmin && <Badge variant="info">Asisten Lab</Badge>}
                        </div>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <MemberRowActions
                            labId={labId}
                            memberId={m.id}
                            userId={m.user.id}
                            userName={m.user.name}
                            isAdmin={isAdmin}
                            isAssistant={isAssistant}
                          />
                        </TableCell>
                      )}
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

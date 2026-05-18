import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MembersToolbar } from "./members-toolbar";
import { MemberRowActions } from "./member-row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const lab = await prisma.lab.findUnique({
    where: { slug },
    select: { id: true, adminId: true, slug: true, name: true },
  });
  if (!lab) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, lab.id);

  const members = await prisma.labMember.findMany({
    where: { labId: lab.id },
    include: {
      user: { select: { id: true, name: true, email: true, nim: true, prodi: true, role: true, image: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="space-y-4">
      {canManage && <MembersToolbar labId={lab.id} />}

      <Card>
        <CardContent className="p-0">
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
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">
                    Belum ada anggota.
                  </TableCell>
                </TableRow>
              )}
              {members.map((m) => {
                const isAdmin = m.user.id === lab.adminId;
                const isAssistant = m.role === "ASSISTANT";
                const initials = m.user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
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
                          labId={lab.id}
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
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

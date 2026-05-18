import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TorCreateButton } from "./tor-create-button";
import { ReadOnlyNotice } from "@/components/read-only-notice";
import { formatDate } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";

const VARIANTS: Record<string, "outline" | "info" | "success" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "destructive",
};

export default async function TorListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const lab = await prisma.lab.findUnique({
    where: { slug },
    select: { id: true, admin: { select: { name: true } } },
  });
  if (!lab) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, lab.id);

  const tors = await prisma.tor.findMany({
    where: { labId: lab.id },
    orderBy: [{ updatedAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex justify-end">
          <TorCreateButton labId={lab.id} slug={slug} />
        </div>
      ) : (
        <ReadOnlyNotice adminName={lab.admin?.name ?? null} />
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Diperbarui</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada TOR.
                  </TableCell>
                </TableRow>
              )}
              {tors.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>
                    <Badge variant={VARIANTS[t.status]}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(t.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/labs/${slug}/tor/${t.id}`}>
                        <FontAwesomeIcon icon={faPenToSquare} /> Buka
                      </Link>
                    </Button>
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

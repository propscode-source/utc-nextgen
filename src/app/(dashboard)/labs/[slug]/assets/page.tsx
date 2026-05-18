import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssetCreateButton } from "./asset-create-button";
import { AssetRowActions } from "./asset-row-actions";
import { ReadOnlyNotice } from "@/components/read-only-notice";
import { formatPoints } from "@/lib/utils";

const CONDITION_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  GOOD: "success",
  NEEDS_REPAIR: "warning",
  BROKEN: "destructive",
  DISPOSED: "outline",
};

const CONDITION_LABEL: Record<string, string> = {
  GOOD: "Baik",
  NEEDS_REPAIR: "Perlu perbaikan",
  BROKEN: "Rusak",
  DISPOSED: "Dimusnahkan",
};

export default async function AssetsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const lab = await prisma.lab.findUnique({
    where: { slug },
    select: { id: true, admin: { select: { name: true } } },
  });
  if (!lab) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, lab.id);
  const assets = await prisma.asset.findMany({
    where: { labId: lab.id },
    orderBy: { code: "asc" },
  });

  const totalValue = assets.reduce((s, a) => s + (a.acquiredCost ?? 0) * a.quantity, 0);

  return (
    <div className="space-y-4">
      {!canManage && <ReadOnlyNotice adminName={lab.admin?.name ?? null} />}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Total nilai aset: <strong className="text-foreground">Rp {formatPoints(totalValue)}</strong> ·{" "}
          {assets.length} item
        </div>
        {canManage && <AssetCreateButton labId={lab.id} />}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama aset</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead className="text-right">Harga satuan</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-sm text-muted-foreground py-8">
                    Belum ada aset.
                  </TableCell>
                </TableRow>
              )}
              {assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    {a.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{a.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{a.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={CONDITION_VARIANT[a.condition]}>{CONDITION_LABEL[a.condition]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.acquiredCost ? `Rp ${formatPoints(a.acquiredCost)}` : "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <AssetRowActions asset={{ id: a.id, name: a.name, code: a.code, quantity: a.quantity, condition: a.condition, acquiredCost: a.acquiredCost ?? 0, description: a.description ?? "" }} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

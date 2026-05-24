import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { AssetCreateButton } from "./asset-create-button";
import { ReadOnlyNotice } from "@/components/read-only-notice";
import { AssetsTable, type AssetRow } from "./assets-table";
import { formatPoints } from "@/lib/utils";

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

  const rows: AssetRow[] = assets.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    description: a.description,
    quantity: a.quantity,
    condition: a.condition,
    acquiredCost: a.acquiredCost,
  }));

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

      <AssetsTable assets={rows} canManage={canManage} />
    </div>
  );
}

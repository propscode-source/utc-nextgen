import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MerchCreateButton } from "./merch-create-button";
import { MerchTable, type MerchTableItem } from "./merch-table";
import { formatPoints } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGift, faCoins } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Kelola Merchandise" };

export default async function ManageMerchPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }

  const items = await prisma.merchItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

  const totalActive = items.filter((i) => i.active).length;
  const totalStockValue = items.reduce(
    (s, i) => s + (i.stock > 0 ? i.stock * i.pointPrice : 0),
    0
  );

  const tableItems: MerchTableItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    imageUrl: item.imageUrl,
    kind: item.kind,
    pointPrice: item.pointPrice,
    stock: item.stock,
    active: item.active,
    createdAt: item.createdAt,
    redemptionCount: item._count.redemptions,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Merchandise</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tambah, edit, dan kelola stok merchandise yang bisa ditukar mahasiswa dengan poin.
          </p>
        </div>
        <MerchCreateButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faGift} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Item aktif</div>
              <div className="text-lg font-bold">{totalActive} / {items.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-500/10 text-amber-500">
              <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Nilai stok (poin)</div>
              <div className="text-lg font-bold">{formatPoints(totalStockValue)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">Total penukaran</div>
            <div className="text-lg font-bold">
              {items.reduce((s, i) => s + i._count.redemptions, 0)} kali
            </div>
          </CardContent>
        </Card>
      </div>

      <MerchTable items={tableItems} />
    </div>
  );
}

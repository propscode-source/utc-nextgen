"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { RedeemButton } from "./redeem-button";
import { formatPoints } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGift, faCoins, faBoxesStacked, faTicket } from "@fortawesome/free-solid-svg-icons";

export type MerchItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  kind: "VOUCHER" | "PHYSICAL";
  pointPrice: number;
  stock: number;
};

type Props = {
  items: MerchItem[];
  userPoints: number;
};

export function MerchGrid({ items, userPoints }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      `${it.name} ${it.description ?? ""} ${it.kind}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <FontAwesomeIcon icon={faGift} className="h-8 w-8 mb-3 text-muted-foreground" />
          <p>Belum ada merchandise yang tersedia.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari merchandise atau voucher..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada item yang cocok dengan &quot;{query}&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const outOfStock = item.stock === 0;
            const cantAfford = userPoints < item.pointPrice;
            return (
              <Card key={item.id} className="flex flex-col">
                <div className="aspect-video bg-muted overflow-hidden rounded-t-xl flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <FontAwesomeIcon
                      icon={item.kind === "VOUCHER" ? faTicket : faGift}
                      className="h-10 w-10 text-muted-foreground"
                    />
                  )}
                </div>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={item.kind === "VOUCHER" ? "info" : "secondary"} className="text-[10px]">
                      {item.kind === "VOUCHER" ? "Voucher digital" : "Barang fisik"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                      <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                      {formatPoints(item.pointPrice)}
                    </span>
                    {item.stock < 0 ? (
                      <span className="text-muted-foreground">Stok tak terbatas</span>
                    ) : outOfStock ? (
                      <Badge variant="destructive">Habis</Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
                        {item.stock} stok
                      </span>
                    )}
                  </div>
                  <RedeemButton
                    itemId={item.id}
                    itemName={item.name}
                    itemKind={item.kind}
                    pointPrice={item.pointPrice}
                    disabled={outOfStock || cantAfford}
                    insufficient={cantAfford}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

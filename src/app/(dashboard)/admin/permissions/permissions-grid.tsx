"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { PermissionDeleteButton } from "./permission-delete-button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey } from "@fortawesome/free-solid-svg-icons";

export type PermissionItem = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  isSystem: boolean;
};

export function PermissionsGrid({ permissions, canManage }: { permissions: PermissionItem[]; canManage: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((p) =>
      `${p.key} ${p.label} ${p.description ?? ""} ${p.category}`.toLowerCase().includes(q)
    );
  }, [permissions, query]);

  const grouped = useMemo(() => {
    const m = new Map<string, PermissionItem[]>();
    for (const p of filtered) {
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push(p);
    }
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari permission, key, atau kategori..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {query
              ? `Tidak ada permission yang cocok dengan "${query}".`
              : "Belum ada permission."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, items]) => (
            <Card key={cat}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{cat}</h2>
                  <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="grid gap-1.5 md:grid-cols-2">
                  {items.map((p) => (
                    <div key={p.id} className="flex items-start gap-2 rounded-md border p-2">
                      <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                        <FontAwesomeIcon icon={faKey} className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-medium">{p.label}</div>
                          {p.isSystem ? (
                            <Badge variant="info" className="text-[10px]">Bawaan</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Custom</Badge>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">{p.key}</div>
                        {p.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">{p.description}</div>
                        )}
                      </div>
                      {canManage && !p.isSystem && (
                        <PermissionDeleteButton id={p.id} label={p.label} />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

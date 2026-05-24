"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { PolicyRowActions } from "./policy-row-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup, faPenToSquare, faKey, faShieldHalved } from "@fortawesome/free-solid-svg-icons";

export type PolicyItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  counts: { permissions: number; rolePolicies: number };
  permissions: { effect: "ALLOW" | "DENY"; permission: { key: string } }[];
};

export function PoliciesGrid({ policies, canManage }: { policies: PolicyItem[]; canManage: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter((p) => {
      const permKeys = p.permissions.map((x) => x.permission.key).join(" ");
      return `${p.name} ${p.key} ${p.description ?? ""} ${permKeys}`.toLowerCase().includes(q);
    });
  }, [policies, query]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari policy, key, atau permission..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {query
                ? `Tidak ada policy yang cocok dengan "${query}".`
                : "Belum ada policy."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <FontAwesomeIcon icon={faLayerGroup} className="h-4 w-4 text-primary" />
                        {p.name}
                      </h3>
                      {p.isSystem && <Badge variant="info" className="text-[10px]">Bawaan</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.description || "—"}</p>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">{p.key}</div>
                  </div>
                  {canManage && (
                    <PolicyRowActions
                      policy={{
                        id: p.id,
                        name: p.name,
                        key: p.key,
                        description: p.description,
                        isSystem: p.isSystem,
                      }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted px-2 py-1.5">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faKey} className="h-3 w-3" /> Permission
                    </div>
                    <div className="font-semibold">{p.counts.permissions}</div>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1.5">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" /> Dipakai role
                    </div>
                    <div className="font-semibold">{p.counts.rolePolicies}</div>
                  </div>
                </div>

                {p.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.permissions.map((pp) => (
                      <span
                        key={pp.permission.key}
                        className={
                          "font-mono text-[10px] rounded px-1.5 py-0.5 " +
                          (pp.effect === "DENY"
                            ? "bg-red-500/10 text-red-700 dark:text-red-300"
                            : "bg-muted")
                        }
                      >
                        {pp.effect === "DENY" && "DENY:"}
                        {pp.permission.key}
                      </span>
                    ))}
                    {p.counts.permissions > 8 && (
                      <span className="text-[10px] text-muted-foreground italic">
                        +{p.counts.permissions - 8} lagi
                      </span>
                    )}
                  </div>
                )}

                {canManage && (
                  <div className="flex justify-end">
                    <Link href={`/admin/policies/${p.id}`}>
                      <Button variant="outline" size="sm">
                        <FontAwesomeIcon icon={faPenToSquare} /> Atur permission
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

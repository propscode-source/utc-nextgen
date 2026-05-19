"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFloppyDisk,
  faSpinner,
  faCheck,
  faXmark,
  faBan,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

type Permission = {
  id: string;
  key: string;
  category: string;
  label: string;
  description: string | null;
};

type State = "NONE" | "ALLOW" | "DENY";

export function PolicyPermissionEditor({
  policyId,
  permissions,
  initial,
}: {
  policyId: string;
  permissions: Permission[];
  initial: { permissionId: string; effect: "ALLOW" | "DENY" }[];
}) {
  const router = useRouter();
  const [map, setMap] = useState<Map<string, "ALLOW" | "DENY">>(
    () => new Map(initial.map((r) => [r.permissionId, r.effect]))
  );
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const m = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push(p);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return grouped;
    return grouped
      .map(([cat, items]) => [
        cat,
        items.filter(
          (p) =>
            p.key.toLowerCase().includes(s) ||
            p.label.toLowerCase().includes(s) ||
            (p.description ?? "").toLowerCase().includes(s)
        ),
      ] as [string, Permission[]])
      .filter(([, items]) => items.length > 0);
  }, [grouped, search]);

  function getState(id: string): State {
    return (map.get(id) as State) ?? "NONE";
  }

  function cycle(id: string) {
    setMap((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (!cur) next.set(id, "ALLOW");
      else if (cur === "ALLOW") next.set(id, "DENY");
      else next.delete(id);
      return next;
    });
  }

  function setAll(items: Permission[], state: State) {
    setMap((prev) => {
      const next = new Map(prev);
      for (const p of items) {
        if (state === "NONE") next.delete(p.id);
        else next.set(p.id, state);
      }
      return next;
    });
  }

  async function save() {
    setBusy(true);
    const items = [...map.entries()].map(([permissionId, effect]) => ({ permissionId, effect }));
    const res = await fetch(`/api/admin/policies/${policyId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan.");
      return;
    }
    toast.success(`${items.length} permission tersimpan.`);
    router.refresh();
  }

  const allowCount = [...map.values()].filter((e) => e === "ALLOW").length;
  const denyCount = [...map.values()].filter((e) => e === "DENY").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Isi policy</CardTitle>
        <p className="text-xs text-muted-foreground">
          Klik tombol untuk berputar: <kbd>Tidak diatur</kbd> → <kbd>ALLOW</kbd> → <kbd>DENY</kbd>.
          DENY pada policy akan menahan permission walaupun policy/rule lain men-allow.
        </p>
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <Badge variant="success">ALLOW {allowCount}</Badge>
          <Badge variant="destructive">DENY {denyCount}</Badge>
          <div className="relative ml-auto w-full sm:w-64">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground"
            />
            <Input
              className="pl-7 h-8 text-xs"
              placeholder="Cari permission…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Tidak ada permission yang cocok.</p>
        )}
        {filtered.map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
                {cat}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setAll(items, "ALLOW")}>
                  <FontAwesomeIcon icon={faCheck} className="text-emerald-500" /> Semua ALLOW
                </Button>
                <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setAll(items, "DENY")}>
                  <FontAwesomeIcon icon={faBan} className="text-red-500" /> Semua DENY
                </Button>
                <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setAll(items, "NONE")}>
                  <FontAwesomeIcon icon={faXmark} /> Reset
                </Button>
              </div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {items.map((p) => {
                const state = getState(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => cycle(p.id)}
                    className={
                      "flex items-start gap-2 rounded-md border p-2 text-left transition " +
                      (state === "ALLOW"
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : state === "DENY"
                        ? "border-red-500/40 bg-red-500/5"
                        : "hover:bg-accent")
                    }
                  >
                    <div className="mt-0.5 grid h-5 w-5 place-items-center rounded">
                      {state === "ALLOW" && <FontAwesomeIcon icon={faCheck} className="text-emerald-500 h-3.5 w-3.5" />}
                      {state === "DENY" && <FontAwesomeIcon icon={faBan} className="text-red-500 h-3.5 w-3.5" />}
                      {state === "NONE" && <FontAwesomeIcon icon={faXmark} className="text-muted-foreground h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.key}</div>
                      {p.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{p.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={busy}>
            <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
            {busy ? "Menyimpan…" : "Simpan permission"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

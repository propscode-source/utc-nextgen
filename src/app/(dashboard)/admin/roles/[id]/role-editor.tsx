"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKey,
  faLayerGroup,
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

type Policy = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
};

type RuleEffect = "ALLOW" | "DENY";
type RuleState = "NONE" | "ALLOW" | "DENY";

export function RoleEditor({
  roleId,
  permissions,
  policies,
  initialRules,
  initialPolicyIds,
}: {
  roleId: string;
  permissions: Permission[];
  policies: Policy[];
  initialRules: { permissionId: string; effect: RuleEffect }[];
  initialPolicyIds: string[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState<Map<string, RuleEffect>>(
    () => new Map(initialRules.map((r) => [r.permissionId, r.effect]))
  );
  const [policyIds, setPolicyIds] = useState<Set<string>>(() => new Set(initialPolicyIds));
  const [search, setSearch] = useState("");
  const [savingRules, setSavingRules] = useState(false);
  const [savingPolicies, setSavingPolicies] = useState(false);

  // Group permissions by category
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const filteredGrouped = useMemo(() => {
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

  function getState(permissionId: string): RuleState {
    return (rules.get(permissionId) as RuleState) ?? "NONE";
  }

  function cycle(permissionId: string) {
    setRules((prev) => {
      const next = new Map(prev);
      const cur = next.get(permissionId);
      if (!cur) next.set(permissionId, "ALLOW");
      else if (cur === "ALLOW") next.set(permissionId, "DENY");
      else next.delete(permissionId);
      return next;
    });
  }

  function setAll(items: Permission[], state: RuleState) {
    setRules((prev) => {
      const next = new Map(prev);
      for (const p of items) {
        if (state === "NONE") next.delete(p.id);
        else next.set(p.id, state);
      }
      return next;
    });
  }

  function togglePolicy(id: string) {
    setPolicyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveRules() {
    setSavingRules(true);
    const items = [...rules.entries()].map(([permissionId, effect]) => ({ permissionId, effect }));
    const res = await fetch(`/api/admin/roles/${roleId}/rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSavingRules(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan rules.");
      return;
    }
    toast.success(`${items.length} rule tersimpan.`);
    router.refresh();
  }

  async function savePolicies() {
    setSavingPolicies(true);
    const res = await fetch(`/api/admin/roles/${roleId}/policies`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyIds: [...policyIds] }),
    });
    setSavingPolicies(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan policies.");
      return;
    }
    toast.success(`${policyIds.size} policy ter-attach.`);
    router.refresh();
  }

  const rulesCount = rules.size;
  const allowCount = [...rules.values()].filter((e) => e === "ALLOW").length;
  const denyCount = [...rules.values()].filter((e) => e === "DENY").length;

  return (
    <Tabs defaultValue="policies" className="space-y-4">
      <TabsList>
        <TabsTrigger value="policies">
          <FontAwesomeIcon icon={faLayerGroup} className="mr-1.5 h-3.5 w-3.5" />
          Policies ({policyIds.size})
        </TabsTrigger>
        <TabsTrigger value="rules">
          <FontAwesomeIcon icon={faKey} className="mr-1.5 h-3.5 w-3.5" />
          Rules per permission ({rulesCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="policies" className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pilih policy untuk role ini</CardTitle>
            <p className="text-xs text-muted-foreground">
              Policy adalah bundle permission reusable. Centang yang berlaku untuk role ini.
              Permission di policy akan otomatis aktif (efek ALLOW), kecuali dioverride DENY di tab Rules.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {policies.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Belum ada policy.</p>
            )}
            {policies.map((p) => {
              const checked = policyIds.has(p.id);
              return (
                <label
                  key={p.id}
                  className={
                    "flex items-start gap-3 rounded-md border p-3 cursor-pointer transition " +
                    (checked ? "border-primary bg-primary/5" : "hover:bg-accent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePolicy(p.id)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.name}</span>
                      {p.isSystem && <Badge variant="info" className="text-[10px]">Bawaan</Badge>}
                      <span className="font-mono text-[10px] text-muted-foreground">{p.key}</span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.permissionKeys.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">policy kosong</span>
                      ) : (
                        p.permissionKeys.slice(0, 12).map((pk) => (
                          <span
                            key={pk}
                            className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5"
                          >
                            {pk}
                          </span>
                        ))
                      )}
                      {p.permissionKeys.length > 12 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{p.permissionKeys.length - 12} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={savePolicies} disabled={savingPolicies}>
            <FontAwesomeIcon icon={savingPolicies ? faSpinner : faFloppyDisk} className={savingPolicies ? "animate-spin" : ""} />
            {savingPolicies ? "Menyimpan…" : "Simpan policies"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="rules" className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rules per permission</CardTitle>
            <p className="text-xs text-muted-foreground">
              Override per-permission. Klik tombol di sebelah kanan untuk berputar: <kbd>Tidak diatur</kbd> →{" "}
              <kbd>ALLOW</kbd> → <kbd>DENY</kbd>. DENY akan menang melawan policy yang men-allow.
            </p>
            <div className="flex items-center gap-3 text-xs pt-2 flex-wrap">
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
            {filteredGrouped.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Tidak ada permission yang cocok.</p>
            )}
            {filteredGrouped.map(([cat, items]) => (
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
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={saveRules} disabled={savingRules}>
            <FontAwesomeIcon icon={savingRules ? faSpinner : faFloppyDisk} className={savingRules ? "animate-spin" : ""} />
            {savingRules ? "Menyimpan…" : "Simpan rules"}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

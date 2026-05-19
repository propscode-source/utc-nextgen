import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessTabs } from "../access-tabs";
import { PolicyCreateButton } from "./policy-create-button";
import { PolicyRowActions } from "./policy-row-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup, faPenToSquare, faKey, faShieldHalved } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Kelola Policy" };

export default async function ManagePoliciesPage() {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "role.view"))) redirect("/dashboard");

  const canManage = await userCan(session.user.id, "policy.manage");

  const policies = await prisma.policy.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { permissions: true, rolePolicies: true } },
      permissions: {
        take: 8,
        select: { permission: { select: { key: true } }, effect: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Pengguna</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola akun, role custom, policy, dan permission dari satu tempat.
        </p>
      </div>
      <AccessTabs />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-muted-foreground">
          Policy adalah bundle permission reusable. Attach satu policy ke beberapa role custom.
        </div>
        {canManage && <PolicyCreateButton />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {policies.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Belum ada policy.
            </CardContent>
          </Card>
        )}
        {policies.map((p) => (
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
                  <div className="font-semibold">{p._count.permissions}</div>
                </div>
                <div className="rounded-md bg-muted px-2 py-1.5">
                  <div className="text-muted-foreground flex items-center gap-1">
                    <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" /> Dipakai role
                  </div>
                  <div className="font-semibold">{p._count.rolePolicies}</div>
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
                  {p._count.permissions > 8 && (
                    <span className="text-[10px] text-muted-foreground italic">
                      +{p._count.permissions - 8} lagi
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
        ))}
      </div>
    </div>
  );
}

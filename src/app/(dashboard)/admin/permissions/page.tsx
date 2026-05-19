import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccessTabs } from "../access-tabs";
import { PermissionCreateButton } from "./permission-create-button";
import { PermissionDeleteButton } from "./permission-delete-button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Katalog Permission" };

export default async function PermissionsPage() {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "role.view"))) redirect("/dashboard");

  const canManage = await userCan(session.user.id, "permission.manage");

  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  const grouped = new Map<string, typeof permissions>();
  for (const p of permissions) {
    if (!grouped.has(p.category)) grouped.set(p.category, []);
    grouped.get(p.category)!.push(p);
  }

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
          Daftar atom kapabilitas. Permission bawaan terkunci agar resolver kode tidak putus.
          Tambahkan permission custom untuk endpoint internal Anda.
        </div>
        {canManage && <PermissionCreateButton />}
      </div>

      <div className="space-y-4">
        {[...grouped.entries()].map(([cat, items]) => (
          <Card key={cat}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{cat}</h2>
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              </div>
              <div className="grid gap-1.5 md:grid-cols-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-2 rounded-md border p-2"
                  >
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
    </div>
  );
}

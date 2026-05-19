import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan, getRolePermissions } from "@/lib/abac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleEditor } from "./role-editor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheckCircle, faShieldHalved } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Atur Rule & Policy" };

export default async function RoleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "role.manage"))) redirect("/dashboard");

  const { id } = await params;
  const role = await prisma.customRole.findUnique({
    where: { id },
    include: {
      permissions: { select: { permissionId: true, effect: true } },
      policies: { select: { policyId: true } },
    },
  });
  if (!role) notFound();

  const [permissions, policies, effective] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] }),
    prisma.policy.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        permissions: { select: { permission: { select: { key: true } }, effect: true } },
      },
    }),
    getRolePermissions(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/roles" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <FontAwesomeIcon icon={faArrowLeft} /> Kembali ke daftar role
        </Link>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FontAwesomeIcon icon={faShieldHalved} className="text-primary" />
            {role.name}
          </h1>
          {role.isSystem && <Badge variant="info">Bawaan</Badge>}
          <Badge variant="outline">Base: {role.baseRole}</Badge>
        </div>
        <div className="text-xs font-mono text-muted-foreground mt-1">{role.key}</div>
        {role.description && (
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{role.description}</p>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500" />
              Permission efektif
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Hasil resolusi: union dari semua policy + rule, dikurangi yang ditandai DENY.
            </p>
          </div>
          <Badge variant="success">{effective.size} aktif</Badge>
        </CardHeader>
        <CardContent>
          {effective.size === 0 ? (
            <p className="text-sm text-muted-foreground italic">Role ini belum punya permission efektif.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {[...effective].sort().map((k) => (
                <Badge key={k} variant="outline" className="font-mono text-[10px]">
                  {k}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RoleEditor
        roleId={role.id}
        permissions={permissions.map((p) => ({
          id: p.id,
          key: p.key,
          category: p.category,
          label: p.label,
          description: p.description,
        }))}
        policies={policies.map((p) => ({
          id: p.id,
          key: p.key,
          name: p.name,
          description: p.description,
          isSystem: p.isSystem,
          permissionKeys: p.permissions.map((pp) => pp.permission.key),
        }))}
        initialRules={role.permissions.map((rp) => ({ permissionId: rp.permissionId, effect: rp.effect }))}
        initialPolicyIds={role.policies.map((rp) => rp.policyId)}
      />

      <div className="text-right">
        <Link href="/admin/roles">
          <Button variant="outline">
            <FontAwesomeIcon icon={faArrowLeft} /> Selesai
          </Button>
        </Link>
      </div>
    </div>
  );
}

import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/abac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PolicyPermissionEditor } from "./policy-permission-editor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Atur permission policy" };

export default async function PolicyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (!(await userCan(session.user.id, "policy.manage"))) redirect("/dashboard");

  const { id } = await params;
  const policy = await prisma.policy.findUnique({
    where: { id },
    include: {
      permissions: { select: { permissionId: true, effect: true } },
    },
  });
  if (!policy) notFound();

  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/policies"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Kembali ke daftar policy
        </Link>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FontAwesomeIcon icon={faLayerGroup} className="text-primary" />
            {policy.name}
          </h1>
          {policy.isSystem && <Badge variant="info">Bawaan</Badge>}
        </div>
        <div className="text-xs font-mono text-muted-foreground mt-1">{policy.key}</div>
        {policy.description && (
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{policy.description}</p>
        )}
      </div>

      <PolicyPermissionEditor
        policyId={policy.id}
        permissions={permissions.map((p) => ({
          id: p.id,
          key: p.key,
          category: p.category,
          label: p.label,
          description: p.description,
        }))}
        initial={policy.permissions.map((pp) => ({ permissionId: pp.permissionId, effect: pp.effect }))}
      />

      <div className="text-right">
        <Link href="/admin/policies">
          <Button variant="outline">
            <FontAwesomeIcon icon={faArrowLeft} /> Selesai
          </Button>
        </Link>
      </div>
    </div>
  );
}

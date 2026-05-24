import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { TorCreateButton } from "./tor-create-button";
import { ReadOnlyNotice } from "@/components/read-only-notice";
import { TorTable, type TorRow } from "./tor-table";

export default async function TorListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const lab = await prisma.lab.findUnique({
    where: { slug },
    select: { id: true, admin: { select: { name: true } } },
  });
  if (!lab) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, lab.id);

  const tors = await prisma.tor.findMany({
    where: { labId: lab.id },
    orderBy: [{ updatedAt: "desc" }],
  });

  const rows: TorRow[] = tors.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    updatedAt: t.updatedAt,
  }));

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex justify-end">
          <TorCreateButton labId={lab.id} slug={slug} />
        </div>
      ) : (
        <ReadOnlyNotice adminName={lab.admin?.name ?? null} />
      )}
      <TorTable tors={rows} labSlug={slug} />
    </div>
  );
}

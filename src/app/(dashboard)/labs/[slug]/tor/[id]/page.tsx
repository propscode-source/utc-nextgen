import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab, isSuperadmin } from "@/lib/perms";
import { TorEditorShell } from "./tor-editor-shell";

export default async function TorDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const session = await auth();
  if (!session) return null;

  const tor = await prisma.tor.findUnique({
    where: { id },
    include: { lab: { select: { id: true, slug: true, adminId: true } } },
  });
  if (!tor || tor.lab.slug !== slug) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, tor.lab.id);
  const canApprove = isSuperadmin(session.user.role);

  return (
    <TorEditorShell
      torId={tor.id}
      labSlug={slug}
      initialTitle={tor.title}
      initialStatus={tor.status}
      initialContent={tor.contentJson as object}
      canEdit={canManage}
      canApprove={canApprove}
    />
  );
}

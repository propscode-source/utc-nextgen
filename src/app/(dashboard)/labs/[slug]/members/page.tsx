import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { MembersToolbar } from "./members-toolbar";
import { MembersTable, type MemberRow } from "./members-table";

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const lab = await prisma.lab.findUnique({
    where: { slug },
    select: { id: true, adminId: true, slug: true, name: true },
  });
  if (!lab) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, lab.id);

  const members = await prisma.labMember.findMany({
    where: { labId: lab.id },
    include: {
      user: { select: { id: true, name: true, email: true, nim: true, prodi: true, role: true, image: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const rows: MemberRow[] = members.map((m) => ({
    id: m.id,
    role: m.role,
    user: m.user,
  }));

  return (
    <div className="space-y-4">
      {canManage && <MembersToolbar labId={lab.id} />}
      <MembersTable
        members={rows}
        labId={lab.id}
        adminId={lab.adminId}
        canManage={canManage}
      />
    </div>
  );
}

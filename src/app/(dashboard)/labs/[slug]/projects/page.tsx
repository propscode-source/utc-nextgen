import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { KanbanBoard } from "./kanban-board";
import { ReadOnlyNotice } from "@/components/read-only-notice";

export default async function ProjectsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const lab = await prisma.lab.findUnique({
    where: { slug },
    select: { id: true, admin: { select: { name: true } } },
  });
  if (!lab) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, lab.id);

  const projects = await prisma.project.findMany({
    where: { labId: lab.id },
    include: { milestones: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  return (
    <div className="space-y-4">
      {!canManage && <ReadOnlyNotice adminName={lab.admin?.name ?? null} />}
      <KanbanBoard
      labId={lab.id}
      canManage={canManage}
      projects={projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        budget: p.budget,
        budgetUsed: p.budgetUsed,
        position: p.position,
        dueAt: p.dueAt?.toISOString() ?? null,
        milestones: p.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          done: m.done,
        })),
      }))}
    />
    </div>
  );
}

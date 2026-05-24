import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { BadgeCreateButton } from "./badge-create-button";
import { BadgesList, type BadgeListItem } from "./badges-list";

export const metadata: Metadata = { title: "Kelola Badge" };

const SYSTEM_CODES = new Set(["first_course", "quiz_streak", "lab_master", "top_learner"]);

export default async function ManageBadgesPage() {
  const session = await auth();
  if (!session) return null;
  if (!isSuperadmin(session.user.role)) redirect("/dashboard");

  const badges = await prisma.badge.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { awards: true } },
      awards: {
        take: 5,
        orderBy: { awardedAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true, nim: true } } },
      },
    },
  });

  const items: BadgeListItem[] = badges.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    description: b.description,
    iconClass: b.iconClass,
    isSystem: SYSTEM_CODES.has(b.code),
    awardCount: b._count.awards,
    awards: b.awards.map((a) => ({
      id: a.id,
      user: { id: a.user.id, name: a.user.name, nim: a.user.nim },
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Badge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tambah badge custom, atur nama/deskripsi, dan award manual ke mahasiswa.
          </p>
        </div>
        <BadgeCreateButton />
      </div>

      <BadgesList badges={items} />
    </div>
  );
}

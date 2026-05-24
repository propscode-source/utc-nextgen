import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { LabCreateButton } from "./lab-create-button";
import { LabsList, type LabListItem } from "./labs-list";

export const metadata: Metadata = { title: "Daftar Lab" };

export default async function LabsListPage() {
  const session = await auth();
  if (!session) return null;

  const role = session.user.role;
  const userId = session.user.id;
  const isSuper = isSuperadmin(role);

  const where =
    role === "MAHASISWA"
      ? { members: { some: { userId } } }
      : undefined;

  const labs = await prisma.lab.findMany({
    where,
    include: {
      admin: { select: { name: true, email: true } },
      _count: { select: { members: true, courses: true, projects: true, assets: true } },
    },
    orderBy: { name: "asc" },
  });

  const items: LabListItem[] = labs.map((l) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    description: l.description,
    admin: l.admin,
    _count: l._count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Laboratorium</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "MAHASISWA"
              ? "Lab tempat kamu menjadi anggota."
              : "Semua lab di Fakultas Ilmu Komputer."}
          </p>
        </div>
        {isSuper && <LabCreateButton />}
      </div>

      <LabsList labs={items} isSuper={isSuper} />
    </div>
  );
}

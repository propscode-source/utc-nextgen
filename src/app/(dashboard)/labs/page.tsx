import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlask, faUsers, faClipboardList, faBoxesStacked } from "@fortawesome/free-solid-svg-icons";
import { LabCreateButton } from "./lab-create-button";
import { LabRowActions } from "./lab-row-actions";

export const metadata: Metadata = { title: "Daftar Lab" };

export default async function LabsListPage() {
  const session = await auth();
  if (!session) return null;

  const role = session.user.role;
  const userId = session.user.id;
  const isSuper = isSuperadmin(role);

  // Mahasiswa: only labs they belong to
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

      {labs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Belum ada lab yang bisa ditampilkan.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {labs.map((lab) => (
            <Card key={lab.id} className="hover:shadow-md transition">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <FontAwesomeIcon icon={faFlask} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">
                    <Link href={`/labs/${lab.slug}`} className="hover:underline">
                      {lab.name}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {lab.description || "Tidak ada deskripsi."}
                  </p>
                </div>
                {isSuper && (
                  <LabRowActions
                    lab={{
                      id: lab.id,
                      name: lab.name,
                      description: lab.description ?? "",
                    }}
                  />
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Admin:{" "}
                  {lab.admin ? (
                    <Badge variant="secondary">{lab.admin.name}</Badge>
                  ) : (
                    <Badge variant="outline">Belum di-assign</Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Stat icon={faUsers} value={lab._count.members} label="Anggota" />
                  <Stat icon={faClipboardList} value={lab._count.courses} label="Course" />
                  <Stat icon={faClipboardList} value={lab._count.projects} label="Proker" />
                  <Stat icon={faBoxesStacked} value={lab._count.assets} label="Aset" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: typeof faUsers; value: number; label: string }) {
  return (
    <div className="rounded-md border p-2">
      <FontAwesomeIcon icon={icon} className="h-3 w-3 text-muted-foreground" />
      <div className="text-sm font-bold mt-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

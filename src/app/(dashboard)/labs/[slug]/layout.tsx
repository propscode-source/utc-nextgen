import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab, canViewLab } from "@/lib/perms";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFlask,
  faUsers,
  faFileLines,
  faDiagramProject,
  faBoxesStacked,
  faGraduationCap,
  faBookOpenReader,
} from "@fortawesome/free-solid-svg-icons";
import { LabTabs } from "@/components/lab-tabs";
import { Badge } from "@/components/ui/badge";

export default async function LabLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const lab = await prisma.lab.findUnique({
    where: { slug },
    include: {
      admin: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, courses: true, projects: true, assets: true, tors: true } },
      // courses count already included via _count
    },
  });
  if (!lab) notFound();

  const canView = await canViewLab(session.user.id, session.user.role, lab.id);
  if (!canView) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, lab.id);

  const tabs = [
    { href: `/labs/${slug}`, label: "Ringkasan", icon: faFlask },
    { href: `/labs/${slug}/members`, label: "Anggota", icon: faUsers, count: lab._count.members },
    { href: `/labs/${slug}/tor`, label: "TOR", icon: faFileLines, count: lab._count.tors },
    { href: `/labs/${slug}/projects`, label: "Proker", icon: faDiagramProject, count: lab._count.projects },
    { href: `/labs/${slug}/courses`, label: "Course", icon: faBookOpenReader, count: lab._count.courses },
    { href: `/labs/${slug}/assets`, label: "Aset", icon: faBoxesStacked, count: lab._count.assets },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
          <FontAwesomeIcon icon={faFlask} className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{lab.name}</h1>
            {canManage && <Badge variant="success">Anda admin lab ini</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{lab.description || "Tidak ada deskripsi."}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>Admin lab:</span>
            {lab.admin ? (
              <Badge variant="secondary">{lab.admin.name}</Badge>
            ) : (
              <Badge variant="outline">Belum di-assign</Badge>
            )}
            <span className="mx-1">·</span>
            <Link href={`/courses?lab=${lab.slug}`} className="hover:underline inline-flex items-center gap-1">
              <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3" />
              {lab._count.courses} course
            </Link>
          </div>
        </div>
      </div>

      <LabTabs items={tabs} />

      <div>{children}</div>
    </div>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { BadgeCreateButton } from "./badge-create-button";
import { BadgeRowActions } from "./badge-row-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal } from "@fortawesome/free-solid-svg-icons";

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

      <div className="grid gap-4 md:grid-cols-2">
        {badges.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Belum ada badge.
            </CardContent>
          </Card>
        )}
        {badges.map((b) => {
          const isSystem = SYSTEM_CODES.has(b.code);
          return (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <FontAwesomeIcon icon={faMedal} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {b.name}
                    {isSystem && (
                      <UiBadge variant="info" className="text-[10px]">Sistem (auto-award)</UiBadge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    {b.code} · {b.iconClass}
                  </div>
                </div>
                <BadgeRowActions
                  badge={{
                    id: b.id,
                    code: b.code,
                    name: b.name,
                    description: b.description,
                    iconClass: b.iconClass,
                    isSystem,
                  }}
                />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Diraih oleh <strong>{b._count.awards}</strong> mahasiswa
                </div>
                {b.awards.length > 0 && (
                  <ul className="text-xs space-y-1">
                    {b.awards.map((a) => (
                      <li key={a.id} className="text-muted-foreground">
                        • {a.user.name} {a.user.nim ? `(${a.user.nim})` : ""}
                      </li>
                    ))}
                    {b._count.awards > 5 && (
                      <li className="text-[11px] text-muted-foreground italic">
                        … dan {b._count.awards - 5} lainnya
                      </li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

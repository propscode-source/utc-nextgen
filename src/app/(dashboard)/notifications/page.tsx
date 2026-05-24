import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { NotificationsList, type NotificationItem } from "./notifications-list";
import { BroadcastButton } from "./broadcast-button";

export const metadata: Metadata = { title: "Notifikasi" };

const PAGE_SIZE = 20;

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [items, unread, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
    prisma.notification.count({
      where: { userId: session.user.id },
    }),
  ]);

  const hasMore = items.length > PAGE_SIZE;
  const initial: NotificationItem[] = (hasMore ? items.slice(0, PAGE_SIZE) : items).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
  const initialCursor = hasMore ? initial[initial.length - 1]?.id ?? null : null;

  const canBroadcast = isSuperadmin(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pemberitahuan untuk akunmu — course, ujian, badge, dan pengumuman sistem.
            <span className="ml-2 font-mono-tnum text-foreground">{total}</span> total
            {unread > 0 && (
              <>
                {" · "}
                <span className="font-mono-tnum text-primary">{unread}</span> belum dibaca
              </>
            )}
          </p>
        </div>
        {canBroadcast && <BroadcastButton />}
      </div>

      <NotificationsList
        initial={initial}
        initialCursor={initialCursor}
        initialUnread={unread}
      />
    </div>
  );
}

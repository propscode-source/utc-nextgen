"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faGraduationCap,
  faShieldHalved,
  faMedal,
  faGear,
  faTrash,
  faCheck,
  faCheckDouble,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import type { NotificationType } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { emitNotificationsChanged } from "@/lib/notifications-events";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string; // ISO
};

type Filter = "all" | "unread";

type Props = {
  initial: NotificationItem[];
  initialCursor: string | null;
  initialUnread: number;
};

const TYPE_META: Record<NotificationType, { icon: IconDefinition; label: string; tone: string }> = {
  INFO: { icon: faBell, label: "Info", tone: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  COURSE: { icon: faGraduationCap, label: "Course", tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  EXAM: { icon: faShieldHalved, label: "Ujian", tone: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  BADGE: { icon: faMedal, label: "Badge", tone: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  SYSTEM: { icon: faGear, label: "Sistem", tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
};

export function NotificationsList({ initial, initialCursor, initialUnread }: Props) {
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [unread, setUnread] = useState(initialUnread);
  const [filter, setFilter] = useState<Filter>("all");
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const visible = useMemo(() => {
    return filter === "unread" ? items.filter((i) => !i.read) : items;
  }, [items, filter]);

  const refetch = useCallback(async (nextFilter: Filter) => {
    setLoadingMore(true);
    try {
      const url = new URL("/api/notifications", window.location.origin);
      if (nextFilter === "unread") url.searchParams.set("filter", "unread");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: NotificationItem[];
        nextCursor: string | null;
        unread: number;
      };
      setItems(data.items);
      setCursor(data.nextCursor);
      setUnread(data.unread);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  // Saat filter berubah, refresh dari server supaya pagination tetap konsisten.
  useEffect(() => {
    refetch(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = new URL("/api/notifications", window.location.origin);
      url.searchParams.set("cursor", cursor);
      if (filter === "unread") url.searchParams.set("filter", "unread");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: NotificationItem[];
        nextCursor: string | null;
        unread: number;
      };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setUnread(data.unread);
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleRead(n: NotificationItem) {
    setBusy(n.id);
    const nextRead = !n.read;
    // optimistic update
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: nextRead } : i)));
    setUnread((u) => Math.max(0, u + (nextRead ? -1 : 1)));
    try {
      const res = await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: nextRead }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { unread: number };
      setUnread(data.unread);
      emitNotificationsChanged({ unread: data.unread });
    } catch {
      // rollback
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: !nextRead } : i)));
      setUnread((u) => Math.max(0, u + (nextRead ? 1 : -1)));
    } finally {
      setBusy(null);
    }
  }

  async function remove(n: NotificationItem) {
    if (!confirm("Hapus notifikasi ini?")) return;
    setBusy(n.id);
    const snapshot = items;
    const snapshotUnread = unread;
    setItems((prev) => prev.filter((i) => i.id !== n.id));
    if (!n.read) setUnread((u) => Math.max(0, u - 1));
    try {
      const res = await fetch(`/api/notifications/${n.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { unread: number };
      setUnread(data.unread);
      emitNotificationsChanged({ unread: data.unread });
    } catch {
      setItems(snapshot);
      setUnread(snapshotUnread);
    } finally {
      setBusy(null);
    }
  }

  async function markAll() {
    if (unread === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      setUnread(0);
      emitNotificationsChanged({ unread: 0 });
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter + bulk actions */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Semua
          </FilterChip>
          <FilterChip active={filter === "unread"} onClick={() => setFilter("unread")}>
            Belum dibaca{unread > 0 && <span className="ml-1.5 font-mono-tnum">{unread}</span>}
          </FilterChip>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAll}
          disabled={unread === 0 || bulkBusy}
        >
          <FontAwesomeIcon icon={faCheckDouble} className="h-3.5 w-3.5" />
          Tandai semua dibaca
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <FontAwesomeIcon icon={faBell} className="h-7 w-7 text-muted-foreground/40 mb-3" />
            <div className="text-sm text-muted-foreground">
              {filter === "unread"
                ? "Tidak ada notifikasi yang belum dibaca."
                : "Belum ada notifikasi."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-primary/10">
            {visible.map((n) => {
              const meta = TYPE_META[n.type];
              const isBusy = busy === n.id;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex items-start gap-3 p-4 transition-colors",
                    !n.read && "bg-primary/[0.04]"
                  )}
                >
                  {!n.read && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r bg-accent"
                      aria-hidden
                    />
                  )}
                  <div className={cn("grid h-9 w-9 place-items-center rounded-lg shrink-0", meta.tone)}>
                    <FontAwesomeIcon icon={meta.icon} className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={cn(
                          "text-sm leading-tight",
                          !n.read ? "font-semibold" : "font-medium text-muted-foreground"
                        )}
                      >
                        {n.title}
                      </h3>
                      <Badge variant="outline" className="text-[10px]">
                        {meta.label}
                      </Badge>
                      {!n.read && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          • Baru
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {n.body}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <time dateTime={n.createdAt} className="font-mono-tnum">
                        {formatRelative(n.createdAt)}
                      </time>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="text-primary hover:underline"
                          onClick={() => {
                            if (!n.read) toggleRead(n);
                          }}
                        >
                          Buka tautan →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      title={n.read ? "Tandai belum dibaca" : "Tandai dibaca"}
                      disabled={isBusy}
                      onClick={() => toggleRead(n)}
                    >
                      <FontAwesomeIcon
                        icon={isBusy ? faSpinner : faCheck}
                        className={cn("h-3.5 w-3.5", isBusy && "animate-spin")}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Hapus"
                      disabled={isBusy}
                      onClick={() => remove(n)}
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />
                Memuat…
              </>
            ) : (
              "Muat lagi"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-primary/15 bg-card text-muted-foreground hover:bg-primary/10 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

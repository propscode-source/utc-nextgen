"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faGraduationCap,
  faShieldHalved,
  faMedal,
  faGear,
  faCheckDouble,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import type { NotificationType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NOTIFICATIONS_EVENT,
  emitNotificationsChanged,
  type NotificationsChangedDetail,
} from "@/lib/notifications-events";

type BellItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<NotificationType, IconDefinition> = {
  INFO: faBell,
  COURSE: faGraduationCap,
  EXAM: faShieldHalved,
  BADGE: faMedal,
  SYSTEM: faGear,
};

const POLL_MS = 60_000; // 1 menit

export function NotificationBell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<BellItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unread: number };
      setUnread(data.unread);
    } catch {
      // network — abaikan, poll berikutnya akan retry
    }
  }, []);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?take=8", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: BellItem[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
      fetched.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial count + poll
  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [refreshCount]);

  // Refresh count saat pindah halaman (server mungkin sudah create notifikasi baru)
  useEffect(() => {
    refreshCount();
    fetched.current = false; // paksa preview reload pada open berikutnya
  }, [pathname, refreshCount]);

  // Sync dengan event bus (mis. dari halaman /notifications)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<NotificationsChangedDetail>;
      if (typeof ce.detail?.unread === "number") setUnread(ce.detail.unread);
      else refreshCount();
      fetched.current = false;
    };
    window.addEventListener(NOTIFICATIONS_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATIONS_EVENT, handler);
  }, [refreshCount]);

  // Outside-click close
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !fetched.current) fetchPreview();
  }

  async function markOneRead(item: BellItem) {
    if (item.read) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      const res = await fetch(`/api/notifications/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (res.ok) {
        const data = (await res.json()) as { unread: number };
        setUnread(data.unread);
        emitNotificationsChanged({ unread: data.unread });
      }
    } catch {
      // abaikan
    }
  }

  async function markAll() {
    if (unread === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (res.ok) emitNotificationsChanged({ unread: 0 });
    } catch {
      // abaikan
    }
  }

  const badge = unread > 99 ? "99+" : unread > 0 ? String(unread) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifikasi${unread ? ` (${unread} belum dibaca)` : ""}`}
        onClick={toggle}
        className="relative"
      >
        <FontAwesomeIcon icon={faBell} className="h-4 w-4" />
        {badge && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-accent text-[10px] font-bold px-1 grid place-items-center text-black font-mono-tnum ring-2 ring-background"
            aria-hidden
          >
            {badge}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] rounded-md border border-primary/15 bg-popover text-popover-foreground shadow-lg shadow-primary/10 overflow-hidden z-40">
          <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10">
            <div className="text-sm font-semibold">
              Notifikasi
              {unread > 0 && (
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {unread} baru
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAll}
              disabled={unread === 0}
              className="text-[11px] text-muted-foreground hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
            >
              <FontAwesomeIcon icon={faCheckDouble} className="h-3 w-3" />
              Tandai semua
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-hide divide-y divide-primary/10">
            {loading && items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Memuat…
              </div>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <FontAwesomeIcon icon={faBell} className="h-6 w-6 text-muted-foreground/40 mb-2" />
                <div className="text-xs text-muted-foreground">Belum ada notifikasi.</div>
              </div>
            ) : (
              items.map((n) => {
                const Icon = TYPE_ICON[n.type];
                const inner = (
                  <div className={cn("flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50", !n.read && "bg-primary/[0.04]")}>
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
                      <FontAwesomeIcon icon={Icon} className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-sm leading-tight truncate", !n.read ? "font-semibold" : "text-muted-foreground")}>
                        {n.title}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      <div className="text-[10px] text-muted-foreground mt-1 font-mono-tnum">
                        {formatRelative(n.createdAt)}
                      </div>
                    </div>
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                    )}
                  </div>
                );

                if (n.link) {
                  return (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => {
                        markOneRead(n);
                        setOpen(false);
                      }}
                      className="block"
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markOneRead(n)}
                    className="block w-full text-left"
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-primary/10">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-center text-xs font-medium text-primary hover:bg-primary/5"
            >
              Lihat semua notifikasi
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}h lalu`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

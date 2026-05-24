"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faRightFromBracket, faUser, faCoins, faXmark } from "@fortawesome/free-solid-svg-icons";
import { signOut, useSession } from "next-auth/react";
import { POINTS_EVENT, type PointsChangedDetail } from "@/lib/points-events";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { navFor } from "@/lib/nav";
import { formatPoints } from "@/lib/utils";
import type { Role } from "@prisma/client";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string; email: string; image?: string | null; role: Role; points: number };
  isLabAssistant?: boolean;
};

export function Topbar({ user, isLabAssistant = false }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, update } = useSession();
  const items = navFor(user.role, { isLabAssistant });
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Instant override from custom event: any client component that mutates points
  // (RedeemButton, lesson complete, quiz pass, etc.) emits POINTS_EVENT for instant UI sync.
  const [override, setOverride] = useState<number | null>(null);

  // Live points priority: instant override → fresh JWT → SSR snapshot prop.
  const livePoints = override ?? session?.user?.points ?? user.points;
  const liveImage = session?.user?.image ?? user.image;
  const liveName = session?.user?.name ?? user.name;

  // Listen for instant point change events.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<PointsChangedDetail>;
      if (typeof ce.detail?.points === "number") setOverride(ce.detail.points);
    };
    window.addEventListener(POINTS_EVENT, handler);
    return () => window.removeEventListener(POINTS_EVENT, handler);
  }, []);

  // When the route changes, re-pull the JWT so any server-side mutations are reflected
  // in the topbar without a full reload. Clear the override so JWT becomes source of truth.
  useEffect(() => {
    update();
    setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-primary/10 bg-background/80 backdrop-blur px-3 md:px-6">
        {/* subtle scan line under the topbar — IT theme accent */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px tech-scan opacity-50" />

        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" onClick={() => setOpen(true)}>
          <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Link
          href="/leaderboard"
          className="hidden sm:flex items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-1.5 text-sm font-medium font-mono-tnum transition-colors hover:bg-primary hover:!text-white hover:border-primary"
          title="Poin kamu"
        >
          <FontAwesomeIcon icon={faCoins} className="h-3.5 w-3.5 text-amber-500" />
          {formatPoints(livePoints)}
        </Link>

        <NotificationBell />

        <ThemeToggle />

        <div className="relative">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-1 transition-colors hover:bg-primary hover:!text-white">
              <Avatar className="h-8 w-8 ring-1 ring-primary/20">
                {liveImage ? <AvatarImage src={liveImage} alt={liveName} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-md border border-primary/15 bg-popover p-1 text-popover-foreground shadow-lg shadow-primary/10">
              <div className="px-3 py-2 border-b border-primary/10">
                <div className="text-sm font-medium truncate">{liveName}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <span className="h-1 w-1 rounded-full bg-accent" />
                  {user.role}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-amber-500 font-mono-tnum">
                  <FontAwesomeIcon icon={faCoins} className="h-2.5 w-2.5" />
                  {formatPoints(livePoints)} poin
                </div>
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-primary hover:!text-white"
              >
                <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5" /> Profil
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive hover:!text-white"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" /> Keluar
              </button>
            </div>
          </details>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-card border-r border-primary/10 p-4 flex flex-col">
            <div className="pointer-events-none absolute inset-0 bg-circuit opacity-30" />
            <div className="relative flex items-center justify-between mb-4 gap-2">
              <Image
                src="/logo.png"
                alt="UTC NextGen — Unsri Training Center"
                width={1980}
                height={780}
                className="h-9 w-auto shrink-0"
              />
              <Button variant="ghost" size="icon" aria-label="Tutup" onClick={() => setOpen(false)}>
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </Button>
            </div>
            <ul className="relative space-y-1 flex-1 overflow-y-auto scrollbar-hide">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={`${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary text-white font-medium"
                          : "text-muted-foreground hover:bg-primary hover:!text-white"
                      )}
                    >
                      <FontAwesomeIcon
                        icon={item.icon}
                        className={cn(
                          "h-4 w-4",
                          active ? "text-accent" : "group-hover:text-white"
                        )}
                      />
                      <span className="group-hover:!text-white">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

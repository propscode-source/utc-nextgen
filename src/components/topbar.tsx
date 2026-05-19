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
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-3 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" onClick={() => setOpen(true)}>
          <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Link
          href="/leaderboard"
          className="hidden sm:flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium tabular-nums"
          title="Poin kamu"
        >
          <FontAwesomeIcon icon={faCoins} className="h-3.5 w-3.5 text-amber-500" />
          {formatPoints(livePoints)}
        </Link>

        <ThemeToggle />

        <div className="relative">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-1 hover:bg-accent">
              <Avatar className="h-8 w-8">
                {liveImage ? <AvatarImage src={liveImage} alt={liveName} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
              <div className="px-3 py-2 border-b">
                <div className="text-sm font-medium truncate">{liveName}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{user.role}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-500 tabular-nums">
                  <FontAwesomeIcon icon={faCoins} className="h-2.5 w-2.5" />
                  {formatPoints(livePoints)} poin
                </div>
              </div>
              <Link href="/profile" className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent">
                <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5" /> Profil
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent text-destructive"
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
          <div className="absolute left-0 top-0 h-full w-72 bg-card border-r p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Image
                  src="/logo-mark.png"
                  alt="UTC NextGen"
                  width={210}
                  height={256}
                  className="h-8 w-auto shrink-0"
                />
                <div className="min-w-0 leading-tight">
                  <div className="text-sm font-bold tracking-tight truncate">UTC-NextGen</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
                    Unsri Training Center
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Tutup" onClick={() => setOpen(false)}>
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-1 flex-1 overflow-y-auto scrollbar-hide">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={`${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                      <span>{item.label}</span>
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
